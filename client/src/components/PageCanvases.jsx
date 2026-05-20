export function PageCanvases({ neural = false, fire = false, spider = true }) {
  return (
    <>
      {neural && (
        <canvas
          id="neural-bg"
          className="canvas-neural absolute inset-0 w-full h-full opacity-30 pointer-events-none"
          aria-hidden
        />
      )}
      {fire && (
        <canvas
          id="fire-overlay"
          className="canvas-fire absolute inset-0 w-full h-full pointer-events-none z-10"
          style={{ mixBlendMode: 'screen' }}
          aria-hidden
        />
      )}
      {spider && (
        <canvas
          id="web"
          className="canvas-spider"
          aria-hidden
        />
      )}
    </>
  );
}
