import { motion, AnimatePresence } from 'framer-motion';
import { CONNECTION_STATES } from '../utils/constants';

const stateConfig = {
  [CONNECTION_STATES.WAITING]: {
    label: 'Awaiting Connection...',
    icon: '🎋',
    color: 'text-text-secondary',
    bgColor: 'bg-white/40',
    borderColor: 'border-mint-subtle/50',
    pulse: true,
  },
  [CONNECTION_STATES.CONNECTING]: {
    label: 'Forming Connection...',
    icon: '⚔️',
    color: 'text-warning',
    bgColor: 'bg-warning/5',
    borderColor: 'border-warning/30',
    pulse: true,
  },
  [CONNECTION_STATES.CONNECTED]: {
    label: 'Total Concentration',
    icon: '🌊',
    color: 'text-mint-primary',
    bgColor: 'bg-mint-subtle/30',
    borderColor: 'border-mint-primary/50',
    pulse: false,
    animateTotalConcentration: true,
  },
  [CONNECTION_STATES.DISCONNECTED]: {
    label: 'Link Severed',
    icon: '⚠️',
    color: 'text-crimson-primary',
    bgColor: 'bg-crimson-subtle/30',
    borderColor: 'border-crimson-primary/30',
    pulse: false,
  },
  [CONNECTION_STATES.ERROR]: {
    label: 'Connection Error',
    icon: '❌',
    color: 'text-crimson-primary',
    bgColor: 'bg-crimson-subtle/30',
    borderColor: 'border-crimson-primary/30',
    pulse: false,
  },
};

export default function ConnectionStatus({ status, isP2P, onRetry }) {
  const config = stateConfig[status] || stateConfig[CONNECTION_STATES.WAITING];

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.4, type: 'spring' }}
        className={`inline-flex items-center gap-3 px-5 py-2.5 rounded-full border border-2 ${config.bgColor} ${config.borderColor} backdrop-blur-md shadow-sm ${config.animateTotalConcentration ? 'animate-total-concentration' : ''}`}
      >
        {/* Status dot */}
        <div className="relative flex items-center justify-center">
          <span className="text-xl drop-shadow-sm">{config.icon}</span>
          {config.pulse && (
            <motion.span
              className="absolute inset-0 rounded-full bg-mint-primary/20 blur-sm"
              animate={{ scale: [1, 1.8, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
        </div>

        <span className={`text-sm font-anime font-bold uppercase tracking-widest ${config.color} drop-shadow-sm`}>
          {config.label}
        </span>

        {status === CONNECTION_STATES.CONNECTED && (
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-xs font-anime font-semibold px-2.5 py-1 rounded-md bg-white border border-mint-primary/30 text-mint-primary shadow-sm"
          >
            {isP2P ? 'P2P 🗡️' : 'RELAY ✉️'}
          </motion.span>
        )}

        {status === CONNECTION_STATES.ERROR && (
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={handleRetry}
            className="text-xs font-anime font-semibold px-2.5 py-1 rounded-md bg-white border border-crimson-primary/30 text-crimson-primary shadow-sm hover:bg-crimson-primary/10 transition-colors"
          >
            Retry 🔄
          </motion.button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
