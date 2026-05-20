export default function BicycleLoader({ label = 'CONNECTING TO SERVER...' }) {
  return (
    <div className="bike-loader">
      <svg className="bike" viewBox="0 0 48 30" width="80" height="50">
        <g transform="translate(0,2)">
          <circle className="bike__wheel bike__wheel--back" cx="10" cy="22" r="6" />
          <circle className="bike__wheel bike__wheel--front" cx="36" cy="22" r="6" />
          <path
            className="bike__body"
            d="M10 22 L18 14 L28 14 L36 22 M18 14 L22 8 L28 14 M22 8 L24 6"
          />
          <rect className="bike__seat" x="20" y="6" width="4" height="2" rx="1" />
          <rect className="bike__handle" x="32" y="10" width="3" height="2" rx="0.5" />
          <g className="bike__pedals">
            <circle className="bike__pedal" cx="22" cy="18" r="2" />
            <circle className="bike__pedal" cx="22" cy="18" r="5" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />
          </g>
        </g>
      </svg>
      <p className="text-sm tracking-widest text-white/40 animate-pulse">{label}</p>
    </div>
  );
}
