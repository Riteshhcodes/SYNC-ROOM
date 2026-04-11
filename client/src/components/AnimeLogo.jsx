import { motion } from 'framer-motion';

export default function AnimeLogo({ size = 'large' }) {
  const sizeClasses = {
    small: 'text-xl md:text-2xl',
    medium: 'text-2xl md:text-4xl',
    large: 'text-4xl md:text-6xl',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 1.2, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center gap-1 relative"
    >
      {/* Decorative Sword Slash Backing */}
      {size === 'large' && (
        <motion.div
          className="absolute w-[120%] h-4 bg-gradient-to-r from-transparent via-mint-subtle to-transparent -rotate-2 opacity-50 blur-sm pointer-events-none"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.5, ease: 'easeOut' }}
        />
      )}

      <div className="flex items-center gap-3 z-10">
        <motion.span
          className={`${sizeClasses[size]} font-japanese font-black text-mint-primary opacity-80`}
          animate={{ opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          壱
        </motion.span>

        <h1
          className={`anime-title ${sizeClasses[size]} tracking-[0.2em] relative`}
        >
          SYNC_ROOM
        </h1>

        <motion.span
          className={`${sizeClasses[size]} font-japanese font-black text-crimson-primary opacity-80`}
          animate={{ opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
        >
          弐
        </motion.span>
      </div>

      {size === 'large' && (
        <motion.p
          className="text-xs md:text-sm font-anime font-semibold text-text-secondary tracking-[0.4em] uppercase mt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
        >
          Total Concentration Transfer
        </motion.p>
      )}
    </motion.div>
  );
}
