const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 3001;
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const FILE_TTL_MS = 10 * 60 * 1000;
const MAX_FILE_SIZE = 100 * 1024 * 1024;
const ROOM_INACTIVE_MS = 30 * 60 * 1000;
const ROOM_WARNING_MS = 25 * 60 * 1000;
const MAX_GROUP_USERS = 60;
const MAX_MESSAGES = 100;
const MAX_GROUP_FILES = 50;

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3005',
];
if (process.env.CLIENT_URL) {
  ALLOWED_ORIGINS.push(process.env.CLIENT_URL);
}

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: (origin, callback) => {
    callback(null, true);
  },
  credentials: true,
}));

app.use(express.json());

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const roomDir = path.join(UPLOAD_DIR, req.params.roomId);
    if (!fs.existsSync(roomDir)) {
      fs.mkdirSync(roomDir, { recursive: true });
    }
    cb(null, roomDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
});

const rooms = new Map();
const socketRooms = new Map();

function generateRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

function createRoomData(hostSocketId, roomType = 'direct') {
  return {
    code: null,
    type: roomType,
    hostSocketId,
    hostId: hostSocketId,
    guestSocketId: null,
    users: new Map(),
    maxUsers: roomType === 'group' ? MAX_GROUP_USERS : 2,
    messages: [],
    sharedFiles: [],
    files: [],
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
    warnedInactive: false,
  };
}

function touchRoom(room) {
  room.lastActivityAt = Date.now();
  room.warnedInactive = false;
}

function userToJSON(user) {
  return {
    id: user.id,
    nickname: user.nickname,
    role: user.role,
    joinedAt: user.joinedAt,
    isOnline: user.isOnline,
  };
}

function getRoomUsers(room) {
  return Array.from(room.users.values()).map(userToJSON);
}

function broadcastUserCount(io, roomCode, room) {
  const count = room.type === 'group'
    ? room.users.size
    : (room.guestSocketId ? 2 : 1);
  io.to(roomCode).emit('user-count-update', {
    count,
    max: room.maxUsers,
  });
}

function addGroupUser(room, socket, nickname, role) {
  const user = {
    id: socket.id,
    nickname: nickname.slice(0, 20),
    role: role === 'host' ? 'host' : 'member',
    joinedAt: Date.now(),
    isOnline: true,
  };
  room.users.set(socket.id, user);
  return user;
}

function scheduleFileDeletion(filePath) {
  setTimeout(() => {
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {
      /* ignore */
    }
  }, FILE_TTL_MS);
}

function removeSocketFromRooms(socket) {
  const roomCode = socketRooms.get(socket.id);
  if (!roomCode) return null;

  const room = rooms.get(roomCode);
  if (!room) return null;

  if (room.type === 'direct') {
    const targetId = socket.id === room.hostSocketId
      ? room.guestSocketId
      : room.hostSocketId;

    if (targetId) {
      return { room, roomCode, type: 'direct', targetId, socket };
    }

    if (socket.id === room.hostSocketId) {
      const roomDir = path.join(UPLOAD_DIR, roomCode);
      if (fs.existsSync(roomDir)) {
        fs.rmSync(roomDir, { recursive: true, force: true });
      }
      rooms.delete(roomCode);
    } else {
      room.guestSocketId = null;
    }
    return { room, roomCode, type: 'direct', targetId, socket };
  }

  const user = room.users.get(socket.id);
  room.users.delete(socket.id);
  socketRooms.delete(socket.id);

  if (user) {
    const sysMsg = {
      id: uuidv4(),
      type: 'system',
      text: `${user.nickname} left the room`,
      senderId: 'system',
      senderNickname: 'System',
      timestamp: Date.now(),
    };
    room.messages.push(sysMsg);
    if (room.messages.length > MAX_MESSAGES) {
      room.messages = room.messages.slice(-MAX_MESSAGES);
    }
    return { room, roomCode, type: 'group', user, sysMsg, socket };
  }

  return { room, roomCode, type: 'group', socket };
}

app.post('/api/upload/:roomId', upload.array('files', 20), (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);

  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  if (!req.files?.length) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  touchRoom(room);

  const uploadedFiles = req.files.map((file) => {
    const fileInfo = {
      id: uuidv4(),
      originalName: file.originalname,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
      path: file.path,
      uploadedAt: Date.now(),
    };
    scheduleFileDeletion(file.path);
    return fileInfo;
  });

  if (!room.files) room.files = [];
  room.files.push(...uploadedFiles);

  const io = req.app.get('io');
  const payload = uploadedFiles.map(({ id, originalName, size, mimetype }) => ({
    id, originalName, size, mimetype,
  }));

  if (room.type === 'group') {
    for (const f of payload) {
      const meta = {
        fileId: f.id,
        name: f.originalName,
        size: f.size,
        type: f.mimetype,
        senderId: req.headers['x-socket-id'] || 'server',
        senderNickname: 'Server',
        uploadedAt: Date.now(),
      };
      room.sharedFiles.push(meta);
      if (room.sharedFiles.length > MAX_GROUP_FILES) {
        room.sharedFiles = room.sharedFiles.slice(-MAX_GROUP_FILES);
      }
      io.to(roomId).emit('file-available', meta);
    }
  } else if (room.hostSocketId) {
    io.to(room.hostSocketId).emit('files-uploaded', { files: payload });
  }

  res.json({ success: true, files: payload });
});

app.get('/api/files/:roomId', (req, res) => {
  const room = rooms.get(req.params.roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const files = (room.files || []).map(({ id, originalName, size, mimetype }) => ({
    id, originalName, size, mimetype,
  }));

  res.json({ files });
});

app.get('/api/download/:roomId/:fileId', (req, res) => {
  const room = rooms.get(req.params.roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const file = (room.files || []).find((f) => f.id === req.params.fileId);
  if (!file || !fs.existsSync(file.path)) {
    return res.status(404).json({ error: 'File not found or expired' });
  }

  res.download(file.path, file.originalName);
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', rooms: rooms.size, uptime: process.uptime() });
});

const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  maxHttpBufferSize: 1e8,
  pingTimeout: 60000,
  pingInterval: 25000,
});

app.set('io', io);

io.on('connection', (socket) => {
  socket.on('create-room', (options, callback) => {
    let roomType = 'direct';
    let hostNickname = 'Host';
    let cb = callback;

    if (typeof options === 'function') {
      cb = options;
    } else if (options && typeof options === 'object') {
      roomType = options.roomType === 'group' ? 'group' : 'direct';
      if (options.nickname) hostNickname = String(options.nickname).slice(0, 20);
    }

    let roomId = generateRoomId();
    while (rooms.has(roomId)) {
      roomId = generateRoomId();
    }

    const room = createRoomData(socket.id, roomType);
    room.code = roomId;
    rooms.set(roomId, room);
    socket.join(roomId);
    socket.roomId = roomId;
    socket.role = 'host';
    socketRooms.set(socket.id, roomId);

    if (roomType === 'group') {
      const hostUser = addGroupUser(room, socket, hostNickname, 'host');
      socket.nickname = hostUser.nickname;
      socket.emit('room-state', {
        users: getRoomUsers(room),
        messages: room.messages,
        files: room.sharedFiles,
        roomType: 'group',
        hostId: room.hostId,
      });
      broadcastUserCount(io, roomId, room);
    }

    if (typeof cb === 'function') {
      cb({ success: true, roomId, roomType });
    }
  });

  socket.on('join-room', (payload, callback) => {
    let roomCode;
    let nickname;
    let role = 'member';
    let cb = callback;

    if (typeof payload === 'string') {
      roomCode = payload;
    } else if (payload && typeof payload === 'object') {
      roomCode = payload.roomCode || payload.roomId;
      nickname = payload.nickname;
      role = payload.role || 'member';
      if (typeof payload === 'object' && typeof callback === 'function') {
        cb = callback;
      }
    }

    const room = rooms.get(roomCode);

    if (!room) {
      if (typeof cb === 'function') {
        cb({ success: false, error: 'Room not found' });
      }
      return;
    }

    touchRoom(room);

    if (room.type === 'group') {
      if (!nickname || !nickname.trim()) {
        if (typeof cb === 'function') {
          cb({ success: false, error: 'Nickname required for group rooms' });
        }
        return;
      }

      if (room.users.size >= room.maxUsers) {
        if (typeof cb === 'function') {
          cb({ success: false, error: 'Room is full (60/60)' });
        }
        return;
      }

      if (room.users.has(socket.id)) {
        socket.emit('room-state', {
          users: getRoomUsers(room),
          messages: room.messages,
          files: room.sharedFiles,
          roomType: 'group',
          hostId: room.hostId,
        });
        broadcastUserCount(io, roomCode, room);
        if (typeof cb === 'function') {
          cb({ success: true, roomId: roomCode, roomType: 'group' });
        }
        return;
      }

      const isHostJoin = role === 'host' && socket.id === room.hostSocketId;
      const user = addGroupUser(
        room,
        socket,
        nickname.trim(),
        isHostJoin ? 'host' : 'member'
      );

      socket.join(roomCode);
      socket.roomId = roomCode;
      socket.role = user.role;
      socket.nickname = user.nickname;
      socketRooms.set(socket.id, roomCode);

      const joinMsg = {
        id: uuidv4(),
        type: 'system',
        text: `${user.nickname} joined the room`,
        senderId: 'system',
        senderNickname: 'System',
        timestamp: Date.now(),
      };
      room.messages.push(joinMsg);
      if (room.messages.length > MAX_MESSAGES) {
        room.messages = room.messages.slice(-MAX_MESSAGES);
      }

      socket.emit('room-state', {
        users: getRoomUsers(room),
        messages: room.messages,
        files: room.sharedFiles,
        roomType: 'group',
        hostId: room.hostId,
      });

      socket.to(roomCode).emit('user-joined', userToJSON(user));
      socket.to(roomCode).emit('new-message', joinMsg);
      broadcastUserCount(io, roomCode, room);

      if (typeof cb === 'function') {
        cb({ success: true, roomId: roomCode, roomType: 'group' });
      }
      return;
    }

    if (room.guestSocketId) {
      if (typeof cb === 'function') {
        cb({ success: false, error: 'Room is full' });
      }
      return;
    }

    room.guestSocketId = socket.id;
    socket.join(roomCode);
    socket.roomId = roomCode;
    socket.role = 'guest';
    socketRooms.set(socket.id, roomCode);

    io.to(room.hostSocketId).emit('peer-joined', { peerId: socket.id });

    if (typeof cb === 'function') {
      cb({ success: true, roomId: roomCode, roomType: 'direct' });
    }
  });

  socket.on('group-message', ({ roomCode, message, type = 'text' }) => {
    const room = rooms.get(roomCode);
    if (!room || room.type !== 'group') return;

    const user = room.users.get(socket.id);
    if (!user) return;

    touchRoom(room);

    const msg = {
      id: uuidv4(),
      type,
      text: String(message).slice(0, 500),
      senderId: socket.id,
      senderNickname: user.nickname,
      timestamp: Date.now(),
    };

    room.messages.push(msg);
    if (room.messages.length > MAX_MESSAGES) {
      room.messages = room.messages.slice(-MAX_MESSAGES);
    }

    io.to(roomCode).emit('new-message', msg);
  });

  socket.on('typing-start', ({ roomCode, nickname }) => {
    socket.to(roomCode).emit('user-typing', {
      nickname: nickname || socket.nickname,
      socketId: socket.id,
    });
  });

  socket.on('typing-stop', ({ roomCode }) => {
    socket.to(roomCode).emit('user-stopped-typing', { socketId: socket.id });
  });

  socket.on('file-announced', ({ roomCode, fileInfo }) => {
    const room = rooms.get(roomCode);
    if (!room || room.type !== 'group') return;

    const user = room.users.get(socket.id);
    if (!user) return;

    touchRoom(room);

    const meta = {
      fileId: fileInfo.fileId || uuidv4(),
      name: fileInfo.name,
      size: fileInfo.size,
      type: fileInfo.type,
      senderId: socket.id,
      senderNickname: user.nickname,
      announcedAt: Date.now(),
    };

    room.sharedFiles.push(meta);
    if (room.sharedFiles.length > MAX_GROUP_FILES) {
      room.sharedFiles = room.sharedFiles.slice(-MAX_GROUP_FILES);
    }

    io.to(roomCode).emit('file-available', meta);
  });

  socket.on('request-file', ({ roomCode, fileId, targetSocketId }) => {
    if (targetSocketId) {
      io.to(targetSocketId).emit('file-requested', {
        fileId,
        requesterId: socket.id,
        requesterNickname: socket.nickname,
      });
    }
  });

  socket.on('webrtc-offer', ({ targetId, offer, fileId }) => {
    io.to(targetId).emit('webrtc-offer', { fromId: socket.id, offer, fileId });
  });

  socket.on('webrtc-answer', ({ targetId, answer, fileId }) => {
    io.to(targetId).emit('webrtc-answer', { fromId: socket.id, answer, fileId });
  });

  socket.on('webrtc-ice', ({ targetId, candidate }) => {
    io.to(targetId).emit('webrtc-ice', { fromId: socket.id, candidate });
  });

  socket.on('signal', ({ to, signal }) => {
    io.to(to).emit('signal', { from: socket.id, signal });
  });

  socket.on('clipboard', ({ roomId, encryptedText }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    touchRoom(room);

    if (room.type === 'group') {
      io.to(roomId).emit('clipboard', {
        encryptedText,
        fromId: socket.id,
        fromNickname: socket.nickname,
      });
      return;
    }

    const targetId = socket.id === room.hostSocketId
      ? room.guestSocketId
      : room.hostSocketId;

    if (targetId) {
      io.to(targetId).emit('clipboard', { encryptedText });
    }
  });

  socket.on('transfer-start', ({ roomId, fileInfo }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    touchRoom(room);
    const targetId = socket.id === room.hostSocketId
      ? room.guestSocketId
      : room.hostSocketId;
    if (targetId) {
      io.to(targetId).emit('transfer-start', { fileInfo });
    }
  });

  socket.on('transfer-complete', ({ roomId, fileInfo }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    touchRoom(room);
    const targetId = socket.id === room.hostSocketId
      ? room.guestSocketId
      : room.hostSocketId;
    if (targetId) {
      io.to(targetId).emit('transfer-complete', { fileInfo });
    }
  });

  socket.on('disconnect', () => {
    const result = removeSocketFromRooms(socket);
    if (!result) return;

    const { room, roomCode, type } = result;

    if (type === 'direct') {
      if (result.targetId) {
        io.to(result.targetId).emit('peer-disconnected');
      }
      return;
    }

    if (result.user) {
      io.to(roomCode).emit('user-left', userToJSON(result.user));
      io.to(roomCode).emit('new-message', result.sysMsg);
      broadcastUserCount(io, roomCode, room);

      if (socket.id === room.hostId && room.users.size > 0) {
        const nextHost = room.users.values().next().value;
        if (nextHost) {
          nextHost.role = 'host';
          room.hostId = nextHost.id;
          room.hostSocketId = nextHost.id;
          io.to(roomCode).emit('host-changed', { hostId: nextHost.id, nickname: nextHost.nickname });
        }
      } else if (room.users.size === 0) {
        const roomDir = path.join(UPLOAD_DIR, roomCode);
        if (fs.existsSync(roomDir)) {
          fs.rmSync(roomDir, { recursive: true, force: true });
        }
        rooms.delete(roomCode);
      }
    }
  });
});

setInterval(() => {
  const now = Date.now();
  for (const [roomCode, room] of rooms.entries()) {
    const inactive = now - room.lastActivityAt;

    if (inactive > ROOM_INACTIVE_MS) {
      const roomDir = path.join(UPLOAD_DIR, roomCode);
      if (fs.existsSync(roomDir)) {
        fs.rmSync(roomDir, { recursive: true, force: true });
      }
      io.to(roomCode).emit('room-expired', { roomCode });
      rooms.delete(roomCode);
      continue;
    }

    if (inactive > ROOM_WARNING_MS && !room.warnedInactive) {
      room.warnedInactive = true;
      io.to(roomCode).emit('room-expiry-warning', {
        minutesLeft: Math.ceil((ROOM_INACTIVE_MS - inactive) / 60000),
      });
    }
  }

  for (const [roomId, room] of rooms.entries()) {
    if (now - room.createdAt > 60 * 60 * 1000 && room.users?.size === 0 && !room.guestSocketId) {
      const roomDir = path.join(UPLOAD_DIR, roomId);
      if (fs.existsSync(roomDir)) {
        fs.rmSync(roomDir, { recursive: true, force: true });
      }
      rooms.delete(roomId);
    }
  }
}, 5 * 60 * 1000);

server.listen(PORT, () => {
  console.log(`SYNC_ROOM Server running on port ${PORT}`);
});

function gracefulShutdown() {
  try {
    if (fs.existsSync(UPLOAD_DIR)) {
      const children = fs.readdirSync(UPLOAD_DIR);
      for (const child of children) {
        const childPath = path.join(UPLOAD_DIR, child);
        if (fs.lstatSync(childPath).isDirectory()) {
          fs.rmSync(childPath, { recursive: true, force: true });
        }
      }
    }
  } catch {
    /* ignore */
  }
  process.exit(0);
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
