import { Toaster } from 'react-hot-toast';

export default function ToastProvider() {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 3500,
        style: {
          background: 'rgba(10, 10, 15, 0.95)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderTop: '1px solid rgba(255, 255, 255, 0.15)',
          color: 'rgba(255, 255, 255, 0.92)',
          fontFamily: 'Outfit, system-ui, sans-serif',
          fontSize: '13px',
          boxShadow: '0 8px 32px rgba(0, 245, 212, 0.1)',
        },
        success: {
          iconTheme: { primary: '#00f5d4', secondary: '#050508' },
        },
        error: {
          iconTheme: { primary: '#f87171', secondary: '#050508' },
        },
      }}
    />
  );
}
