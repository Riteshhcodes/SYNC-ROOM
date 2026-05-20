import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function initials(name) {
  return (name || '?').slice(0, 2).toUpperCase();
}

export default function UserList({ users = [], maxUsers = 60, collapsedDefault = false }) {
  const [collapsed, setCollapsed] = useState(collapsedDefault);
  const count = users.length;

  return (
    <div className="glass-panel overflow-hidden">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-3 text-left min-h-[44px]"
      >
        <span className="text-xs font-bold tracking-widest text-[#667eea] uppercase">
          Warriors ({count} / {maxUsers})
        </span>
        <span className="text-white/40 text-sm">{collapsed ? '▼' : '▲'}</span>
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-3 pb-3 space-y-2 max-h-48 overflow-y-auto"
          >
            <AnimatePresence>
              {users.map((user) => (
                <motion.li
                  key={user.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 border border-white/8"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#00f5d4]/30 to-[#667eea]/30 flex items-center justify-center text-xs font-bold text-white/90 flex-shrink-0">
                    {initials(user.nickname)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white/90 truncate flex items-center gap-1">
                      {user.role === 'host' && <span title="Host">👑</span>}
                      {user.nickname}
                    </p>
                    <p className="text-xs text-white/40">
                      {user.role === 'host' ? 'Hashira' : 'Member'}
                      {user.isOnline !== false && (
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00f5d4] ml-2 align-middle" />
                      )}
                    </p>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
