import { motion } from 'framer-motion';
import { formatBytes, formatSpeed, formatTime } from '../utils/fileUtils';
import { TRANSFER_STATES } from '../utils/constants';

export default function ProgressBar({ progress, speed, timeRemaining, transferState, currentFile }) {
  if (transferState === TRANSFER_STATES.IDLE) return null;

  const isComplete = transferState === TRANSFER_STATES.COMPLETE;
  const isError = transferState === TRANSFER_STATES.ERROR;
  const isSending = transferState === TRANSFER_STATES.SENDING;

  // Sound Effect Hook-up (Logic placeholder)
  // Normally you'd trigger this via useEffect when isComplete becomes true
  // const playCrowSound = () => new Audio('/crow.mp3').play().catch(()=>{});

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: -20, height: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="glass-card p-5 space-y-4 shadow-anime relative overflow-hidden"
    >
      {/* Absolute floating mist/birds for completion */}
      {isComplete && (
        <motion.div
          className="absolute inset-0 pointer-events-none z-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="absolute top-2 w-4 h-4 bg-black/20 clip-path-polygon-[50%_0%,0%_100%,100%_100%] animate-fly-crow flex items-center justify-center text-[10px]">🐦‍⬛</div>
        </motion.div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <motion.span
            animate={!isComplete && !isError ? { rotate: [0, 10, -10, 0] } : {}}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="text-2xl drop-shadow-md"
          >
            {isComplete ? '🌸' : isError ? '💔' : isSending ? '🌊' : '💧'}
          </motion.span>
          <span className="text-sm font-anime font-semibold text-text-primary uppercase tracking-wider">
            {isComplete ? 'Transfer Complete' : isError ? 'Transfer Failed' : isSending ? 'Water Breathing: First Form...' : 'Receiving...'}
          </span>
        </div>
        <span className={`text-xl font-anime font-black drop-shadow-sm ${isComplete ? 'text-mint-primary' : isError ? 'text-crimson-primary' : 'text-mint-primary'}`}>
          {progress}%
        </span>
      </div>

      {/* File info */}
      {currentFile && (
        <div className="flex items-center justify-between text-xs font-mono text-text-secondary relative z-10">
          <span className="truncate max-w-[200px] font-medium">
            {currentFile.name}
          </span>
          <span className="font-medium bg-white/50 px-2 py-0.5 rounded-full">{formatBytes(currentFile.size)}</span>
        </div>
      )}

      {/* Progress bar - Water Breathing Style */}
      <div className="water-breathing-bar h-4 relative z-10">
        <div
          className={`water-breathing-fill ${isError ? '!bg-crimson-primary' : ''}`}
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      {/* Stats */}
      {!isComplete && !isError && (
        <div className="flex items-center justify-between text-xs font-mono text-text-secondary bg-white/40 px-3 py-2 rounded-lg relative z-10">
          <span className="flex items-center gap-1">⚡ <strong>{formatSpeed(speed)}</strong></span>
          <span className="flex items-center gap-1">⏱ <strong>{formatTime(timeRemaining)}</strong></span>
          {currentFile?.total > 1 && (
            <span className="flex items-center gap-1">
              📦 <strong>{currentFile.index + 1}/{currentFile.total}</strong>
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}
