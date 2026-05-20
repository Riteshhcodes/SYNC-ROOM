import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5Qrcode } from 'html5-qrcode';
import toast from 'react-hot-toast';
import AnimeLogo from './AnimeLogo';
import QRDisplay from './QRDisplay';
import ConnectionStatus from './ConnectionStatus';
import BicycleLoader from './BicycleLoader';
import NicknameModal from './NicknameModal';
import { PageCanvases } from './PageCanvases';
import { useFireReveal } from '../hooks/usePageAnimations';
import { useRoom } from '../context/RoomContext';
import { generateRoomUrl, CONNECTION_STATES, ROOM_TYPES } from '../utils/constants';
import { HiOutlineQrcode, HiOutlineKey } from 'react-icons/hi';

export default function Home() {
  const navigate = useNavigate();
  const {
    createRoom,
    joinRoom,
    roomId,
    roomType,
    connectionStatus,
    socketConnected,
    setUserNickname,
  } = useRoom();

  useFireReveal();

  const [mode, setMode] = useState(null);
  const [hostStep, setHostStep] = useState(null);
  const [pendingRoomType, setPendingRoomType] = useState(null);
  const [joinId, setJoinId] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [nicknameAction, setNicknameAction] = useState(null);

  const scannerRef = useRef(null);

  useEffect(() => {
    if (roomId && connectionStatus === CONNECTION_STATES.CONNECTED) {
      navigate(`/room/${roomId}`);
    }
    if (roomId && roomType === ROOM_TYPES.DIRECT && mode === 'host') {
      /* stay on home for QR until guest connects */
    }
  }, [roomId, connectionStatus, navigate, roomType, mode]);

  const handleHostTypeSelect = (type) => {
    setPendingRoomType(type);
    if (type === ROOM_TYPES.GROUP) {
      setNicknameAction('host-group');
      setShowNicknameModal(true);
    } else {
      setHostStep('direct');
    }
  };

  const handleCreateDirect = useCallback(async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      await createRoom({ roomType: ROOM_TYPES.DIRECT });
      setMode('host');
      setHostStep(null);
      toast.success('Direct room created');
    } catch {
      toast.error('Failed to create room');
    } finally {
      setIsCreating(false);
    }
  }, [createRoom, isCreating]);

  const handleNicknameSubmit = useCallback(async (nick) => {
    setUserNickname(nick);
    setShowNicknameModal(false);

    if (nicknameAction === 'host-group') {
      setIsCreating(true);
      try {
        const result = await createRoom({ roomType: ROOM_TYPES.GROUP, nickname: nick });
        setUserNickname(nick);
        setMode('host');
        navigate(`/room/${result.roomId}`);
      } catch (err) {
        toast.error(err.message || 'Failed to create group room');
      } finally {
        setIsCreating(false);
      }
    } else if (nicknameAction === 'join-group') {
      setIsJoining(true);
      try {
        await joinRoom(joinId, { nickname: nick, forceGroup: true });
        navigate(`/room/${joinId.toUpperCase()}`);
      } catch (err) {
        toast.error(err.message || 'Failed to join');
      } finally {
        setIsJoining(false);
      }
    }
    setNicknameAction(null);
  }, [nicknameAction, createRoom, joinRoom, joinId, navigate, setUserNickname]);

  const handleJoinRoom = useCallback(async (id, asGroup = false) => {
    const roomCode = (id || joinId).trim().toUpperCase();
    if (!roomCode || roomCode.length !== 6) {
      toast.error('Enter a valid 6-character Room ID');
      return;
    }

    if (asGroup) {
      setJoinId(roomCode);
      setNicknameAction('join-group');
      setShowNicknameModal(true);
      return;
    }

    setIsJoining(true);
    try {
      await joinRoom(roomCode);
      navigate(`/room/${roomCode}`);
    } catch (err) {
      toast.error(err.message || 'Failed to join room');
    } finally {
      setIsJoining(false);
    }
  }, [joinRoom, joinId, navigate]);

  const startScanner = useCallback(async () => {
    setShowScanner(true);
    await new Promise((r) => setTimeout(r, 300));
    try {
      const html5QrCode = new Html5Qrcode('qr-scanner');
      scannerRef.current = html5QrCode;
      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        (decodedText) => {
          const match = decodedText.match(/\/room\/([A-Z0-9]{6})/i);
          if (match) {
            scannerRef.current?.stop().catch(() => {});
            setShowScanner(false);
            handleJoinRoom(match[1], true);
          } else if (/^[A-Z0-9]{6}$/i.test(decodedText)) {
            scannerRef.current?.stop().catch(() => {});
            setShowScanner(false);
            handleJoinRoom(decodedText, true);
          }
        },
        () => {}
      );
    } catch {
      toast.error('Camera access denied');
      setShowScanner(false);
    }
  }, [handleJoinRoom]);

  const stopScanner = useCallback(() => {
    scannerRef.current?.stop().then(() => {
      scannerRef.current?.clear();
      scannerRef.current = null;
    }).catch(() => {});
    setShowScanner(false);
  }, []);

  useEffect(() => () => {
    scannerRef.current?.stop().catch(() => {});
  }, []);

  const handleCopyRoomId = useCallback(() => {
    if (roomId) {
      navigator.clipboard?.writeText(generateRoomUrl(roomId));
      toast.success('Room link copied!');
    }
  }, [roomId]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden">
      <PageCanvases neural={false} fire spider={false} />

      <NicknameModal
        open={showNicknameModal}
        onSubmit={handleNicknameSubmit}
        title={nicknameAction === 'host-group' ? 'Name Yourself, Hashira' : 'Enter Before Joining'}
      />

      <div className="relative z-30 flex flex-col items-center w-full max-w-lg">
        <motion.div className="mb-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <AnimeLogo size="large" />
        </motion.div>

        {!socketConnected && <div className="mb-8"><BicycleLoader /></div>}

        <AnimatePresence mode="wait">
          {!mode && !roomId && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full"
            >
              <button
                type="button"
                onClick={() => { setMode('host'); setHostStep('type'); }}
                disabled={!socketConnected}
                className="glass-panel p-8 group hover:scale-105 transition-all disabled:opacity-50 min-h-[44px]"
              >
                <div className="text-4xl mb-4">🔥</div>
                <h3 className="text-xl font-bold text-white/90">Hashira / Host</h3>
                <p className="text-sm text-white/50 mt-1">Create a room</p>
              </button>
              <button
                type="button"
                onClick={() => setMode('join')}
                disabled={!socketConnected}
                className="glass-panel p-8 group hover:scale-105 transition-all disabled:opacity-50 min-h-[44px]"
              >
                <div className="text-4xl mb-4">🌊</div>
                <h3 className="text-xl font-bold text-white/90">Slayer / Join</h3>
                <p className="text-sm text-white/50 mt-1">Scan QR or enter code</p>
              </button>
            </motion.div>
          )}

          {mode === 'host' && hostStep === 'type' && !roomId && (
            <motion.div key="room-type" className="w-full space-y-4">
              <p className="text-center text-sm text-white/50 tracking-widest uppercase">Room Type</p>
              <button
                type="button"
                onClick={() => handleHostTypeSelect(ROOM_TYPES.DIRECT)}
                className="glass-panel w-full p-6 text-left hover:border-[#00f5d4]/40 transition-all min-h-[44px]"
              >
                <p className="font-bold text-white/90">Direct (2 people)</p>
                <p className="text-sm text-white/40 mt-1">Fast P2P — classic 1:1 transfer</p>
              </button>
              <button
                type="button"
                onClick={() => handleHostTypeSelect(ROOM_TYPES.GROUP)}
                className="glass-panel w-full p-6 text-left hover:border-[#667eea]/40 transition-all min-h-[44px]"
              >
                <p className="font-bold text-white/90">Group Room (up to 60)</p>
                <p className="text-sm text-white/40 mt-1">Chat + file board for everyone</p>
              </button>
              <button type="button" onClick={() => { setMode(null); setHostStep(null); }} className="text-white/30 text-sm hover:text-[#00f5d4] w-full py-3">
                ← Back
              </button>
            </motion.div>
          )}

          {mode === 'host' && hostStep === 'direct' && !roomId && (
            <motion.div key="direct-create" className="w-full space-y-4 text-center">
              <p className="text-white/50 text-sm">Ready to open a direct focus link?</p>
              <button
                type="button"
                onClick={handleCreateDirect}
                disabled={isCreating}
                className="anime-button-solid w-full py-4 min-h-[44px]"
              >
                {isCreating ? 'Creating...' : 'Create Direct Room'}
              </button>
              <button type="button" onClick={() => setHostStep('type')} className="text-white/30 text-sm">← Back</button>
            </motion.div>
          )}

          {mode === 'host' && roomId && roomType === ROOM_TYPES.DIRECT && (
            <motion.div key="host-qr" className="flex flex-col items-center gap-6 w-full">
              <ConnectionStatus status={connectionStatus} isP2P={false} />
              <QRDisplay value={generateRoomUrl(roomId)} size={220} />
              <div className="glass-panel px-6 py-4 flex items-center gap-4 w-full cursor-pointer" onClick={handleCopyRoomId}>
                <HiOutlineKey className="w-6 h-6 text-[#00f5d4]" />
                <p className="text-2xl font-mono font-black text-[#00f5d4] tracking-[0.3em]">{roomId}</p>
              </div>
              <button type="button" onClick={() => setMode(null)} className="text-white/30 text-sm">← Retreat</button>
            </motion.div>
          )}

          {mode === 'join' && !roomId && (
            <motion.div key="join" className="flex flex-col items-center gap-6 w-full">
              {showScanner ? (
                <div className="glass-panel p-4 w-full">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-white/70">📷 Scanning</span>
                    <button type="button" onClick={stopScanner} className="text-danger text-xs">Close</button>
                  </div>
                  <div id="qr-scanner" className="rounded-xl overflow-hidden" />
                </div>
              ) : (
                <button type="button" onClick={startScanner} className="anime-button w-full py-4 flex items-center justify-center gap-2 min-h-[44px]">
                  <HiOutlineQrcode className="w-5 h-5" /> Scan QR
                </button>
              )}
              <div className="flex items-center gap-4 w-full">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs text-[#667eea] font-bold">OR</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
              <input
                type="text"
                value={joinId}
                onChange={(e) => setJoinId(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="ROOM CODE"
                maxLength={6}
                className="anime-input text-center text-3xl tracking-[0.4em] font-black"
              />
              <button
                type="button"
                onClick={() => handleJoinRoom(joinId, false)}
                disabled={joinId.length !== 6 || isJoining}
                className="anime-button-solid w-full py-4 disabled:opacity-50 min-h-[44px]"
              >
                Join Direct
              </button>
              <button
                type="button"
                onClick={() => handleJoinRoom(joinId, true)}
                disabled={joinId.length !== 6}
                className="anime-button w-full py-4 min-h-[44px]"
              >
                Join as Group Member
              </button>
              <button type="button" onClick={() => { setMode(null); stopScanner(); }} className="text-white/30 text-sm">← Retreat</button>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="mt-10 text-xs text-white/25 text-center">E2E Encrypted • WebRTC P2P • Total Concentration</p>
      </div>
    </div>
  );
}
