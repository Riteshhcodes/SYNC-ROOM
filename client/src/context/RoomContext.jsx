import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useWebRTC } from '../hooks/useWebRTC';
import { useFileTransfer } from '../hooks/useFileTransfer';
import { CONNECTION_STATES } from '../utils/constants';
import { decryptClipboard } from '../utils/crypto';
import { toast } from 'sonner';

const RoomContext = createContext(null);

export function useRoom() {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error('useRoom must be used within RoomProvider');
  return ctx;
}

export function RoomProvider({ children }) {
  const [roomId, setRoomId] = useState(null);
  const [role, setRole] = useState(null); // 'host' | 'guest'
  const [peerId, setPeerId] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(CONNECTION_STATES.WAITING);
  const [clipboardMessages, setClipboardMessages] = useState([]);
  const [isP2P, setIsP2P] = useState(false);
  const [serverFiles, setServerFiles] = useState([]);

  const dataChannelRef = useRef(null);
  const peerIdRef = useRef(null);
  const connectionTimeoutRef = useRef(null);

  const socket = useSocket();
  const fileTransfer = useFileTransfer();

  const onDataChannel = useCallback((channel) => {
    dataChannelRef.current = channel;

    channel.onopen = () => {
      setIsP2P(true);
      setConnectionStatus(CONNECTION_STATES.CONNECTED);
    };

    channel.onclose = () => {
      setIsP2P(false);
    };

    channel.onmessage = (event) => {
      fileTransfer.handleIncomingData(event.data);
    };

    channel.onerror = () => {
      // Handled silently
    };
  }, [fileTransfer]);

  const onConnectionStateChange = useCallback((state) => {
    if (state === 'connected') {
      clearConnectionTimeout();
      setConnectionStatus(CONNECTION_STATES.CONNECTED);
    } else if (state === 'disconnected' || state === 'failed') {
      clearConnectionTimeout();
      setConnectionStatus(CONNECTION_STATES.DISCONNECTED);
      setIsP2P(false);
    } else if (state === 'connecting') {
      setConnectionStatus(CONNECTION_STATES.CONNECTING);
    }
  }, [clearConnectionTimeout]);

  const webrtc = useWebRTC({
    onDataChannel,
    onConnectionStateChange,
    sendSignal: socket.sendSignal,
  });

  // Clear connection timeout
  const clearConnectionTimeout = useCallback(() => {
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
  }, []);

  // Set connection timeout
  const setConnectionTimeout = useCallback(() => {
    clearConnectionTimeout();
    connectionTimeoutRef.current = setTimeout(() => {
      setConnectionStatus(CONNECTION_STATES.ERROR);
      toast.error('Connection Failed - Please try again');
    }, 10000); // 10 seconds timeout
  }, [clearConnectionTimeout]);

  // Listen for socket events
  useEffect(() => {
    const handlePeerJoined = ({ peerId: newPeerId }) => {
      setPeerId(newPeerId);
      peerIdRef.current = newPeerId;
      setConnectionStatus(CONNECTION_STATES.CONNECTING);
      setConnectionTimeout();

      // Host initiates WebRTC
      if (role === 'host') {
        webrtc.createOffer(newPeerId);
      }
    };

    const handleSignal = (data) => {
      webrtc.handleSignal(data);
    };

    const handleClipboard = ({ encryptedText }) => {
      if (roomId) {
        const text = decryptClipboard(encryptedText, roomId);
        if (text) {
          setClipboardMessages((prev) => [
            ...prev,
            { text, timestamp: Date.now(), direction: 'received' },
          ]);

          // Auto-copy to clipboard
          navigator.clipboard?.writeText(text).then(() => {
            toast.success('Copied to clipboard!', {
              description: text.length > 50 ? text.substring(0, 50) + '...' : text,
            });
          }).catch(() => {
            toast.info('Text received', {
              description: text.length > 50 ? text.substring(0, 50) + '...' : text,
            });
          });
        }
      }
    };

    const handleFilesUploaded = ({ files }) => {
      setServerFiles((prev) => [...prev, ...files]);
      toast.info(`${files.length} file(s) received via server`, {
        description: 'Files will expire in 10 minutes.',
      });
    };

    const handlePeerDisconnected = () => {
      setPeerId(null);
      peerIdRef.current = null;
      setConnectionStatus(CONNECTION_STATES.DISCONNECTED);
      setIsP2P(false);
      toast.error('Peer disconnected');
    };

    socket.on('peer-joined', handlePeerJoined);
    socket.on('signal', handleSignal);
    socket.on('clipboard', handleClipboard);
    socket.on('files-uploaded', handleFilesUploaded);
    socket.on('peer-disconnected', handlePeerDisconnected);

    return () => {
      socket.off('peer-joined', handlePeerJoined);
      socket.off('signal', handleSignal);
      socket.off('clipboard', handleClipboard);
      socket.off('files-uploaded', handleFilesUploaded);
      socket.off('peer-disconnected', handlePeerDisconnected);
    };
  }, [socket, webrtc, role, roomId]);

  // Host: Create room
  const createRoom = useCallback(async () => {
    try {
      const newRoomId = await socket.createRoom();
      setRoomId(newRoomId);
      setRole('host');
      setConnectionStatus(CONNECTION_STATES.WAITING);
      return newRoomId;
    } catch (err) {
      toast.error('Failed to create room');
      throw err;
    }
  }, [socket]);

  // Guest: Join room
  const joinRoom = useCallback(async (id) => {
    try {
      const joined = await socket.joinRoom(id.toUpperCase());
      setRoomId(joined);
      setRole('guest');
      setConnectionStatus(CONNECTION_STATES.CONNECTING);
      return joined;
    } catch (err) {
      toast.error(err.message || 'Failed to join room');
      throw err;
    }
  }, [socket]);

  // Send files
  const sendFiles = useCallback(async (files) => {
    const dc = dataChannelRef.current;

    if (dc && dc.readyState === 'open') {
      // P2P transfer
      await fileTransfer.sendFilesP2P(Array.from(files), dc, (file) => {
        toast.success(`Sent: ${file.name}`);
      });
    } else {
      // Server fallback
      if (roomId) {
        toast.info('Using server relay (P2P unavailable)');
        await fileTransfer.sendFilesServer(Array.from(files), roomId);
        toast.success('Files uploaded to server');
      }
    }
  }, [fileTransfer, roomId]);

  // Leave room
  const leaveRoom = useCallback(() => {
    webrtc.cleanup();
    setRoomId(null);
    setRole(null);
    setPeerId(null);
    setConnectionStatus(CONNECTION_STATES.WAITING);
    setIsP2P(false);
    setClipboardMessages([]);
    setServerFiles([]);
    fileTransfer.clearReceivedFiles();
  }, [webrtc, fileTransfer]);

  const value = {
    roomId,
    role,
    peerId,
    connectionStatus,
    isP2P,
    clipboardMessages,
    serverFiles,
    createRoom,
    joinRoom,
    leaveRoom,
    sendFiles,
    sendClipboard: socket.sendClipboard,
    socketConnected: socket.isConnected,
    ...fileTransfer,
  };

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}
