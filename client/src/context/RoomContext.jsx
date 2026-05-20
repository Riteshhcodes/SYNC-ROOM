import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useWebRTC } from '../hooks/useWebRTC';
import { useFileTransfer } from '../hooks/useFileTransfer';
import { CONNECTION_STATES, ROOM_TYPES } from '../utils/constants';
import { decryptClipboard } from '../utils/crypto';
import { storeNickname, getStoredNickname } from '../utils/nicknames';
import toast from 'react-hot-toast';

const RoomContext = createContext(null);

export function useRoom() {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error('useRoom must be used within RoomProvider');
  return ctx;
}

export function RoomProvider({ children }) {
  const [roomId, setRoomId] = useState(null);
  const [roomType, setRoomType] = useState(ROOM_TYPES.DIRECT);
  const [role, setRole] = useState(null);
  const [nickname, setNickname] = useState(() => getStoredNickname());
  const [peerId, setPeerId] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(CONNECTION_STATES.WAITING);
  const [clipboardMessages, setClipboardMessages] = useState([]);
  const [isP2P, setIsP2P] = useState(false);
  const [serverFiles, setServerFiles] = useState([]);
  const [roomCreatedAt, setRoomCreatedAt] = useState(null);
  const [sessionBytes, setSessionBytes] = useState(0);

  const dataChannelRef = useRef(null);
  const peerIdRef = useRef(null);

  const socket = useSocket();
  const fileTransfer = useFileTransfer();

  const onDataChannel = useCallback((channel) => {
    dataChannelRef.current = channel;

    channel.onopen = () => {
      setIsP2P(true);
      setConnectionStatus(CONNECTION_STATES.CONNECTED);
    };

    channel.onclose = () => setIsP2P(false);

    channel.onmessage = (event) => {
      fileTransfer.handleIncomingData(event.data);
      if (event.data instanceof ArrayBuffer) {
        setSessionBytes((b) => b + event.data.byteLength);
      }
    };
  }, [fileTransfer]);

  const onConnectionStateChange = useCallback((state) => {
    if (state === 'connected') {
      setConnectionStatus(CONNECTION_STATES.CONNECTED);
    } else if (state === 'disconnected' || state === 'failed') {
      setConnectionStatus(CONNECTION_STATES.DISCONNECTED);
      setIsP2P(false);
    } else if (state === 'connecting') {
      setConnectionStatus(CONNECTION_STATES.CONNECTING);
    }
  }, []);

  const webrtc = useWebRTC({
    onDataChannel,
    onConnectionStateChange,
    sendSignal: socket.sendSignal,
  });

  useEffect(() => {
    const handlePeerJoined = ({ peerId: newPeerId }) => {
      setPeerId(newPeerId);
      peerIdRef.current = newPeerId;
      setConnectionStatus(CONNECTION_STATES.CONNECTING);
      if (role === 'host') {
        webrtc.createOffer(newPeerId);
      }
    };

    const handleSignal = (data) => webrtc.handleSignal(data);

    const handleClipboard = ({ encryptedText }) => {
      if (roomId) {
        const text = decryptClipboard(encryptedText, roomId);
        if (text) {
          setClipboardMessages((prev) => [
            ...prev,
            { text, timestamp: Date.now(), direction: 'received' },
          ]);
          navigator.clipboard?.writeText(text).catch(() => {});
          toast.success('Copied to clipboard!');
        }
      }
    };

    const handleFilesUploaded = ({ files }) => {
      setServerFiles((prev) => [...prev, ...files]);
      toast.success(`${files.length} file(s) received via server`);
    };

    const handlePeerDisconnected = () => {
      setPeerId(null);
      peerIdRef.current = null;
      setConnectionStatus(CONNECTION_STATES.DISCONNECTED);
      setIsP2P(false);
      toast.error('Peer disconnected');
    };

    const handleRoomWarning = ({ minutesLeft }) => {
      toast.error(`Room closing in ~${minutesLeft} min (inactivity)`, { duration: 8000 });
    };

    const handleRoomExpired = () => {
      toast.error('Room expired');
      leaveRoomInternal();
    };

    socket.on('peer-joined', handlePeerJoined);
    socket.on('signal', handleSignal);
    socket.on('clipboard', handleClipboard);
    socket.on('files-uploaded', handleFilesUploaded);
    socket.on('peer-disconnected', handlePeerDisconnected);
    socket.on('room-expiry-warning', handleRoomWarning);
    socket.on('room-expired', handleRoomExpired);

    return () => {
      socket.off('peer-joined', handlePeerJoined);
      socket.off('signal', handleSignal);
      socket.off('clipboard', handleClipboard);
      socket.off('files-uploaded', handleFilesUploaded);
      socket.off('peer-disconnected', handlePeerDisconnected);
      socket.off('room-expiry-warning', handleRoomWarning);
      socket.off('room-expired', handleRoomExpired);
    };
  }, [socket, webrtc, role, roomId]);

  const leaveRoomInternal = useCallback(() => {
    webrtc.cleanup();
    setRoomId(null);
    setRoomType(ROOM_TYPES.DIRECT);
    setRole(null);
    setPeerId(null);
    setConnectionStatus(CONNECTION_STATES.WAITING);
    setIsP2P(false);
    setClipboardMessages([]);
    setServerFiles([]);
    setRoomCreatedAt(null);
    fileTransfer.clearReceivedFiles();
  }, [webrtc, fileTransfer]);

  const createRoom = useCallback(async (options = {}) => {
    try {
      const result = await socket.createRoom(options);
      setRoomId(result.roomId);
      setRoomType(result.roomType || options.roomType || ROOM_TYPES.DIRECT);
      setRole('host');
      setRoomCreatedAt(Date.now());
      setConnectionStatus(
        result.roomType === ROOM_TYPES.GROUP
          ? CONNECTION_STATES.CONNECTED
          : CONNECTION_STATES.WAITING
      );
      return result;
    } catch (err) {
      toast.error('Failed to create room');
      throw err;
    }
  }, [socket]);

  const joinRoom = useCallback(async (id, joinOptions = {}) => {
    try {
      const code = id.toUpperCase();
      const nick = joinOptions.nickname || nickname;

      if (joinOptions.roomType === ROOM_TYPES.GROUP || joinOptions.forceGroup) {
        if (!nick?.trim()) {
          throw new Error('Nickname required');
        }
        storeNickname(nick);
        setNickname(nick);
      }

      const payload = joinOptions.nickname
        ? { roomCode: code, nickname: nick, role: joinOptions.role || 'member' }
        : code;

      const result = await socket.joinRoom(payload);
      setRoomId(result.roomId);
      setRoomType(result.roomType);
      setRole(joinOptions.role || (result.roomType === ROOM_TYPES.GROUP ? 'member' : 'guest'));
      setRoomCreatedAt(Date.now());

      if (result.roomType === ROOM_TYPES.GROUP) {
        setConnectionStatus(CONNECTION_STATES.CONNECTED);
      } else {
        setConnectionStatus(CONNECTION_STATES.CONNECTING);
      }

      return result;
    } catch (err) {
      toast.error(err.message || 'Failed to join room');
      throw err;
    }
  }, [socket, nickname]);

  const sendFiles = useCallback(async (files) => {
    const fileArr = Array.from(files).filter((f) => f.size > 0);

    if (fileArr.length === 0) {
      toast.error('File is empty or invalid');
      return;
    }

    const dc = dataChannelRef.current;

    if (dc && dc.readyState === 'open') {
      await fileTransfer.sendFilesP2P(fileArr, dc, (file) => {
        setSessionBytes((b) => b + file.size);
        toast.success(`Sent: ${file.name}`);
      });
    } else if (roomId) {
      toast('Using server relay (P2P unavailable)', { icon: '☁️' });
      await fileTransfer.sendFilesServer(fileArr, roomId);
      fileArr.forEach((f) => setSessionBytes((b) => b + f.size));
      toast.success('Files uploaded to server');
    }
  }, [fileTransfer, roomId]);

  const leaveRoom = useCallback(() => {
    leaveRoomInternal();
  }, [leaveRoomInternal]);

  const setUserNickname = useCallback((nick) => {
    setNickname(nick);
    storeNickname(nick);
  }, []);

  const value = {
    roomId,
    roomType,
    role,
    nickname,
    peerId,
    connectionStatus,
    isP2P,
    clipboardMessages,
    serverFiles,
    roomCreatedAt,
    sessionBytes,
    createRoom,
    joinRoom,
    leaveRoom,
    sendFiles,
    sendClipboard: socket.sendClipboard,
    socketConnected: socket.isConnected,
    socket,
    setUserNickname,
    ...fileTransfer,
  };

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}
