import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { encryptClipboard } from '../utils/crypto';
import { HiOutlinePaperAirplane, HiOutlineClipboardCopy } from 'react-icons/hi';

export default function ClipboardShare({ roomId, onSend, messages }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = useCallback(() => {
    if (!text.trim() || !roomId || sending) return;

    setSending(true);
    const encrypted = encryptClipboard(text.trim(), roomId);
    if (encrypted) {
      onSend(roomId, encrypted);
      setText('');
    }
    setTimeout(() => setSending(false), 300);
  }, [text, roomId, onSend, sending]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const copyToClipboard = useCallback((text) => {
    navigator.clipboard?.writeText(text);
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-anime font-semibold text-text-secondary uppercase tracking-wider">
        <span>📜</span>
        <span>Kasugai Crow Messenger</span>
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Send a message via Kasugai Crow..."
          rows={2}
          className="anime-input resize-none text-sm flex-1"
          id="clipboard-share-input"
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className={`anime-button px-4 rounded-lg self-end flex items-center justify-center ${
            !text.trim() || sending ? 'opacity-40 cursor-not-allowed' : ''
          }`}
        >
          <HiOutlinePaperAirplane className="w-5 h-5 rotate-90" />
        </motion.button>
      </div>

      {/* Messages History */}
      <AnimatePresence>
        {messages && messages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-2 max-h-40 overflow-y-auto"
          >
            {messages.slice(-5).reverse().map((msg, i) => (
              <motion.div
                key={msg.timestamp}
                initial={{ opacity: 0, x: msg.direction === 'received' ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`flex items-start gap-2 p-2.5 rounded-lg text-sm font-japanese ${
                  msg.direction === 'received'
                    ? 'bg-mint-subtle/30 border border-mint-primary/20 shadow-sm'
                    : 'bg-white border border-glass-border shadow-sm'
                }`}
              >
                <span className="flex-shrink-0 mt-0.5">
                  {msg.direction === 'received' ? '📥' : '📤'}
                </span>
                <p className="flex-1 text-text-primary break-all whitespace-pre-wrap">
                  {msg.text}
                </p>
                {msg.direction === 'received' && (
                  <button
                    onClick={() => copyToClipboard(msg.text)}
                    className="flex-shrink-0 p-1 text-text-muted hover:text-mint-primary transition-colors"
                    title="Copy"
                  >
                    <HiOutlineClipboardCopy className="w-4 h-4" />
                  </button>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
