import { useEffect, useRef } from 'react';

export default function NeuralBackground({ children }) {
  const containerRef = useRef(null);

  useEffect(() => {
    // The neural network uses Three.js via CDN — inject it dynamically
    const iframe = document.createElement('iframe');
    iframe.src = '/neural-network.html'; // place the HTML in /public
    iframe.style.cssText = `
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      border: none;
      z-index: 1;
      pointer-events: none;
    `;
    containerRef.current?.appendChild(iframe);
    return () => iframe.remove();
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative', overflow: 'visible', width: '100%', height: '100vh' }}>
      {/* Neural network iframe as background */}
      
      {/* Your hero content on top */}
      <div style={{ position: 'relative', zIndex: 20 }}>
        {children}
      </div>
    </div>
  );
}
