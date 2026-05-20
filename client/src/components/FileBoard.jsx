import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatBytes, getFileIcon, truncateFilename } from '../utils/fileUtils';
import { HiOutlineDownload, HiOutlineEye } from 'react-icons/hi';

function fileEmoji(type) {
  if (!type) return '📄';
  if (type.startsWith('image/')) return '📷';
  if (type.startsWith('video/')) return '🎥';
  if (type.startsWith('audio/')) return '🎵';
  return getFileIcon(type) || '📄';
}

export default function FileBoard({
  files = [],
  onRequestFile,
  onPreview,
  transferProgress = {},
}) {
  const [newIds, setNewIds] = useState(new Set());

  useEffect(() => {
    if (files.length === 0) return;
    const latest = files[files.length - 1];
    if (latest?.fileId) {
      setNewIds((prev) => new Set([...prev, latest.fileId]));
      const t = setTimeout(() => {
        setNewIds((prev) => {
          const next = new Set(prev);
          next.delete(latest.fileId);
          return next;
        });
      }, 3000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [files.length, files]);

  return (
    <div className="glass-panel p-4 h-full min-h-[200px]">
      <h3 className="text-xs tracking-widest text-[#00f5d4] mb-4 uppercase flex items-center gap-2">
        <span>📁</span> File Board
      </h3>

      {files.length === 0 ? (
        <p className="text-sm text-white/40 text-center py-8">No files shared yet</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
          <AnimatePresence>
            {files.map((file) => {
              const progress = transferProgress[file.fileId];
              const isNew = newIds.has(file.fileId);
              const isImage = file.type?.startsWith('image/');
              const isVideo = file.type?.startsWith('video/');

              return (
                <motion.div
                  key={file.fileId}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-panel !rounded-xl p-3 relative"
                >
                  {isNew && (
                    <span className="absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#ff6b35] text-white">
                      NEW
                    </span>
                  )}
                  <div className="text-2xl mb-2">{fileEmoji(file.type)}</div>
                  <p className="text-sm font-semibold text-white/90 truncate" title={file.name}>
                    {truncateFilename(file.name, 28)}
                  </p>
                  <p className="text-xs text-white/40 mt-0.5">{formatBytes(file.size)}</p>
                  <p className="text-xs text-[#667eea] mt-1 truncate">by {file.senderNickname}</p>

                  {progress != null && progress < 100 && (
                    <div className="mt-2">
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#00f5d4] to-[#667eea] transition-all shadow-[0_0_8px_rgba(0,245,212,0.5)]"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-white/40 mt-1">{progress}%</p>
                    </div>
                  )}

                  <div className="flex gap-2 mt-3">
                    {(isImage || isVideo) && onPreview && (
                      <button
                        type="button"
                        onClick={() => onPreview(file)}
                        className="anime-button flex-1 py-2 text-xs min-h-[44px] flex items-center justify-center gap-1"
                      >
                        <HiOutlineEye className="w-4 h-4" />
                        Preview
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onRequestFile?.(file)}
                      className="anime-button flex-1 py-2 text-xs min-h-[44px] flex items-center justify-center gap-1"
                    >
                      <HiOutlineDownload className="w-4 h-4" />
                      Get
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
