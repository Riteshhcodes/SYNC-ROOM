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
      {/* Mint-glow border container */}
      <motion.div
        animate={{
          boxShadow: [
            '0 0 15px rgba(20, 184, 166, 0.15), inset 0 0 8px rgba(20, 184, 166, 0.05)',
            '0 0 30px rgba(20, 184, 166, 0.3), inset 0 0 15px rgba(20, 184, 166, 0.1)',
            '0 0 15px rgba(20, 184, 166, 0.15), inset 0 0 8px rgba(20, 184, 166, 0.05)',
          ],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="p-1 rounded-2xl border-2 border-mint-primary/30 bg-white/60 backdrop-blur-md"
      >
        <div className="bg-white p-5 rounded-xl shadow-sm">
          <QRCodeSVG
            value={value}
            size={size}
            bgColor="#FFFFFF"
            fgColor="#0f766e"
            level="H"
            includeMargin={false}
            imageSettings={{
              src: '',
              height: 0,
              width: 0,
              excavate: false,
            }}
          />
        </div>
      </motion.div>

      {/* Scan instruction */}
      <motion.p
        className="text-xs font-anime font-semibold text-mint-primary tracking-wider uppercase"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        ▸ Scan with Kasugai Crow ◂
      </motion.p>
    </motion.div>
  );
}
