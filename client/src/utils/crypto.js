import CryptoJS from 'crypto-js';
import { ENCRYPTION_SALT } from './constants';

/**
 * Derive an encryption key from the Room ID.
 */
function deriveKey(roomId) {
  return CryptoJS.PBKDF2(roomId, ENCRYPTION_SALT, {
    keySize: 256 / 32,
    iterations: 100,
  }).toString();
}

/**
 * Encrypt data (object or string) for signaling channel.
 */
export function encryptData(data, roomId) {
  try {
    const key = deriveKey(roomId);
    const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
    return CryptoJS.AES.encrypt(plaintext, key).toString();
  } catch (err) {
    return null;
  }
}

/**
 * Decrypt data received from signaling channel.
 */
export function decryptData(ciphertext, roomId) {
  try {
    const key = deriveKey(roomId);
    const bytes = CryptoJS.AES.decrypt(ciphertext, key);
    const plaintext = bytes.toString(CryptoJS.enc.Utf8);
    
    // Try to parse as JSON, fallback to string
    try {
      return JSON.parse(plaintext);
    } catch {
      return plaintext;
    }
  } catch (err) {
    return null;
  }
}

/**
 * Encrypt clipboard text.
 */
export function encryptClipboard(text, roomId) {
  return encryptData(text, roomId);
}

/**
 * Decrypt clipboard text.
 */
export function decryptClipboard(ciphertext, roomId) {
  return decryptData(ciphertext, roomId);
}
