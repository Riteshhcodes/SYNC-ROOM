export default function GhostLoader({ label = 'AWAITING CONNECTION...' }) {
  return (
    <div className="flex flex-col items-center">
      <div className="ghost-container">
        <div className="ghost">
          <div className="ghost__eyes" />
          <div className="ghost__dimples" />
          <div className="ghost__feet">
            <div className="ghost__feet-foot" />
            <div className="ghost__feet-foot" />
            <div className="ghost__feet-foot" />
            <div className="ghost__feet-foot" />
          </div>
        </div>
        <div className="shadow" />
      </div>
      <p className="text-sm tracking-widest text-white/40 mt-4">{label}</p>
    </div>
  );
}
