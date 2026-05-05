export default function SpiderOverlay() {
  return (
    <iframe
      src="/realistic-spider.html"
      style={{
        position: 'fixed',
        bottom: 0,
        right: 0,
        width: '400px',
        height: '400px',
        border: 'none',
        background: 'transparent',
        pointerEvents: 'none',
        zIndex: 999,
      }}
      title="spider"
    />
  );
}
