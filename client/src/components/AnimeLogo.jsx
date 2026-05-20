import { motion } from 'framer-motion';

export default function AnimeLogo({ size = 'large' }) {
  const sizeClasses = {
    small: 'text-xl md:text-2xl',
    medium: 'text-2xl md:text-4xl',
    large: 'text-5xl md:text-7xl',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 1.2, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center gap-1 relative"
    >
      <div className="text-center mb-0">
        <h1
          className={`${sizeClasses[size]} font-black tracking-tight`}
          style={{
            background: 'linear-gradient(135deg, #00f5d4 0%, #667eea 50%, #ff6b35 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 0 30px rgba(0, 245, 212, 0.3))',
          }}
        >
          SYNC_ROOM
        </h1>
        {size === 'large' && (
          <motion.p
            className="text-sm tracking-[0.3em] text-white/40 mt-2 uppercase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            Total Concentration Transfer
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}
