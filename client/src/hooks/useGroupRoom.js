import { useState, useCallback, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { storeNickname } from '../utils/nicknames';
import { playMessageSound, playFileSound, playJoinSound } from '../utils/sounds';

export function useGroupRoom(socket, { roomId, nickname, soundsEnabled = false }) {
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [files, setFiles] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [userCount, setUserCount] = useState({ count: 0, max: 60 });
  const [transferProgress, setTransferProgress] = useState({});
  const [bytesTransferred, setBytesTransferred] = useState(0);
  const peersRef = useRef(new Map());

  const play = useCallback((fn) => {
    if (soundsEnabled) fn();
  }, [soundsEnabled]);

  useEffect(() => {
    if (!socket?.socket || !roomId) return undefined;

    const s = socket.socket;

    const onRoomState = (state) => {
      setUsers(state.users || []);
      setMessages(state.messages || []);
      setFiles(state.files || []);
    };

    const onUserJoined = (user) => {
      setUsers((prev) => {
        if (prev.some((u) => u.id === user.id)) return prev;
        return [...prev, user];
      });
      play(playJoinSound);
      toast.success(`${user.nickname} joined`);
    };

    const onUserLeft = (user) => {
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      toast(`${user.nickname} left`, { icon: '👋' });
    };

    const onNewMessage = (msg) => {
      setMessages((prev) => [...prev.slice(-99), msg]);
      if (msg.senderId !== s.id && msg.type !== 'system') {
        play(playMessageSound);
      }
    };

    const onFileAvailable = (meta) => {
      setFiles((prev) => {
        if (prev.some((f) => f.fileId === meta.fileId)) return prev;
        return [...prev, meta];
      });
      play(playFileSound);
      toast.success(`New file: ${meta.name}`, { icon: '📁' });
    };

    const onUserCount = (data) => setUserCount(data);

    const onTyping = ({ nickname: n, socketId }) => {
      setTypingUsers((prev) => {
        if (prev.some((t) => t.socketId === socketId)) return prev;
        return [...prev, { nickname: n, socketId }];
      });
    };

    const onStoppedTyping = ({ socketId }) => {
      setTypingUsers((prev) => prev.filter((t) => t.socketId !== socketId));
    };

    const onRoomWarning = ({ minutesLeft }) => {
      toast.error(`Room closing in ~${minutesLeft} minutes (inactivity)`, { duration: 8000 });
    };

    const onRoomExpired = () => {
      toast.error('Room expired due to inactivity');
    };

    const onWebrtcOffer = async ({ fromId, offer, fileId }) => {
      try {
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });
        peersRef.current.set(fromId, pc);

        pc.ondatachannel = (e) => {
          const ch = e.channel;
          ch.binaryType = 'arraybuffer';
          let meta = null;
          let chunks = [];

          ch.onmessage = (ev) => {
            if (typeof ev.data === 'string') {
              try {
                const parsed = JSON.parse(ev.data);
                if (parsed.type === 'file-meta') {
                  meta = parsed;
                  chunks = [];
                  setTransferProgress((p) => ({ ...p, [fileId]: 0 }));
                }
                if (parsed.type === 'file-end' && meta) {
                  const blob = new Blob(chunks, { type: meta.mimeType });
                  const url = URL.createObjectURL(blob);
                  setFiles((prev) => prev.map((f) =>
                    f.fileId === fileId ? { ...f, url, blob, local: true } : f
                  ));
                  setTransferProgress((p) => ({ ...p, [fileId]: 100 }));
                  setBytesTransferred((b) => b + meta.size);
                  toast.success(`Downloaded: ${meta.name}`);
                }
              } catch { /* ignore */ }
            } else if (ev.data instanceof ArrayBuffer && meta) {
              chunks.push(ev.data);
              const received = chunks.reduce((a, c) => a + c.byteLength, 0);
              const pct = Math.round((received / meta.size) * 100);
              setTransferProgress((p) => ({ ...p, [fileId]: pct }));
            }
          };
        };

        await pc.setRemoteDescription(offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        pc.onicecandidate = (e) => {
          if (e.candidate) {
            s.emit('webrtc-ice', { targetId: fromId, candidate: e.candidate });
          }
        };

        s.emit('webrtc-answer', { targetId: fromId, answer: pc.localDescription, fileId });
      } catch {
        toast.error('Failed to receive file');
      }
    };

    const onWebrtcAnswer = async ({ fromId, answer }) => {
      const pc = peersRef.current.get(fromId);
      if (pc) await pc.setRemoteDescription(answer);
    };

    const onWebrtcIce = async ({ fromId, candidate }) => {
      const pc = peersRef.current.get(fromId);
      if (pc) await pc.addIceCandidate(candidate);
    };

    const onFileRequested = ({ fileId, requesterId, requesterNickname }) => {
      toast(`${requesterNickname || 'Someone'} wants your file`, { icon: '📥' });
    };

    s.on('room-state', onRoomState);
    s.on('user-joined', onUserJoined);
    s.on('user-left', onUserLeft);
    s.on('new-message', onNewMessage);
    s.on('file-available', onFileAvailable);
    s.on('user-count-update', onUserCount);
    s.on('user-typing', onTyping);
    s.on('user-stopped-typing', onStoppedTyping);
    s.on('room-expiry-warning', onRoomWarning);
    s.on('room-expired', onRoomExpired);
    s.on('webrtc-offer', onWebrtcOffer);
    s.on('webrtc-answer', onWebrtcAnswer);
    s.on('webrtc-ice', onWebrtcIce);
    s.on('file-requested', onFileRequested);

    return () => {
      s.off('room-state', onRoomState);
      s.off('user-joined', onUserJoined);
      s.off('user-left', onUserLeft);
      s.off('new-message', onNewMessage);
      s.off('file-available', onFileAvailable);
      s.off('user-count-update', onUserCount);
      s.off('user-typing', onTyping);
      s.off('user-stopped-typing', onStoppedTyping);
      s.off('room-expiry-warning', onRoomWarning);
      s.off('room-expired', onRoomExpired);
      s.off('webrtc-offer', onWebrtcOffer);
      s.off('webrtc-answer', onWebrtcAnswer);
      s.off('webrtc-ice', onWebrtcIce);
      s.off('file-requested', onFileRequested);
      peersRef.current.forEach((pc) => pc.close());
      peersRef.current.clear();
    };
  }, [socket, roomId, play]);

  const sendMessage = useCallback((message) => {
    if (!socket?.socket || !roomId) return;
    socket.socket.emit('group-message', { roomCode: roomId, message, type: 'text' });
  }, [socket, roomId]);

  const announceFile = useCallback((fileInfo) => {
    if (!socket?.socket || !roomId) return;
    socket.socket.emit('file-announced', { roomCode: roomId, fileInfo });
    setFiles((prev) => [...prev, { ...fileInfo, senderId: socket.socketId }]);
    setBytesTransferred((b) => b + (fileInfo.size || 0));
  }, [socket, roomId]);

  const requestFile = useCallback((file) => {
    if (!socket?.socket || !roomId) return;
    socket.socket.emit('request-file', {
      roomCode: roomId,
      fileId: file.fileId,
      targetSocketId: file.senderId,
    });
    toast('Requesting file via P2P...', { icon: '🔗' });
  }, [socket, roomId]);

  const sendFileToPeer = useCallback(async (file, targetSocketId, fileId) => {
    if (!socket?.socket) return;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    peersRef.current.set(targetSocketId, pc);

    const dc = pc.createDataChannel('fileTransfer');
    dc.binaryType = 'arraybuffer';

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.socket.emit('webrtc-ice', { targetId: targetSocketId, candidate: e.candidate });
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.socket.emit('webrtc-offer', {
      targetId: targetSocketId,
      offer: pc.localDescription,
      fileId,
    });

    await new Promise((resolve) => {
      dc.onopen = resolve;
      setTimeout(resolve, 5000);
    });

    if (dc.readyState !== 'open') {
      toast.error('P2P channel failed — try server upload');
      return;
    }

    const CHUNK = 64 * 1024;
    const totalChunks = Math.ceil(file.size / CHUNK);
    dc.send(JSON.stringify({
      type: 'file-meta',
      name: file.name,
      size: file.size,
      mimeType: file.type,
      totalChunks,
    }));

    let offset = 0;
    while (offset < file.size) {
      const slice = file.slice(offset, offset + CHUNK);
      const buf = await slice.arrayBuffer();
      dc.send(buf);
      offset += CHUNK;
      const pct = Math.round((offset / file.size) * 100);
      setTransferProgress((p) => ({ ...p, [fileId]: pct }));
    }

    dc.send(JSON.stringify({ type: 'file-end', name: file.name }));
    setTransferProgress((p) => ({ ...p, [fileId]: 100 }));
    setBytesTransferred((b) => b + file.size);
    toast.success(`Sent ${file.name} to peer`);
  }, [socket]);

  const typingStart = useCallback(() => {
    socket?.socket?.emit('typing-start', { roomCode: roomId, nickname });
  }, [socket, roomId, nickname]);

  const typingStop = useCallback(() => {
    socket?.socket?.emit('typing-stop', { roomCode: roomId });
  }, [socket, roomId]);

  const joinGroupRoom = useCallback((roomCode, nick, role = 'member') => {
    storeNickname(nick);
    return new Promise((resolve, reject) => {
      socket.socket.emit('join-room', { roomCode, nickname: nick, role }, (res) => {
        if (res.success) resolve(res);
        else reject(new Error(res.error || 'Join failed'));
      });
    });
  }, [socket]);

  return {
    users,
    messages,
    files,
    typingUsers,
    userCount,
    transferProgress,
    bytesTransferred,
    sendMessage,
    announceFile,
    requestFile,
    sendFileToPeer,
    typingStart,
    typingStop,
    joinGroupRoom,
  };
}
