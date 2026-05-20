import { useState, useEffect } from 'react';
import { formatBytes } from '../utils/fileUtils';

function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

export default function MissionIntel({
  roomType,
  isP2P,
  filesCount,
  bytesTransferred,
  roomCreatedAt,
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!roomCreatedAt) return undefined;
    const tick = () => setElapsed(Date.now() - roomCreatedAt);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [roomCreatedAt]);

  return (
    <div className="glass-panel p-5 space-y-4">
      <div className="flex items-center gap-2 text-sm font-bold text-white/50 uppercase tracking-wider">
        <span>🎯</span>
        <span>Mission Intel</span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="glass-panel p-3 !rounded-lg">
          <p className="text-xs text-white/40 font-bold">Connection</p>
          <p className="text-[#00f5d4] font-bold mt-1">
            {roomType === 'group'
              ? 'Group Relay'
              : isP2P
                ? 'P2P Direct'
                : 'Server Relay'}
          </p>
        </div>
        <div className="glass-panel p-3 !rounded-lg">
          <p className="text-xs text-white/40 font-bold">Files Shared</p>
          <p className="text-white/90 font-bold mt-1">{filesCount}</p>
        </div>
        <div className="glass-panel p-3 !rounded-lg">
          <p className="text-xs text-white/40 font-bold">Data Moved</p>
          <p className="text-white/90 font-bold mt-1">{formatBytes(bytesTransferred)}</p>
        </div>
        <div className="glass-panel p-3 !rounded-lg">
          <p className="text-xs text-white/40 font-bold">Room Age</p>
          <p className="text-white/90 font-bold mt-1">
            {roomCreatedAt ? `Active ${formatDuration(elapsed)}` : '—'}
          </p>
        </div>
        <div className="glass-panel p-3 !rounded-lg col-span-2">
          <p className="text-xs text-white/40 font-bold">Protection</p>
          <p className="text-success font-bold mt-1">🛡️ E2E Encrypted</p>
        </div>
      </div>
    </div>
  );
}
