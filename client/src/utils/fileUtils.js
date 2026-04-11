import { FILE_CATEGORIES } from './constants';

/**
 * Detect the category of a file by its MIME type.
 */
export function getFileCategory(mimeType) {
  for (const [category, types] of Object.entries(FILE_CATEGORIES)) {
    if (types.includes(mimeType)) return category;
  }
  return 'other';
}

/**
 * Format bytes to human-readable string.
 */
export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * Format seconds to human-readable time.
 */
export function formatTime(seconds) {
  if (!seconds || seconds === Infinity) return '--:--';
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.ceil(seconds % 60);
  return `${mins}m ${secs}s`;
}

/**
 * Format transfer speed.
 */
export function formatSpeed(bytesPerSecond) {
  if (!bytesPerSecond) return '0 B/s';
  return `${formatBytes(bytesPerSecond)}/s`;
}

/**
 * Get file extension from name.
 */
export function getFileExtension(filename) {
  return filename.split('.').pop()?.toLowerCase() || '';
}

/**
 * Get icon name for file category.
 */
export function getFileIcon(mimeType) {
  const category = getFileCategory(mimeType);
  const icons = {
    image: '🖼️',
    video: '🎬',
    audio: '🎵',
    document: '📜',   // Scroll for documents
    text: '📝',
    archive: '🎴',    // Hanafuda cards for archive
    other: '📎',
  };
  return icons[category] || '📎';
}

/**
 * Check if file type supports preview.
 */
export function canPreview(mimeType) {
  const category = getFileCategory(mimeType);
  return category === 'image' || category === 'video' || category === 'audio';
}

/**
 * Create object URL for file preview.
 */
export function createPreviewUrl(file) {
  if (file instanceof Blob) {
    return URL.createObjectURL(file);
  }
  return null;
}

/**
 * Revoke object URL to free memory.
 */
export function revokePreviewUrl(url) {
  if (url) {
    URL.revokeObjectURL(url);
  }
}

/**
 * Truncate filename for display.
 */
export function truncateFilename(name, maxLen = 30) {
  if (name.length <= maxLen) return name;
  const ext = getFileExtension(name);
  const base = name.slice(0, name.length - ext.length - 1);
  const truncated = base.slice(0, maxLen - ext.length - 4);
  return `${truncated}...${ext ? `.${ext}` : ''}`;
}
