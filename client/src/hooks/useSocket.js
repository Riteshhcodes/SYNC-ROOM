import { useEffect, useRef, useCallback, useState } from 'react';
import { io } from 'socket.io-client';
import { SERVER_URL } from '../utils/constants';

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

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    if (socket.connected) setIsConnected(true);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  const createRoom = useCallback((options = {}) => {
    const roomType = options.roomType || 'direct';
    return new Promise((resolve, reject) => {
      if (!socketRef.current) return reject(new Error('Socket not connected'));
      socketRef.current.emit('create-room', {
        roomType,
        nickname: options.nickname,
      }, (response) => {
        if (response.success) {
          resolve({ roomId: response.roomId, roomType: response.roomType || roomType });
        } else {
          reject(new Error(response.error || 'Failed to create room'));
        }
      });
    });
  }, []);

  const joinRoom = useCallback((payload) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) return reject(new Error('Socket not connected'));

      const emitPayload = typeof payload === 'string'
        ? payload
        : payload;

      socketRef.current.emit('join-room', emitPayload, (response) => {
        if (response.success) {
          resolve({
            roomId: response.roomId,
            roomType: response.roomType || 'direct',
          });
        } else {
          reject(new Error(response.error || 'Failed to join room'));
        }
      });
    });
  }, []);

  const sendSignal = useCallback((to, signal) => {
    socketRef.current?.emit('signal', { to, signal });
  }, []);

  const sendClipboard = useCallback((roomId, encryptedText) => {
    socketRef.current?.emit('clipboard', { roomId, encryptedText });
  }, []);

  const on = useCallback((event, handler) => {
    socketRef.current?.on(event, handler);
  }, []);

  const off = useCallback((event, handler) => {
    socketRef.current?.off(event, handler);
  }, []);

  const emit = useCallback((event, data) => {
    socketRef.current?.emit(event, data);
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
    emit,
    socketId: socketRef.current?.id,
  };
}
