import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'sonner';
import { RoomProvider } from './context/RoomContext';
import Home from './components/Home';
import Room from './components/Room';
import NeuralBackground from './components/NeuralBackground';
import SpiderOverlay from './components/SpiderOverlay';
import BurningReveal from './components/BurningReveal';
import GooeyFooter from './components/GooeyFooter';

export default function App() {
  return (
    <Router>
      <RoomProvider>
        {/* Fire intro — shows on first load, then disappears */}
        <BurningReveal text="Sync Room" />

        {/* Spider crawls in corner */}
        <SpiderOverlay />

        {/* Hero section with Neural Network background */}
        <NeuralBackground>
          <div style={{ position: 'relative', zIndex: 20, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Toaster
              position="top-center"
              richColors
              theme="light"
              toastOptions={{
                style: {
                  background: 'rgba(255, 255, 255, 0.92)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(20, 184, 166, 0.2)',
                  color: '#1e293b',
                  fontFamily: '"Montserrat", system-ui, sans-serif',
                  fontSize: '13px',
                  boxShadow: '0 8px 32px rgba(20, 184, 166, 0.08)',
                },
              }}
            />

            <AnimatePresence mode="wait">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/room/:roomId" element={<Room />} />
              </Routes>
            </AnimatePresence>
          </div>
        </NeuralBackground>

        {/* Gooey animated footer */}
        <GooeyFooter />
      </RoomProvider>
    </Router>
  );
}
