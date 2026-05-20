import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getRandomNickname, getStoredNickname } from '../utils/nicknames';

export default function NicknameModal({ open, onSubmit, title = 'Enter Your Slayer Name' }) {
  const [nickname, setNickname] = useState(() => getStoredNickname() || getRandomNickname());
  const placeholder = getRandomNickname();

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass-panel p-8 w-full max-w-md"
        >
          <h2 className="text-xl font-black text-white/90 mb-2">{title}</h2>
          <p className="text-sm text-white/50 mb-6">Shown to other warriors in the room (max 20 chars)</p>

          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value.slice(0, 20))}
            onKeyDown={(e) => e.key === 'Enter' && nickname.trim() && onSubmit(nickname.trim())}
            placeholder={placeholder}
            maxLength={20}
            className="anime-input mb-6"
            autoFocus
          />

          <div className="flex flex-wrap gap-2 mb-6">
            {[getRandomNickname(), getRandomNickname()].map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setNickname(name)}
                className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/50 hover:border-[#00f5d4]/40 hover:text-[#00f5d4] transition-colors min-h-[44px]"
              >
                {name}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => nickname.trim() && onSubmit(nickname.trim())}
            disabled={!nickname.trim()}
            className="anime-button-solid w-full py-3 rounded-xl disabled:opacity-40"
          >
            Enter the Room
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
