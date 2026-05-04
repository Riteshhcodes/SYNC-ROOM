export function triggerBurnReveal(onComplete) {
  // Dynamically load the script if not already loaded
  if (!document.getElementById('burn-reveal-script')) {
    const script = document.createElement('script');
    script.id = 'burn-reveal-script';
    script.type = 'module';
    script.src = '/burning-reveal.js';
    document.body.appendChild(script);
    // Wait for script to load then call
    script.onload = () => {
      if (window.__triggerBurnReveal) window.__triggerBurnReveal(onComplete);
    };
  } else {
    if (window.__triggerBurnReveal) window.__triggerBurnReveal(onComplete);
  }
}
