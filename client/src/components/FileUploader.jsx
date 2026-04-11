import { useState, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatBytes, getFileIcon, truncateFilename } from '../utils/fileUtils';
import { MAX_P2P_FILE_SIZE } from '../utils/constants';
import { HiOutlineCloudUpload, HiOutlineX, HiOutlinePaperAirplane, HiOutlineTrash, HiOutlineExclamation } from 'react-icons/hi';

export default function FileUploader({ onSendFiles, disabled }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [thumbnails, setThumbnails] = useState({});
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  // Generate thumbnail for image files
  const generateThumbnail = useCallback((file) => {
    if (!file.type.startsWith('image/')) return;
    const key = `${file.name}-${file.size}`;
    const reader = new FileReader();
    reader.onload = (e) => {
      setThumbnails((prev) => ({ ...prev, [key]: e.target.result }));
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFiles = useCallback((fileList) => {
    const files = Array.from(fileList);
    setSelectedFiles((prev) => {
      const existing = new Set(prev.map((f) => `${f.name}-${f.size}`));
      const newFiles = files.filter((f) => !existing.has(`${f.name}-${f.size}`));
      // Generate thumbnails for new image files
      newFiles.forEach(generateThumbnail);
      return [...prev, ...newFiles];
    });
  }, [generateThumbnail]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback((e) => {
    if (e.target.files.length) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  const removeFile = useCallback((index) => {
    setSelectedFiles((prev) => {
      const file = prev[index];
      if (file) {
        const key = `${file.name}-${file.size}`;
        setThumbnails((t) => {
          const next = { ...t };
          delete next[key];
          return next;
        });
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const clearAllFiles = useCallback(() => {
    setSelectedFiles([]);
    setThumbnails({});
  }, []);

  const handleSend = useCallback(async () => {
    if (selectedFiles.length === 0 || isSending) return;

    setIsSending(true);
    try {
      await onSendFiles(selectedFiles);
      setSelectedFiles([]);
      setThumbnails({});
    } catch (err) {
      // Error handled by parent or context
    } finally {
      setIsSending(false);
    }
  }, [selectedFiles, onSendFiles, isSending]);

  const totalSize = useMemo(
    () => selectedFiles.reduce((sum, f) => sum + f.size, 0),
    [selectedFiles]
  );
  const exceedsP2PLimit = totalSize > MAX_P2P_FILE_SIZE;

  // Animation variants
  const fileItemVariants = {
    hidden: { opacity: 0, x: -24, scale: 0.95 },
    visible: (i) => ({
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        delay: i * 0.06,
        type: 'spring',
        stiffness: 260,
        damping: 20,
      },
    }),
    exit: {
      opacity: 0,
      x: 30,
      scale: 0.9,
      transition: { duration: 0.2 },
    },
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <motion.div
        ref={dropZoneRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        animate={isDragOver ? { scale: 1.02 } : { scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className={`drop-zone p-8 text-center cursor-pointer transition-all duration-300 ${
          isDragOver ? 'drag-over' : ''
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleInputChange}
          className="hidden"
          id="file-upload-input"
        />

        <motion.div
          animate={isDragOver ? { y: -8 } : { y: 0 }}
          className="flex flex-col items-center gap-3"
        >
          <motion.div
            animate={isDragOver
              ? { y: [0, -12, 0], rotate: [0, 10, -10, 0] }
              : { y: [0, -8, 0] }
            }
            transition={isDragOver
              ? { duration: 0.6, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 2, repeat: Infinity, ease: 'easeInOut' }
            }
          >
            {isDragOver ? (
              <span className="text-4xl drop-shadow-md">🌸</span>
            ) : (
              <HiOutlineCloudUpload className="w-12 h-12 text-mint-primary opacity-60" />
            )}
          </motion.div>

          <div>
            <p className="text-sm font-mono text-text-primary">
              {isDragOver ? '✨ Drop files here ✨' : 'Tap to select files'}
            </p>
            <p className="text-xs font-mono text-text-muted mt-1">
              or drag & drop • Images, Videos, Docs, Text
            </p>
          </div>
        </motion.div>
      </motion.div>

      {/* Selected Files List */}
      <AnimatePresence>
        {selectedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            {/* Header: count + size + Clear All */}
            <div className="flex items-center justify-between text-xs font-mono text-text-secondary px-1">
              <motion.span
                key={selectedFiles.length}
                initial={{ scale: 1.3, color: '#14b8a6' }}
                animate={{ scale: 1, color: '#475569' }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
              </motion.span>

              <div className="flex items-center gap-3">
                <span className={exceedsP2PLimit ? 'text-warning font-bold' : ''}>
                  {formatBytes(totalSize)}
                </span>
                {selectedFiles.length > 1 && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={clearAllFiles}
                    className="flex items-center gap-1 text-text-muted hover:text-danger transition-colors"
                    title="Clear all files"
                  >
                    <HiOutlineTrash className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </motion.button>
                )}
              </div>
            </div>

            {/* P2P Size Warning */}
            <AnimatePresence>
              {exceedsP2PLimit && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-warning/10 border border-warning/30 text-xs font-mono text-warning"
                >
                  <HiOutlineExclamation className="w-4 h-4 flex-shrink-0" />
                  <span>
                    Total exceeds 500MB — will use server relay instead of direct P2P
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* File items */}
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              <AnimatePresence>
                {selectedFiles.map((file, index) => {
                  const thumbKey = `${file.name}-${file.size}`;
                  const thumb = thumbnails[thumbKey];

                  return (
                    <motion.div
                      key={`${file.name}-${file.size}-${index}`}
                      custom={index}
                      variants={fileItemVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      layout
                      className="flex items-center gap-3 px-3 py-2 bg-bg-elevated rounded-lg border border-glass-border group hover:border-mint-primary/30 transition-colors"
                    >
                      {/* Thumbnail or Icon */}
                      {thumb ? (
                        <div className="w-9 h-9 rounded-md overflow-hidden flex-shrink-0 border border-glass-border shadow-sm">
                          <img
                            src={thumb}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <span className="text-lg flex-shrink-0 w-9 text-center">{getFileIcon(file.type)}</span>
                      )}

                      {/* File info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono text-text-primary truncate">
                          {truncateFilename(file.name)}
                        </p>
                        <p className="text-xs font-mono text-text-muted">
                          {formatBytes(file.size)}
                        </p>
                      </div>

                      {/* Remove button — always visible, subtle */}
                      <motion.button
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.85 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(index);
                        }}
                        className="p-1.5 rounded-md text-text-muted hover:text-danger hover:bg-danger/10 transition-colors flex-shrink-0"
                        aria-label={`Remove ${file.name}`}
                      >
                        <HiOutlineX className="w-4 h-4" />
                      </motion.button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Send Button */}
            <motion.button
              onClick={handleSend}
              disabled={disabled || isSending}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full anime-button-solid flex items-center justify-center gap-2 py-3.5 rounded-xl font-anime font-bold text-sm 
                ${(disabled || isSending) ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
            >
              {isSending ? (
                <>
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    🌸
                  </motion.span>
                  Total Concentration...
                </>
              ) : (
                <>
                  <HiOutlinePaperAirplane className="w-5 h-5 rotate-90" />
                  Send {selectedFiles.length} File{selectedFiles.length > 1 ? 's' : ''} 🗡️
                </>
              )}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
