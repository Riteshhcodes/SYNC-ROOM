import { useEffect, useRef, useCallback, useState } from 'react';
import { io } from 'socket.io-client';
import { SERVER_URL } from '../utils/constants';

/**
 * Socket.io connection hook — singleton pattern.
 */
let socketInstance = null;

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!socketInstance) {
      socketInstance = io(SERVER_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        timeout: 10000,
      });
    }

    socketRef.current = socketInstance;
    const socket = socketRef.current;

    const onConnect = () => {
      setIsConnected(true);
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onError = () => {
      // Handled silently to avoid console clutter. UI will show offline.
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onError);

    // If already connected
    if (socket.connected) {
      setIsConnected(true);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onError);
    };
  }, []);

  const createRoom = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) return reject(new Error('Socket not connected'));
      socketRef.current.emit('create-room', (response) => {
        if (response.success) {
          resolve(response.roomId);
        } else {
          reject(new Error(response.error || 'Failed to create room'));
        }
      });
    });
  }, []);

  const joinRoom = useCallback((roomId) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) return reject(new Error('Socket not connected'));
      socketRef.current.emit('join-room', roomId, (response) => {
        if (response.success) {
          resolve(response.roomId);
        } else {
          reject(new Error(response.error || 'Failed to join room'));
        }
      });
    });
  }, []);

  const sendSignal = useCallback((to, signal) => {
    if (socketRef.current) {
      socketRef.current.emit('signal', { to, signal });
    }
  }, []);

  const sendClipboard = useCallback((roomId, encryptedText) => {
    if (socketRef.current) {
      socketRef.current.emit('clipboard', { roomId, encryptedText });
    }
  }, []);

  const on = useCallback((event, handler) => {
    if (socketRef.current) {
      socketRef.current.on(event, handler);
    }
  }, []);

  const off = useCallback((event, handler) => {
    if (socketRef.current) {
      socketRef.current.off(event, handler);
    }
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    createRoom,
    joinRoom,
    sendSignal,
    sendClipboard,
    on,
    off,
    socketId: socketRef.current?.id,
  };
}
