import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineX } from 'react-icons/hi';

export default function FileLightbox({ file, onClose }) {
  if (!file) return null;

  const isImage = file.type?.startsWith('image/') || file.mimeType?.startsWith('image/');
  const isVideo = file.type?.startsWith('video/') || file.mimeType?.startsWith('video/');
  const src = file.url || file.previewUrl;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10001] bg-black/90 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-3 rounded-full glass-panel text-white/80 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center z-10"
          aria-label="Close preview"
        >
          <HiOutlineX className="w-6 h-6" />
        </button>

        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="max-w-full max-h-full"
          onClick={(e) => e.stopPropagation()}
        >
          {isImage && src && (
            <img src={src} alt={file.name} className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg" />
          )}
          {isVideo && src && (
            <video src={src} controls className="max-w-[90vw] max-h-[85vh] rounded-lg" />
          )}
          {!isImage && !isVideo && (
            <p className="text-white/60">Preview not available for this file type</p>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
