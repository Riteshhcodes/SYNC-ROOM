import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5Qrcode } from 'html5-qrcode';
import { toast } from 'sonner';
import AnimeLogo from './AnimeLogo';
import QRDisplay from './QRDisplay';
import ConnectionStatus from './ConnectionStatus';
import { useRoom } from '../context/RoomContext';
import { useSocket } from '../hooks/useSocket';
import { generateRoomUrl, CONNECTION_STATES } from '../utils/constants';
import { HiOutlineQrcode, HiOutlineKey } from 'react-icons/hi';
import { AnimeBackground, AnimeHeroes, HostRengokuIcon, JoinTanjiroIcon } from './AnimeCharacters';

export default function Home() {
  const { socket } = useSocket();
  const { roomId, createRoom, joinRoom } = useRoom();
  
  // Prioritize connection establishment first
  useEffect(() => {
    return () => {
      // Cleanup socket on unmount
      if (socket) socket.disconnect();
    };
  }, [socket]);

  // Load heavy animations after connection is established
  useEffect(() => {
    const initAnimations = () => {
      const initBurnReveal = async () => {
        try {
          // Wait for DOM to be ready
          const checkDOM = () => {
            const fireCanvas = document.getElementById('fire-overlay');
            const main = document.getElementById('main-content');
            
            if (!fireCanvas || !main) {
              setTimeout(checkDOM, 100);
              return;
            }

            // DOM is ready, now load and trigger animation
            import('../utils/burnRevealController.js').then(({ triggerBurnReveal }) => {
              // Hide main content initially
              main.style.opacity = '0'; 
              main.style.transform = 'translateY(20px)'; 
              main.style.transition = 'opacity 0.6s ease, transform 0.6s ease'; 

              triggerBurnReveal(() => {
              // Reveal main content after fire burn
              main.style.opacity = '1'; 
              main.style.transform = 'translateY(0)'; 
            });
          }).catch(error => {
            // Silently handle burn reveal loading errors
          });
        };
        
        checkDOM();
      } catch (error) {
        // Silently handle burn reveal initialization errors
      }
    };
      
      const initFooterParticles = () => {
        const container = document.getElementById("footer-particle-container");
        if (!container) {
          setTimeout(initFooterParticles, 100);
          return;
        }
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < 100; i++) {
          const span = document.createElement("span");
          span.classList.add("footer-particle");
          span.style.setProperty("--dim", `${3 + Math.random() * 6}rem`);
          span.style.setProperty("--uplift", `${10 + Math.random() * 15}rem`);
          span.style.setProperty("--pos-x", `${Math.random() * 100}%`);
          span.style.setProperty("--dur", `${3 + Math.random() * 3}s`);
          span.style.setProperty("--delay", `${-1 * (Math.random() * 10)}s`);
          fragment.appendChild(span);
        }
        container.appendChild(fragment);
      };

      // Add footer CSS using a simpler approach
      const styleElement = document.createElement('style');
      styleElement.textContent = `
        :root { --footer-color: #4CD9B0; }
        .footer-section { position: relative; background: var(--footer-color); min-height: 250px; padding-bottom: 2rem; margin-top: 15rem; width: 100%; }
        .gooey-animations { position: absolute; top: 0; width: 120%; left: -10%; height: 6rem; background: var(--footer-color); transform: translateY(-99%); z-index: 0; filter: url('#liquid-effect'); overflow: visible; pointer-events: none; }
        .footer-particle { position: absolute; background: var(--footer-color); border-radius: 50%; top: 50%; left: var(--pos-x, 50%); width: var(--dim, 5rem); height: var(--dim, 5rem); transform: translate(-50%, -50%); animation: footer-float-up var(--dur, 4s) ease-in infinite; animation-delay: var(--delay, 0s); }
        @keyframes footer-float-up { 0% { top: 50%; transform: translate(-50%, -50%) scale(1); } 100% { top: calc(var(--uplift) * -1); transform: translate(-50%, -50%) scale(0); } }
        .footer-content { position: relative; z-index: 2; max-width: 1000px; margin: 0 auto; padding: 4rem 2rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 2rem; text-align: center; }
        .footer-brand { text-align: center; padding: 2rem 0 0; font-size: 1.4rem; font-weight: 800; color: #2E2E2E; letter-spacing: 2px; position: relative; z-index: 2; }
        .footer-column { display: flex; flex-direction: column; gap: 1rem; }
        .footer-column h4 { color: #2E2E2E; margin: 0; font-size: 1.1rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
        .footer-column a { color: #2E2E2E; opacity: 0.8; text-decoration: none; font-size: 1rem; font-weight: 400; transition: opacity 0.3s, transform 0.3s; }
        .footer-column a:hover { opacity: 1; transform: translateY(-3px); font-weight: 600; }
      `;
      document.head.appendChild(styleElement);
      
      // Delay animation loading to prioritize connection
      setTimeout(() => {
        initBurnReveal();
        initFooterParticles();
      }, 1000);
    };

    // Load animations after a short delay to ensure connection is established
    const timer = setTimeout(initAnimations, 500);
    return () => clearTimeout(timer);
  }, []);
  const navigate = useNavigate();
  const { connectionStatus, socketConnected } = useRoom();

  const [mode, setMode] = useState(null); // 'host' | 'join'
  const [joinId, setJoinId] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const scannerRef = useRef(null);
  const scannerContainerRef = useRef(null);

  // Navigate to room when connected
  useEffect(() => {
    if (roomId && connectionStatus === CONNECTION_STATES.CONNECTED) {
      navigate(`/room/${roomId}`);
    }
  }, [roomId, connectionStatus, navigate]);

  // Host: Create room
  const handleCreateRoom = useCallback(async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const newRoomId = await createRoom();
      setMode('host');
      toast.success(`Room created: ${newRoomId}`);
    } catch {
      toast.error('Failed to create room');
    } finally {
      setIsCreating(false);
    }
  }, [createRoom, isCreating]);

  // Guest: Join room
  const handleJoinRoom = useCallback(async (id) => {
    const roomCode = (id || joinId).trim().toUpperCase();
    if (!roomCode || roomCode.length !== 6) {
      toast.error('Enter a valid 6-character Room ID');
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

  // QR Scanner
  const startScanner = useCallback(async () => {
    setShowScanner(true);
    
    // Wait for DOM element
    await new Promise((r) => setTimeout(r, 300));

    try {
      const html5QrCode = new Html5Qrcode('qr-scanner');
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // Extract room ID from URL
          const match = decodedText.match(/\/room\/([A-Z0-9]{6})/i);
          if (match) {
            stopScanner();
            handleJoinRoom(match[1]);
          } else if (/^[A-Z0-9]{6}$/i.test(decodedText)) {
            stopScanner();
            handleJoinRoom(decodedText);
          }
        },
        () => {} // Ignore errors during scanning
      );
    } catch (err) {
      toast.error('Camera access denied or unavailable');
      setShowScanner(false);
    }
  }, [handleJoinRoom]);

  const stopScanner = useCallback(() => {
    if (scannerRef.current) {
      scannerRef.current.stop().then(() => {
        scannerRef.current.clear();
        scannerRef.current = null;
      }).catch(() => {});
    }
    setShowScanner(false);
  }, []);

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const handleCopyRoomId = useCallback(() => {
    if (roomId) {
      const url = generateRoomUrl(roomId);
      navigator.clipboard?.writeText(url);
      toast.success('Room link copied!');
    }
  }, [roomId]);

  const handleRetry = useCallback(() => {
    if (roomId) {
      // If we have a room ID, try to rejoin
      joinRoom(roomId);
    } else {
      // Otherwise, create a new room
      createRoom();
    }
  }, [roomId, joinRoom, createRoom]);

  return (
    <div className="min-h-screen bg-tanjiro flex flex-col items-center justify-center px-4 py-8 relative">
      <div id="hero-section" className="min-h-screen flex flex-col items-center justify-center w-full">
        {/* Background Anime Illustration */}
      <img src="/anime_water_bg.png" alt="" className="fixed inset-0 w-full h-full object-cover opacity-40 mix-blend-multiply pointer-events-none z-0" />
      <div className="fixed inset-0 w-full h-full bg-gradient-to-b from-transparent to-white/50 pointer-events-none z-0" />
      <AnimeBackground />
      <AnimeHeroes />

      <div id="main-content" className="relative z-10 flex flex-col items-center w-full">
        {/* Logo */}
        <motion.div
          className="mb-12 relative"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, type: 'spring' }}
        >
          <AnimeLogo size="large" />
        </motion.div>

      {/* Socket Status */}
      {!socketConnected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6 px-4 py-2 rounded-full border border-warning/30 bg-warning/5 text-warning text-xs font-mono"
        >
          ⏳ Connecting to server...
        </motion.div>
      )}

      {/* Mode Selection */}
      <AnimatePresence mode="wait">
        {!mode && !roomId && (
          <motion.div
            key="mode-select"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg"
          >
            {/* Host Button */}
            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleCreateRoom}
              disabled={!socketConnected || isCreating}
              className="glass-card p-6 flex flex-col items-center gap-4 cursor-pointer transition-all duration-300 hover:border-mint-primary hover:shadow-anime group disabled:opacity-50 disabled:cursor-not-allowed bg-white/60"
              id="create-room-btn"
            >
              <div className="text-4xl filter drop-shadow-md group-hover:scale-110 transition-transform">
                <HostRengokuIcon />
              </div>
              <div className="text-center">
                <p className="font-anime font-bold text-text-primary text-lg">Hashira / Host</p>
                <p className="text-xs font-japanese font-medium text-text-muted mt-1">Create a room & receive files</p>
              </div>
            </motion.button>

            {/* Join Button */}
            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setMode('join')}
              disabled={!socketConnected}
              className="glass-card p-6 flex flex-col items-center gap-4 cursor-pointer transition-all duration-300 hover:border-mint-primary hover:shadow-anime group disabled:opacity-50 disabled:cursor-not-allowed bg-white/60"
              id="join-room-btn"
            >
              <div className="text-4xl filter drop-shadow-md group-hover:scale-110 transition-transform">
                <JoinTanjiroIcon />
              </div>
              <div className="text-center">
                <p className="font-anime font-bold text-text-primary text-lg">Slayer / Join</p>
                <p className="text-xs font-japanese font-medium text-text-muted mt-1">Scan QR or enter code</p>
              </div>
            </motion.button>
          </motion.div>
        )}

        {/* Host View: Show QR + Room ID */}
        {mode === 'host' && roomId && (
          <motion.div
            key="host-view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center gap-6 w-full max-w-md"
          >
            <ConnectionStatus status={connectionStatus} isP2P={false} onRetry={handleRetry} />

            <QRDisplay value={generateRoomUrl(roomId)} size={220} />

            {/* Room ID Display */}
            <motion.div
              className="glass-card bg-white/80 px-6 py-4 flex items-center gap-4 cursor-pointer hover:border-mint-primary/40 hover:shadow-sm transition-all"
              onClick={handleCopyRoomId}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <HiOutlineKey className="w-6 h-6 text-mint-primary flex-shrink-0" />
              <div>
                <p className="text-xs font-anime font-semibold text-text-muted uppercase tracking-wider">Room Code</p>
                <p className="text-2xl font-mono font-black text-mint-primary tracking-[0.3em] drop-shadow-sm">
                  {roomId}
                </p>
              </div>
              <span className="text-xs font-anime font-bold text-mint-primary bg-mint-subtle/50 px-2 py-1 rounded ml-2">Copy</span>
            </motion.div>

            <p className="text-xs font-japanese font-medium text-text-secondary text-center animate-pulse">
              Scan the QR using your Kasugai Crow (Mobile Camera)
            </p>

            <button
              onClick={() => { setMode(null); }}
              className="text-sm font-anime font-bold text-text-muted hover:text-mint-primary transition-colors flex items-center gap-1"
            >
              ← Retreat
            </button>
          </motion.div>
        )}

        {/* Join View */}
        {mode === 'join' && !roomId && (
          <motion.div
            key="join-view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center gap-6 w-full max-w-md"
          >
            {/* QR Scanner */}
            <AnimatePresence>
              {showScanner && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="w-full"
                >
                  <div className="glass-card p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-mono text-text-primary">📷 Scanning...</span>
                      <button
                        onClick={stopScanner}
                        className="text-xs font-mono text-danger hover:text-danger/80 transition-colors"
                      >
                        Close ✕
                      </button>
                    </div>
                    <div
                      id="qr-scanner"
                      ref={scannerContainerRef}
                      className="rounded-xl overflow-hidden"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!showScanner && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={startScanner}
                className="anime-button w-full flex items-center justify-center gap-2 py-4"
                id="scan-qr-btn"
              >
                <HiOutlineQrcode className="w-5 h-5" />
                Scan QR Code 🐦‍⬛
              </motion.button>
            )}

            {/* Divider */}
            <div className="flex items-center gap-4 w-full">
              <div className="flex-1 h-px bg-mint-subtle" />
              <span className="text-xs font-anime font-bold text-mint-primary">OR</span>
              <div className="flex-1 h-px bg-mint-subtle" />
            </div>

            {/* Manual ID Entry */}
            <div className="w-full space-y-4">
              <input
                type="text"
                value={joinId}
                onChange={(e) => setJoinId(e.target.value.toUpperCase().slice(0, 6))}
                onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                placeholder="ENTER  CODE"
                maxLength={6}
                className="anime-input text-center text-3xl tracking-[0.4em] font-black placeholder:text-lg placeholder:tracking-widest placeholder:font-semibold"
                id="room-id-input"
              />

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleJoinRoom()}
                disabled={joinId.length !== 6 || isJoining}
                className={`anime-button-solid w-full py-4 text-lg rounded-xl font-anime font-black text-white ${
                  joinId.length !== 6 || isJoining ? 'opacity-50 cursor-not-allowed grayscale' : ''
                }`}
                id="join-btn"
              >
                {isJoining ? '⏳ Linking...' : 'Enter Focus State'}
              </motion.button>
            </div>

            <button
              onClick={() => { setMode(null); stopScanner(); }}
              className="text-sm font-anime font-bold text-text-muted hover:text-mint-primary transition-colors mt-4 flex items-center gap-1"
            >
              ← Retreat
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
        <motion.div
          className="relative z-10 mt-12 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <p className="text-xs font-japanese font-medium text-text-secondary drop-shadow-sm">
            E2E Encrypted • WebRTC P2P • Total Concentration
          </p>
        </motion.div>
      </div>
      </div>

      {/* Gooey Footer */}
      <footer className="footer-section">
        <div className="gooey-animations" id="footer-particle-container"></div>
        <p className="footer-brand">壱 SYNC_ROOM 弐</p>
        <div className="footer-content">
          <div className="footer-column">
            <h4>Product</h4>
            <a href="#">How it Works</a>
            <a href="#">Security</a>
            <a href="#">Open Source</a>
          </div>
          <div className="footer-column">
            <h4>Connect</h4>
            <a href="#">GitHub</a>
            <a href="#">Twitter / X</a>
            <a href="#">Discord</a>
          </div>
          <div className="footer-column">
            <h4>Legal</h4>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Cookies</a>
          </div>
        </div>
      </footer>

      {/* SVG filter — REQUIRED for gooey effect */}
      <svg style={{position:'absolute',width:0,height:0,overflow:'hidden'}} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="liquid-effect">
            <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" result="liquid" />
          </filter>
        </defs>
      </svg>
    </div>
  );
}
