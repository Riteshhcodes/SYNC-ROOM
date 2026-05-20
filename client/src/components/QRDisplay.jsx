import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'framer-motion';

export default function QRDisplay({ value, size = 200 }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, type: 'spring', stiffness: 120 }}
      className="flex flex-col items-center gap-4"
    >
      <motion.div
        animate={{
          boxShadow: [
            '0 0 15px rgba(0, 245, 212, 0.15)',
            '0 0 30px rgba(0, 245, 212, 0.35)',
            '0 0 15px rgba(0, 245, 212, 0.15)',
          ],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="p-1 rounded-2xl border-2 border-[#00f5d4]/30 glass-panel"
      >
        <div className="bg-[#0a0a0f] p-5 rounded-xl">
          <QRCodeSVG
            value={value}
            size={size}
            bgColor="#0a0a0f"
            fgColor="#00f5d4"
            level="H"
            includeMargin={false}
          />
        </div>
      </motion.div>

      <p className="text-xs text-white/40 text-center max-w-[220px]">
        Scan with your mobile camera to join this room
      </p>
    </motion.div>
  );
}
