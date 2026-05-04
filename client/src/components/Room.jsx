import { useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import AnimeLogo from './AnimeLogo';
import ConnectionStatus from './ConnectionStatus';
import FileUploader from './FileUploader';
import FilePreview from './FilePreview';
import ProgressBar from './ProgressBar';
import ClipboardShare from './ClipboardShare';
import { useRoom } from '../context/RoomContext';
import { generateRoomUrl, CONNECTION_STATES } from '../utils/constants';
import { HiOutlineLogout, HiOutlineClipboardCopy, HiOutlineKey } from 'react-icons/hi';
import { toast } from 'sonner';

export default function Room() {
  // Spider and Neural Network animations
  useEffect(() => {
    const initAnimations = async () => {
      try {
        const { initSpider, stopSpider } = await import('./animations/spider.js');
        const { initNeuralNetwork, stopNeuralNetwork } = await import('./animations/neural-network.js');
        
        // On room page mount (waiting for peer)
        initSpider();
        
        // Store references for cleanup
        window._spiderControls = { initSpider, stopSpider };
        window._neuralControls = { initNeuralNetwork, stopNeuralNetwork };
      } catch (error) {
        console.error('Failed to load animation controllers:', error);
      }
    };
    
    initAnimations();
    
    // Cleanup on unmount
    return () => {
      if (window._spiderControls) {
        window._spiderControls.stopSpider();
      }
      if (window._neuralControls) {
        window._neuralControls.stopNeuralNetwork();
      }
    };
  }, []);

  // Handle connection state changes
  useEffect(() => {
    const handleConnectionChange = async () => {
      if (!window._spiderControls || !window._neuralControls) return;
      
      const { initSpider, stopSpider } = window._spiderControls;
      const { initNeuralNetwork, stopNeuralNetwork } = window._neuralControls;
      
      if (isConnected) {
        // When peer connects
        stopSpider();
        setTimeout(() => initNeuralNetwork(), 800);
      } else {
        // When peer disconnects
        stopNeuralNetwork();
        setTimeout(() => initSpider(), 400);
      }
    };
    
    handleConnectionChange();
  }, [isConnected]);
  const { roomId: urlRoomId } = useParams();
  const navigate = useNavigate();
  const {
    roomId,
    role,
    connectionStatus,
    isP2P,
    clipboardMessages,
    serverFiles,
    createRoom,
    joinRoom,
    leaveRoom,
    sendFiles,
    sendClipboard,
    receivedFiles,
    downloadFile,
    downloadServerFile,
    progress,
    speed,
    timeRemaining,
    transferState,
    currentFile,
  } = useRoom();

  // Auto-create or auto-join room based on URL
  useEffect(() => {
    if (urlRoomId && !roomId) {
      // Someone navigated directly to /room/:id — try to join
      joinRoom(urlRoomId).catch(() => {
        toast.error('Room not found or expired');
        navigate('/');
      });
    }
  }, [urlRoomId, roomId, joinRoom, navigate]);

  const handleLeave = useCallback(() => {
    leaveRoom();
    navigate('/');
  }, [leaveRoom, navigate]);

  const handleCopyRoomId = useCallback(() => {
    if (roomId) {
      navigator.clipboard?.writeText(generateRoomUrl(roomId));
      toast.success('Room link copied!');
    }
  }, [roomId]);

  const allReceivedFiles = [
    ...receivedFiles,
    ...serverFiles.map((f) => ({
      ...f,
      name: f.originalName,
    })),
  ];

  // Determine which sections to show
  const isHost = role === 'host';
  const isConnected = connectionStatus === CONNECTION_STATES.CONNECTED;

  return (
    <div className="min-h-screen bg-tanjiro relative">
      {/* Background Canvases */}
      <canvas id="spider-canvas" style="position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;opacity:0;transition:opacity 0.8s ease;pointer-events:none;"></canvas>
      <canvas id="neural-network-canvas" style="position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;opacity:0;transition:opacity 1.2s ease;pointer-events:none;"></canvas>
      
      {/* Background Anime Illustration */}
      <img src="/anime_flame_bg.png" alt="" className="fixed inset-0 w-full h-full object-cover opacity-30 mix-blend-multiply pointer-events-none z-0" />
      <div className="fixed inset-0 w-full h-full bg-gradient-to-t from-transparent to-white/70 pointer-events-none z-0" />

      {/* Top Bar */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 border-b border-white shadow-sm relative"
      >
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="scale-75 origin-left -ml-2">
            <AnimeLogo size="small" />
          </div>

          <div className="flex items-center gap-3">
            {/* Room ID Badge */}
            {roomId && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCopyRoomId}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-mint-subtle hover:border-mint-primary hover:shadow-sm transition-all"
              >
                <HiOutlineKey className="w-4 h-4 text-mint-primary" />
                <span className="text-sm font-mono font-black text-text-primary tracking-widest">
                  {roomId}
                </span>
                <HiOutlineClipboardCopy className="w-4 h-4 text-text-muted" />
              </motion.button>
            )}

            {/* Leave Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLeave}
              className="p-2 rounded-lg border border-crimson-subtle text-crimson-primary bg-white hover:bg-crimson-subtle transition-all"
              title="Retreat"
            >
              <HiOutlineLogout className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="relative z-10 max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Connection Status */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-center"
        >
          <ConnectionStatus status={connectionStatus} isP2P={isP2P} />
        </motion.div>

        {/* Transfer Mode Info */}
        {isConnected && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <p className="text-sm font-japanese font-semibold text-text-secondary drop-shadow-sm border border-mint-subtle/50 bg-white/50 px-4 py-1.5 rounded-full inline-block">
              {isP2P
                ? 'Hashira Link Active — Maximum Focus 🗡️'
                : 'Server Relay Engaged — Awaiting Direct Link ✉️'}
            </p>
          </motion.div>
        )}

        {/* Waiting State (Host, no peer yet) */}
        {isHost && connectionStatus === CONNECTION_STATES.WAITING && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card bg-white/60 p-10 text-center space-y-4 shadow-sm"
          >
            <motion.div
              animate={{ scale: [1, 1.05, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="text-5xl drop-shadow-md"
            >
              🎋
            </motion.div>
            <p className="text-lg font-anime font-bold text-text-primary">
              Awaiting a fellow Slayer to connect...
            </p>
            <p className="text-sm font-japanese font-medium text-text-secondary">
              Share your Room Code or have them scan the QR via Kasugai Crow
            </p>
          </motion.div>
        )}

        {/* Active Session Layout */}
        {isConnected && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: File Uploader (for guest/sender) or File Preview (for host) */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-4"
            >
              {!isHost ? (
                // Guest: File Upload
                <div className="glass-card p-5 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-mono text-text-secondary">
                    <span>📤</span>
                    <span>Send Files</span>
                  </div>
                  <FileUploader onSendFiles={sendFiles} disabled={false} />
                </div>
              ) : (
                // Host: Received Files
                <div className="glass-card p-5">
                  {allReceivedFiles.length > 0 ? (
                    <FilePreview
                      files={allReceivedFiles}
                      onDownload={downloadFile}
                      onDownloadServer={downloadServerFile}
                      roomId={roomId}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-3 py-8 text-center">
                      <motion.span
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="text-3xl"
                      >
                        📥
                      </motion.span>
                      <p className="text-sm font-mono text-text-muted">
                        Waiting for files...
                      </p>
                      <p className="text-xs font-mono text-text-muted">
                        Files sent from the connected device will appear here
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Also let host send files */}
              {isHost && (
                <div className="glass-card p-5 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-mono text-text-secondary">
                    <span>📤</span>
                    <span>Send Files to Mobile</span>
                  </div>
                  <FileUploader onSendFiles={sendFiles} disabled={false} />
                </div>
              )}

              {/* Also let guest see received files */}
              {!isHost && allReceivedFiles.length > 0 && (
                <div className="glass-card p-5">
                  <FilePreview
                    files={allReceivedFiles}
                    onDownload={downloadFile}
                    onDownloadServer={downloadServerFile}
                    roomId={roomId}
                  />
                </div>
              )}
            </motion.div>

            {/* Right Column: Clipboard + Progress */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              {/* Progress Bar */}
              <ProgressBar
                progress={progress}
                speed={speed}
                timeRemaining={timeRemaining}
                transferState={transferState}
                currentFile={currentFile}
              />

              {/* Clipboard Share */}
              <div className="glass-card p-5">
                <ClipboardShare
                  roomId={roomId}
                  onSend={sendClipboard}
                  messages={clipboardMessages}
                />
              </div>

              {/* Session Info */}
              <div className="glass-card bg-white/60 p-5 space-y-4">
                <div className="flex items-center gap-2 text-sm font-anime font-bold text-text-secondary uppercase tracking-wider">
                  <span>ℹ️</span>
                  <span>Combat Log</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm font-japanese">
                  <div className="bg-white rounded-lg p-3 border border-glass-border shadow-sm">
                    <p className="text-xs text-text-muted font-bold">Role</p>
                    <p className="text-text-primary font-bold mt-1">
                      {isHost ? '🖥 Hashira' : '📱 Slayer'}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-glass-border shadow-sm">
                    <p className="text-xs text-text-muted font-bold">Technique</p>
                    <p className="text-mint-primary font-bold mt-1">
                      {isP2P ? '🗡️ Direct' : '✉️ Relay'}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-glass-border shadow-sm">
                    <p className="text-xs text-text-muted font-bold">Items Found</p>
                    <p className="text-text-primary font-bold mt-1">
                      {allReceivedFiles.length}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-glass-border shadow-sm">
                    <p className="text-xs text-text-muted font-bold">Protection</p>
                    <p className="text-success font-bold mt-1">
                      ⛩️ Warded
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
}
