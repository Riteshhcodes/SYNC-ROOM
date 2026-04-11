const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// ─── Config ───────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const FILE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB for server fallback

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3005',
];
if (process.env.CLIENT_URL) {
  ALLOWED_ORIGINS.push(process.env.CLIENT_URL);
}

// ─── Ensure uploads directory ─────────────────────────────
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ─── Express App ──────────────────────────────────────────
const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all in dev; tighten for production
    }
  },
  credentials: true,
}));

app.use(express.json());

// ─── Multer (Server Fallback Storage) ─────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const roomDir = path.join(UPLOAD_DIR, req.params.roomId);
    if (!fs.existsSync(roomDir)) {
      fs.mkdirSync(roomDir, { recursive: true });
    }
    cb(null, roomDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
});

// ─── Room Management ─────────────────────────────────────
const rooms = new Map();
// rooms.get(roomId) => { hostSocketId, guestSocketId, createdAt, files: [] }

function generateRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

function scheduleFileDeletion(filePath) {
  setTimeout(() => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      // Cleanup silently failed
    }
  }, FILE_TTL_MS);
}

// ─── REST API (Fallback File Transfer) ────────────────────
app.post('/api/upload/:roomId', upload.array('files', 20), (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);

  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

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

    // Schedule auto-delete
    scheduleFileDeletion(file.path);

    return fileInfo;
  });

  // Store file info in room
  if (!room.files) room.files = [];
  room.files.push(...uploadedFiles);

  // Notify the host via socket
  const io = req.app.get('io');
  if (room.hostSocketId) {
    io.to(room.hostSocketId).emit('files-uploaded', {
      files: uploadedFiles.map(({ id, originalName, size, mimetype }) => ({
        id, originalName, size, mimetype,
      })),
    });
  }

  res.json({
    success: true,
    files: uploadedFiles.map(({ id, originalName, size, mimetype }) => ({
      id, originalName, size, mimetype,
    })),
  });
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', rooms: rooms.size, uptime: process.uptime() });
});

// ─── Socket.io ────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  maxHttpBufferSize: 1e8, // 100MB
  pingTimeout: 60000,
  pingInterval: 25000,
});

app.set('io', io);

io.on('connection', (socket) => {
  // ── Create Room ──
  socket.on('create-room', (callback) => {
    let roomId = generateRoomId();
    // Ensure unique
    while (rooms.has(roomId)) {
      roomId = generateRoomId();
    }

    rooms.set(roomId, {
      hostSocketId: socket.id,
      guestSocketId: null,
      createdAt: Date.now(),
      files: [],
    });

    socket.join(roomId);
    socket.roomId = roomId;
    socket.role = 'host';

    if (typeof callback === 'function') {
      callback({ success: true, roomId });
    }
  });

  // ── Join Room ──
  socket.on('join-room', (roomId, callback) => {
    const room = rooms.get(roomId);

    if (!room) {
      if (typeof callback === 'function') {
        callback({ success: false, error: 'Room not found' });
      }
      return;
    }

    if (room.guestSocketId) {
      if (typeof callback === 'function') {
        callback({ success: false, error: 'Room is full' });
      }
      return;
    }

    room.guestSocketId = socket.id;
    socket.join(roomId);
    socket.roomId = roomId;
    socket.role = 'guest';

    // Notify both peers
    io.to(room.hostSocketId).emit('peer-joined', { peerId: socket.id });
    
    if (typeof callback === 'function') {
      callback({ success: true, roomId });
    }
  });

  // ── WebRTC Signaling ──
  socket.on('signal', ({ to, signal }) => {
    io.to(to).emit('signal', {
      from: socket.id,
      signal,
    });
  });

  // ── Clipboard Share ──
  socket.on('clipboard', ({ roomId, encryptedText }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    // Send to the other peer
    const targetId = socket.id === room.hostSocketId
      ? room.guestSocketId
      : room.hostSocketId;

    if (targetId) {
      io.to(targetId).emit('clipboard', { encryptedText });
    }
  });

  // ── Transfer status ──
  socket.on('transfer-start', ({ roomId, fileInfo }) => {
    const room = rooms.get(roomId);
    if (!room) return;
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
    const targetId = socket.id === room.hostSocketId
      ? room.guestSocketId
      : room.hostSocketId;
    if (targetId) {
      io.to(targetId).emit('transfer-complete', { fileInfo });
    }
  });

  socket.on('disconnect', () => {
    if (socket.roomId) {
      const room = rooms.get(socket.roomId);
      if (room) {
        // Notify the other peer
        const targetId = socket.id === room.hostSocketId
          ? room.guestSocketId
          : room.hostSocketId;

        if (targetId) {
          io.to(targetId).emit('peer-disconnected');
        }

        // If host disconnects, destroy room
        if (socket.id === room.hostSocketId) {
          // Clean up files
          const roomDir = path.join(UPLOAD_DIR, socket.roomId);
          if (fs.existsSync(roomDir)) {
            fs.rmSync(roomDir, { recursive: true, force: true });
          }
          rooms.delete(socket.roomId);
        } else {
          // Guest disconnected, allow new guest
          room.guestSocketId = null;
        }
      }
    }
  });
});

// ─── Periodic Cleanup (stale rooms > 1 hour) ─────────────
setInterval(() => {
  const now = Date.now();
  for (const [roomId, room] of rooms.entries()) {
    if (now - room.createdAt > 60 * 60 * 1000) {
      const roomDir = path.join(UPLOAD_DIR, roomId);
      if (fs.existsSync(roomDir)) {
        fs.rmSync(roomDir, { recursive: true, force: true });
      }
      rooms.delete(roomId);
    }
  }
}, 5 * 60 * 1000);

// ─── Start Server ─────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`SYNC_ROOM Server running on port ${PORT}`);
});

// ─── Graceful Shutdown ────────────────────────────────────
function gracefulShutdown() {
  console.log('\\n[Server] Shutting down. Cleaning up uploads...');
  try {
    if (fs.existsSync(UPLOAD_DIR)) {
      // Clean only the subdirectories (rooms), not the uploads folder itself
      const children = fs.readdirSync(UPLOAD_DIR);
      for (const child of children) {
        const childPath = path.join(UPLOAD_DIR, child);
        if (fs.lstatSync(childPath).isDirectory()) {
          fs.rmSync(childPath, { recursive: true, force: true });
        }
      }
      console.log('[Server] Uploads directory purged.');
    }
  } catch (err) {
    console.error('[Server] Cleanup error during shutdown:', err);
  }
  process.exit(0);
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
