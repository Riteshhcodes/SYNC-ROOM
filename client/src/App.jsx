import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { RoomProvider } from './context/RoomContext';
import ToastProvider from './components/ToastProvider';
import Home from './components/Home';
import Room from './components/Room';
import { PageCanvases } from './components/PageCanvases';
import { useSpiderAnimation } from './hooks/usePageAnimations';

function AppShell({ children }) {
  useSpiderAnimation();
  return (
    <div className="min-h-screen bg-[#050508] relative">
      <PageCanvases spider neural={false} fire={false} />
      {children}
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <RoomProvider>
        <ToastProvider />
        <AppShell>
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/room/:roomId" element={<Room />} />
            </Routes>
          </AnimatePresence>
        </AppShell>
      </RoomProvider>
    </Router>
  );
}
