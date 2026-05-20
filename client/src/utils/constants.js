// ─── Server Configuration ─────────────────────────────────
export const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

// ─── WebRTC Configuration ─────────────────────────────────
export const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

// ─── File Transfer ────────────────────────────────────────
export const CHUNK_SIZE = 64 * 1024; // 64KB chunks
export const MAX_P2P_FILE_SIZE = 500 * 1024 * 1024; // 500MB
export const MAX_SERVER_FILE_SIZE = 100 * 1024 * 1024; // 100MB
export const BUFFERED_AMOUNT_LOW_THRESHOLD = 256 * 1024; // 256KB

// ─── Room ID ──────────────────────────────────────────────
export function generateRoomUrl(roomId) {
  const base = import.meta.env.VITE_CLIENT_URL || window.location.origin;
  return `${base}/room/${roomId}`;
}

// ─── File Types ───────────────────────────────────────────
export const FILE_CATEGORIES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp'],
  video: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/avi'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/aac'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ],
  text: ['text/plain', 'text/html', 'text/css', 'text/javascript', 'application/json', 'text/markdown'],
  archive: ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed', 'application/gzip'],
};

// ─── Encryption Key ───────────────────────────────────────
export const ENCRYPTION_SALT = 'SYNC_ROOM_E2E_2024';

// ─── Connection States ────────────────────────────────────
export const ROOM_TYPES = {
  DIRECT: 'direct',
  GROUP: 'group',
};

export const CONNECTION_STATES = {
  WAITING: 'waiting',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
};

// ─── Transfer States ─────────────────────────────────────
export const TRANSFER_STATES = {
  IDLE: 'idle',
  SENDING: 'sending',
  RECEIVING: 'receiving',
  COMPLETE: 'complete',
  ERROR: 'error',
};
