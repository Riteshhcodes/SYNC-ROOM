window.SyncRoomFire = (function () {
  let animationId = null;
  let resizeHandler = null;

  function cleanup() {
    if (animationId) cancelAnimationFrame(animationId);
    animationId = null;
    if (resizeHandler) {
      window.removeEventListener('resize', resizeHandler);
      resizeHandler = null;
    }
  }

  function init() {
    cleanup();
    const canvas = document.getElementById('fire-overlay');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const textCanvas = document.createElement('canvas');
    const textCtx = textCanvas.getContext('2d');

    let width = 0;
    let height = 0;
    let fire = [];
    let palette = [];

    for (let i = 0; i < 256; i++) {
      const r = Math.min(255, i * 3);
      const g = Math.min(255, Math.max(0, i * 3 - 100));
      const b = Math.min(255, Math.max(0, i * 3 - 200));
      palette.push(`rgb(${r},${g},${b})`);
    }

    function resize() {
      width = canvas.clientWidth || window.innerWidth;
      height = canvas.clientHeight || window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      textCanvas.width = width;
      textCanvas.height = height;
      fire = new Array(width * height).fill(0);

      textCtx.clearRect(0, 0, width, height);
      const fontSize = Math.min(width * 0.12, 280);
      textCtx.font = `bold ${fontSize}px 'Outfit', Arial, sans-serif`;
      textCtx.textAlign = 'center';
      textCtx.textBaseline = 'middle';
      textCtx.fillStyle = '#fff';
      textCtx.fillText('SYNC_ROOM', width / 2, height * 0.38);

      const data = textCtx.getImageData(0, 0, width, height).data;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          if (data[idx + 3] > 128) {
            fire[y * width + x] = Math.min(36, fire[y * width + x] + 24);
          }
        }
      }
    }

    function updateFire() {
      for (let x = 0; x < width; x++) {
        fire[(height - 1) * width + x] = Math.floor(Math.random() * 16);
      }
      for (let y = 0; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const i = y * width + x;
          const spread = Math.floor(Math.random() * 3) - 1;
          const below = (y + 1) * width + (x + spread);
          fire[i] = Math.floor(
            (fire[below] + fire[below + 1] + fire[below - 1] + fire[i]) / 3.2
          );
          if (fire[i] > 36) fire[i] = 36;
        }
      }
    }

    function drawFire() {
      const image = ctx.createImageData(width, height);
      const data = image.data;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const heat = fire[y * width + x];
          const idx = (y * width + x) * 4;
          if (heat > 0) {
            const color = palette[Math.min(255, heat * 7)];
            const m = color.match(/\d+/g);
            data[idx] = +m[0];
            data[idx + 1] = +m[1];
            data[idx + 2] = +m[2];
            data[idx + 3] = Math.min(255, heat * 12);
          }
        }
      }
      ctx.putImageData(image, 0, 0);
    }

    function loop() {
      updateFire();
      drawFire();
      animationId = requestAnimationFrame(loop);
    }

    resizeHandler = resize;
    resize();
    loop();
    window.addEventListener('resize', resize);
  }

  return { init, cleanup };
})();
