import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlinePaperAirplane } from 'react-icons/hi';

const MAX_LEN = 500;

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function GroupChat({
  messages = [],
  onSend,
  onTypingStart,
  onTypingStop,
  typingUsers = [],
  myId,
}) {
  const [text, setText] = useState('');
  const bottomRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
    onTypingStop?.();
  }, [text, onSend, onTypingStop]);

  const handleChange = (e) => {
    const val = e.target.value.slice(0, MAX_LEN);
    setText(val);
    onTypingStart?.();
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => onTypingStop?.(), 1500);
  };

  const othersTyping = typingUsers.filter((t) => t.socketId !== myId);

  return (
    <div className="glass-panel flex flex-col h-full min-h-[280px] md:min-h-[360px]">
      <h3 className="text-xs tracking-widest text-[#667eea] px-4 pt-4 pb-2 uppercase flex items-center gap-2">
        <span>💬</span> Group Chat
      </h3>

      <div className="flex-1 overflow-y-auto px-4 space-y-2 min-h-0">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-sm rounded-lg px-3 py-2 ${
                msg.type === 'system'
                  ? 'bg-white/5 text-white/40 text-center italic text-xs'
                  : msg.senderId === myId
                    ? 'bg-[#00f5d4]/10 border border-[#00f5d4]/20 ml-8'
                    : 'bg-white/5 border border-white/10 mr-8'
              }`}
            >
              {msg.type !== 'system' && (
                <div className="flex items-baseline justify-between gap-2 mb-0.5">
                  <span className="font-semibold text-[#00f5d4] text-xs">{msg.senderNickname}</span>
                  <span className="text-[10px] text-white/30">{formatTime(msg.timestamp)}</span>
                </div>
              )}
              <p className="text-white/85 break-words whitespace-pre-wrap">{msg.text}</p>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {othersTyping.length > 0 && (
        <p className="text-xs text-white/40 px-4 py-1 italic animate-pulse">
          {othersTyping.map((t) => t.nickname).join(', ')} {othersTyping.length === 1 ? 'is' : 'are'} typing...
        </p>
      )}

      <div className="p-4 border-t border-white/10 flex gap-2">
        <textarea
          value={text}
          onChange={handleChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Message the squad... (Enter to send)"
          rows={2}
          className="anime-input resize-none text-sm flex-1 min-h-[44px]"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!text.trim()}
          className="anime-button px-4 self-end min-w-[44px] min-h-[44px] flex items-center justify-center disabled:opacity-40"
        >
          <HiOutlinePaperAirplane className="w-5 h-5 rotate-90" />
        </button>
      </div>
      <p className="text-[10px] text-white/25 px-4 pb-2 text-right">{text.length}/{MAX_LEN}</p>
    </div>
  );
}
