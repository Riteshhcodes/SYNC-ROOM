import { motion, AnimatePresence } from 'framer-motion';
import { CONNECTION_STATES } from '../utils/constants';
import GhostLoader from './GhostLoader';

const stateConfig = {
  [CONNECTION_STATES.WAITING]: {
    label: 'AWAITING CONNECTION...',
    useGhost: true,
    color: 'text-white/50',
    bgColor: 'bg-white/5',
    borderColor: 'border-white/10',
    pulse: true,
  },
  [CONNECTION_STATES.CONNECTING]: {
    label: 'FORMING CONNECTION...',
    icon: '⚔️',
    color: 'text-warning',
    bgColor: 'bg-warning/5',
    borderColor: 'border-warning/30',
    pulse: true,
  },
  [CONNECTION_STATES.CONNECTED]: {
    label: 'Total Concentration',
    icon: '🌊',
    color: 'text-[#00f5d4]',
    bgColor: 'bg-[#00f5d4]/10',
    borderColor: 'border-[#00f5d4]/40',
    pulse: false,
    animateTotalConcentration: true,
  },
  [CONNECTION_STATES.DISCONNECTED]: {
    label: 'Link Severed',
    icon: '⚠️',
    color: 'text-danger',
    bgColor: 'bg-danger/10',
    borderColor: 'border-danger/30',
    pulse: false,
  },
  [CONNECTION_STATES.ERROR]: {
    label: 'Connection Error',
    icon: '❌',
    color: 'text-danger',
    bgColor: 'bg-danger/10',
    borderColor: 'border-danger/30',
    pulse: false,
  },
};

export default function ConnectionStatus({ status, isP2P }) {
  const config = stateConfig[status] || stateConfig[CONNECTION_STATES.WAITING];

  if (config.useGhost) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={status}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
        >
          <GhostLoader label={config.label} />
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.4, type: 'spring' }}
        className={`inline-flex items-center gap-3 px-5 py-2.5 rounded-full border ${config.bgColor} ${config.borderColor} backdrop-blur-md ${config.animateTotalConcentration ? 'animate-total-concentration' : ''}`}
      >
        <div className="relative flex items-center justify-center">
          <span className="text-xl">{config.icon}</span>
          {config.pulse && (
            <motion.span
              className="absolute inset-0 rounded-full bg-[#00f5d4]/20 blur-sm"
              animate={{ scale: [1, 1.8, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
        </div>

        <span className={`text-sm font-bold uppercase tracking-widest ${config.color}`}>
          {config.label}
        </span>

        {status === CONNECTION_STATES.CONNECTED && (
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-xs font-semibold px-2.5 py-1 rounded-md bg-white/5 border border-[#00f5d4]/30 text-[#00f5d4]"
          >
            {isP2P ? 'P2P 🗡️' : 'RELAY ✉️'}
          </motion.span>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
