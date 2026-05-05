import { useEffect } from 'react';
import './GooeyFooter.css';

export default function GooeyFooter() {
  useEffect(() => {
    const container = document.getElementById('particle-container');
    if (!container) return;

    const fragment = document.createDocumentFragment();
    for (let i = 0; i < 100; i++) {
      const span = document.createElement('span');
      span.classList.add('particle');

      const size = 3 + Math.random() * 6;
      const distance = 10 + Math.random() * 15;
      const position = Math.random() * 100;
      const time = 3 + Math.random() * 3;
      const delay = -1 * (Math.random() * 10);

      span.style.setProperty('--dim', `${size}rem`);
      span.style.setProperty('--uplift', `${distance}rem`);
      span.style.setProperty('--pos-x', `${position}%`);
      span.style.setProperty('--dur', `${time}s`);
      span.style.setProperty('--delay', `${delay}s`);

      fragment.appendChild(span);
    }
    container.appendChild(fragment);
  }, []);

  return (
    <>
      {/* SVG Filter — required for gooey effect */}
      <svg style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
        <defs>
          <filter id="liquid-effect">
            <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
            <feColorMatrix in="blur" mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
              result="liquid" />
          </filter>
        </defs>
      </svg>

      <footer className="footer-section">
        <div className="gooey-animations" id="particle-container" />
        <div className="footer-content">
          <div className="column">
            <h4>Sync Room</h4>
            <a href="#">About</a>
            <a href="#">Careers</a>
          </div>
          <div className="column">
            <h4>Resources</h4>
            <a href="#">Help Center</a>
            <a href="#">Privacy</a>
          </div>
          <div className="column">
            <h4>Connect</h4>
            <a href="#">Twitter</a>
            <a href="#">LinkedIn</a>
          </div>
        </div>
      </footer>
    </>
  );
}
