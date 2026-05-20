import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import ConnectionStatus from './ConnectionStatus';
import FileUploader from './FileUploader';
import FilePreview from './FilePreview';
import ProgressBar from './ProgressBar';
import GroupChat from './GroupChat';
import UserList from './UserList';
import FileBoard from './FileBoard';
import FileLightbox from './FileLightbox';
import MissionIntel from './MissionIntel';
import NicknameModal from './NicknameModal';
import { PageCanvases } from './PageCanvases';
import { useNeuralBackground } from '../hooks/usePageAnimations';
import { useGroupRoom } from '../hooks/useGroupRoom';
import { useRoom } from '../context/RoomContext';
import { CONNECTION_STATES, ROOM_TYPES } from '../utils/constants';
import { generateRoomUrl } from '../utils/constants';
import { getStoredNickname, storeNickname } from '../utils/nicknames';
import { HiOutlineClipboardCopy } from 'react-icons/hi';

const TABS = ['files', 'chat', 'users'];

export default function Room() {
  const { roomId: urlRoomId } = useParams();
  const navigate = useNavigate();
  const {
    roomId,
    roomType,
    role,
    nickname,
    connectionStatus,
    isP2P,
    joinRoom,
    leaveRoom,
    sendFiles,
    receivedFiles,
    downloadFile,
    downloadServerFile,
    progress,
    speed,
    timeRemaining,
    transferState,
    currentFile,
    serverFiles,
    roomCreatedAt,
    sessionBytes,
    socket,
    setUserNickname,
  } = useRoom();

  useNeuralBackground();

  const [mobileTab, setMobileTab] = useState('chat');
  const [previewFile, setPreviewFile] = useState(null);
  const [soundsEnabled, setSoundsEnabled] = useState(false);
  const [showNickname, setShowNickname] = useState(false);
  const [joined, setJoined] = useState(false);

  const isGroup = roomType === ROOM_TYPES.GROUP;
  const effectiveRoomId = roomId || urlRoomId;

  const group = useGroupRoom(socket, {
    roomId: isGroup ? effectiveRoomId : null,
    nickname,
    soundsEnabled,
  });

  useEffect(() => {
    if (!urlRoomId || roomId || joined) return;

    joinRoom(urlRoomId)
      .then(() => setJoined(true))
      .catch((err) => {
        if (err.message?.includes('Nickname')) {
          const stored = getStoredNickname();
          if (stored) {
            joinRoom(urlRoomId, { nickname: stored })
              .then(() => setJoined(true))
              .catch(() => setShowNickname(true));
          } else {
            setShowNickname(true);
          }
        } else {
          toast.error(err.message || 'Room not found');
          navigate('/');
        }
      });
  }, [urlRoomId, roomId, joinRoom, joined, navigate]);

  const handleNicknameJoin = async (nick) => {
    setUserNickname(nick);
    storeNickname(nick);
    setShowNickname(false);
    try {
      await joinRoom(urlRoomId, { nickname: nick });
      setJoined(true);
    } catch {
      toast.error('Room not found or expired');
      navigate('/');
    }
  };

  const handleLeave = useCallback(() => {
    leaveRoom();
    navigate('/');
  }, [leaveRoom, navigate]);

  const handleCopyRoomId = useCallback(() => {
    if (effectiveRoomId) {
      navigator.clipboard?.writeText(generateRoomUrl(effectiveRoomId));
      toast.success('Room link copied!');
    }
  }, [effectiveRoomId]);

  const handleGroupUpload = useCallback(async (files) => {
    const arr = Array.from(files).filter((f) => f.size > 0);
    if (!arr.length) {
      toast.error('File is empty or invalid');
      return;
    }
    for (const file of arr) {
      const fileId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      group.announceFile({
        fileId,
        name: file.name,
        size: file.size,
        type: file.type,
        senderNickname: nickname,
      });
      if (file.size < 50 * 1024 * 1024) {
        const onlineUsers = group.users.filter((u) => u.id !== socket?.socketId && u.isOnline !== false);
        if (onlineUsers[0]) {
          await group.sendFileToPeer(file, onlineUsers[0].id, fileId);
        }
      } else {
        toast('Large file — use server relay', { icon: '☁️' });
        await sendFiles([file]);
      }
    }
  }, [group, nickname, socket, sendFiles]);

  const allDirectFiles = [
    ...receivedFiles,
    ...serverFiles.map((f) => ({ ...f, name: f.originalName })),
  ];

  const isHost = role === 'host';
  const isConnected = connectionStatus === CONNECTION_STATES.CONNECTED;
  const isAwaiting = !isGroup && isHost && connectionStatus === CONNECTION_STATES.WAITING;
  const userCountLabel = isGroup
    ? `${group.userCount.count || group.users.length} / ${group.userCount.max || 60}`
    : null;

  if (showNickname && !roomId) {
    return (
      <div className="min-h-screen relative">
        <NicknameModal open onSubmit={handleNicknameJoin} title="Join Group Room" />
      </div>
    );
  }

  if (isGroup) {
    return (
      <div className="min-h-screen relative flex flex-col pb-20 md:pb-6">
        <PageCanvases neural fire={false} spider={false} />

        <header className="glass-panel mx-4 mt-4 px-4 py-3 rounded-2xl flex flex-wrap items-center justify-between gap-2 relative z-40">
          <span className="font-black text-lg neon-teal">SYNC_ROOM</span>
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-sm">
            <span className="text-white/40">👥</span>
            <span className="font-mono text-white/80">{userCountLabel} Warriors</span>
          </div>
          {effectiveRoomId && (
            <button type="button" onClick={handleCopyRoomId} className="flex items-center gap-1 text-sm font-mono text-white/70 hover:text-[#00f5d4] min-h-[44px] px-2">
              {effectiveRoomId}
              <HiOutlineClipboardCopy className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setSoundsEnabled(!soundsEnabled)}
            className="text-xs text-white/40 hover:text-white/70 min-h-[44px] px-2"
            title="Toggle sounds"
          >
            {soundsEnabled ? '🔊' : '🔇'}
          </button>
          <button type="button" onClick={handleLeave} className="text-white/30 hover:text-red-400 text-sm min-h-[44px] px-2">
            ← Leave
          </button>
        </header>

        <main className="relative z-30 flex-1 max-w-6xl mx-auto w-full px-4 py-4 hidden md:grid md:grid-cols-[1fr_1.2fr] md:grid-rows-[1fr_auto] gap-4 min-h-0">
          <div className="row-span-2 min-h-[320px]">
            <FileBoard
              files={group.files}
              onRequestFile={group.requestFile}
              onPreview={(f) => setPreviewFile(f)}
              transferProgress={group.transferProgress}
            />
          </div>
          <div className="flex flex-col gap-4 min-h-[360px]">
            <GroupChat
              messages={group.messages}
              onSend={group.sendMessage}
              onTypingStart={group.typingStart}
              onTypingStop={group.typingStop}
              typingUsers={group.typingUsers}
              myId={socket?.socketId}
            />
          </div>
          <UserList users={group.users} maxUsers={60} />
        </main>

        <div className="md:hidden relative z-30 flex-1 px-4 py-2 overflow-hidden">
          {mobileTab === 'files' && (
            <FileBoard
              files={group.files}
              onRequestFile={group.requestFile}
              onPreview={setPreviewFile}
              transferProgress={group.transferProgress}
            />
          )}
          {mobileTab === 'chat' && (
            <GroupChat
              messages={group.messages}
              onSend={group.sendMessage}
              onTypingStart={group.typingStart}
              onTypingStop={group.typingStop}
              typingUsers={group.typingUsers}
              myId={socket?.socketId}
            />
          )}
          {mobileTab === 'users' && <UserList users={group.users} />}
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden glass-panel !rounded-none border-x-0 border-b-0 flex">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setMobileTab(tab)}
              className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider min-h-[44px] ${
                mobileTab === tab ? 'text-[#00f5d4]' : 'text-white/40'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="relative z-30 max-w-6xl mx-auto w-full px-4 pb-24 md:pb-4 space-y-4">
          <div className="glass-panel p-4">
            <FileUploader onSendFiles={handleGroupUpload} disabled={false} />
          </div>
          <MissionIntel
            roomType="group"
            isP2P={false}
            filesCount={group.files.length}
            bytesTransferred={group.bytesTransferred + sessionBytes}
            roomCreatedAt={roomCreatedAt}
          />
        </div>

        <FileLightbox file={previewFile} onClose={() => setPreviewFile(null)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <PageCanvases neural fire={false} spider={false} />

      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel mx-4 mt-4 px-6 py-3 rounded-2xl flex items-center justify-between relative z-40 flex-wrap gap-2"
      >
        <span className="font-black text-lg neon-teal">SYNC_ROOM</span>
        {effectiveRoomId && (
          <button type="button" onClick={handleCopyRoomId} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 min-h-[44px]">
            <span className="text-xs text-white/40">🔑</span>
            <span className="text-sm font-mono font-bold tracking-widest text-white/80">{effectiveRoomId}</span>
            <HiOutlineClipboardCopy className="w-4 h-4 text-white/40" />
          </button>
        )}
        <button type="button" onClick={handleLeave} className="text-white/30 hover:text-red-400 text-sm min-h-[44px] px-2">
          ← Leave
        </button>
      </motion.header>

      <main className="relative z-30 max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="flex justify-center">
          <ConnectionStatus status={connectionStatus} isP2P={isP2P} />
        </div>

        {isConnected && (
          <p className="text-center text-sm text-white/50 border border-white/10 bg-white/5 px-4 py-1.5 rounded-full w-fit mx-auto">
            {isP2P ? 'Hashira Link Active — P2P 🗡️' : 'Server Relay ✉️'}
          </p>
        )}

        {isAwaiting && (
          <div className="glass-panel p-10">
            <ConnectionStatus status={CONNECTION_STATES.WAITING} isP2P={false} />
            <p className="text-sm text-white/40 text-center mt-4">Share your room code or QR</p>
          </div>
        )}

        {isConnected && (
          <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6">
            <div className="space-y-4 order-2 lg:order-1">
              {!isHost ? (
                <div className="glass-panel p-5 space-y-4">
                  <p className="text-sm text-white/50">📤 Send Files</p>
                  <FileUploader onSendFiles={sendFiles} disabled={false} />
                </div>
              ) : (
                <div className="glass-panel p-5">
                  {allDirectFiles.length > 0 ? (
                    <FilePreview
                      files={allDirectFiles}
                      onDownload={downloadFile}
                      onDownloadServer={downloadServerFile}
                      roomId={effectiveRoomId}
                    />
                  ) : (
                    <p className="text-center text-white/50 py-8">Waiting for files...</p>
                  )}
                </div>
              )}
              {isHost && (
                <div className="glass-panel p-5 space-y-4">
                  <p className="text-sm text-white/50">📤 Send to Mobile</p>
                  <FileUploader onSendFiles={sendFiles} disabled={false} />
                </div>
              )}
            </div>

            <div className="space-y-4 order-1 lg:order-2">
              <ProgressBar
                progress={progress}
                speed={speed}
                timeRemaining={timeRemaining}
                transferState={transferState}
                currentFile={currentFile}
              />
              <MissionIntel
                roomType="direct"
                isP2P={isP2P}
                filesCount={allDirectFiles.length}
                bytesTransferred={sessionBytes}
                roomCreatedAt={roomCreatedAt}
              />
            </div>
          </div>
        )}
      </main>

      <FileLightbox file={previewFile} onClose={() => setPreviewFile(null)} />
    </div>
  );
}
