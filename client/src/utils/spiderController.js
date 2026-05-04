let spiderLoaded = false;

export function initSpider() {
  const canvas = document.getElementById('spider-canvas');
  if (!canvas) return;
  canvas.style.transition = 'opacity 0.8s ease';
  canvas.style.opacity = '1';
  
  if (spiderLoaded) return;
  spiderLoaded = true;

  // Load spider as external script (bypasses Vite bundling entirely)
  const script = document.createElement('script');
  script.src = '/spider-bundle.js';
  script.onload = () => {
    console.log('Spider bundle loaded');
  };
  script.onerror = (e) => {
    console.error('Spider bundle failed to load', e);
  };
  document.body.appendChild(script);
}

export function stopSpider() {
  const canvas = document.getElementById('spider-canvas');
  if (canvas) {
    canvas.style.transition = 'opacity 0.8s ease';
    canvas.style.opacity = '0';
  }
}
