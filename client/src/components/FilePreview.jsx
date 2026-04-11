import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatBytes, getFileCategory, getFileIcon, truncateFilename } from '../utils/fileUtils';
import { HiOutlineDownload, HiOutlineEye, HiOutlineX } from 'react-icons/hi';

export default function FilePreview({ files, onDownload, onDownloadServer, roomId }) {
  const [previewFile, setPreviewFile] = useState(null);

  if (!files || files.length === 0) return null;

  const handleDownload = (file) => {
    if (file.url) {
      onDownload(file);
    } else if (file.id && roomId) {
      onDownloadServer(roomId, file.id, file.originalName || file.name);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-mono text-text-secondary">
        <span>📦</span>
        <span>Received Files ({files.length})</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <AnimatePresence>
          {files.map((file, index) => {
            const category = getFileCategory(file.mimeType || file.mimetype || '');
            const fileName = file.name || file.originalName;
            const fileSize = file.size;

            return (
              <motion.div
                key={file.id || index}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.1, type: 'spring', stiffness: 150 }}
                className="glass-card-hover p-3 space-y-3"
              >
                {/* Preview */}
                {category === 'image' && file.url && (
                  <div
                    className="relative rounded-lg overflow-hidden cursor-pointer group"
                    onClick={() => setPreviewFile(file)}
                  >
                    <img
                      src={file.url}
                      alt={fileName}
                      className="w-full h-36 object-cover rounded-lg transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <HiOutlineEye className="w-8 h-8 text-mint-primary drop-shadow-[0_0_10px_rgba(20,184,166,0.8)]" />
                    </div>
                  </div>
                )}

                {category === 'video' && file.url && (
                  <div className="rounded-lg overflow-hidden">
                    <video
                      src={file.url}
                      controls
                      className="w-full h-36 object-cover rounded-lg bg-black"
                      preload="metadata"
                    />
                  </div>
                )}

                {category === 'audio' && file.url && (
                  <div className="p-3 bg-bg-elevated rounded-lg">
                    <audio src={file.url} controls className="w-full h-8" preload="metadata" />
                  </div>
                )}

                {!['image', 'video', 'audio'].includes(category) && (
                  <div className="flex items-center justify-center h-24 bg-bg-elevated rounded-lg">
                    <span className="text-4xl">{getFileIcon(file.mimeType || file.mimetype || '')}</span>
                  </div>
                )}

                {/* File Info */}
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-mono text-text-primary truncate">
                      {truncateFilename(fileName, 25)}
                    </p>
                    <p className="text-xs font-mono text-text-muted">
                      {formatBytes(fileSize)}
                    </p>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleDownload(file)}
                    className="p-2 rounded-lg bg-mint-subtle/50 text-mint-primary border border-mint-primary/30 hover:bg-mint-subtle transition-colors shadow-sm"
                    aria-label={`Download ${fileName}`}
                  >
                    <HiOutlineDownload className="w-5 h-5" />
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Full Preview Modal */}
      <AnimatePresence>
        {previewFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setPreviewFile(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative max-w-4xl max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setPreviewFile(null)}
                className="absolute -top-3 -right-3 z-10 p-2 bg-bg-dark rounded-full border border-glass-border text-text-primary hover:text-danger transition-colors"
              >
                <HiOutlineX className="w-5 h-5" />
              </button>
              <img
                src={previewFile.url}
                alt={previewFile.name}
                className="max-w-full max-h-[85vh] object-contain rounded-xl border border-glass-border"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
