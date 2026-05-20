window.SyncRoomSpider = (function () {
  let animId = null;
  let resizeHandler = null;

  function cleanup() {
    if (animId) cancelAnimationFrame(animId);
    animId = null;
    if (resizeHandler) {
      window.removeEventListener('resize', resizeHandler);
      resizeHandler = null;
    }
  }

  function init() {
    cleanup();
    const canvas = document.getElementById('web');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let w = 0;
    let h = 0;

    const spider = {
      x: 0,
      y: 0,
      angle: 0,
      legPhase: 0,
      targetX: 0,
      targetY: 0,
      speed: 0.6,
    };

    const threads = [];

    function resize() {
      w = canvas.clientWidth || window.innerWidth;
      h = canvas.clientHeight || window.innerHeight;
      canvas.width = w;
      canvas.height = h;
      spider.x = w * 0.3;
      spider.y = h * 0.3;
      pickTarget();
      threads.length = 0;
      const anchors = 6;
      for (let i = 0; i < anchors; i++) {
        threads.push({
          ax: (w / (anchors + 1)) * (i + 1),
          ay: 40 + Math.random() * 80,
          sag: 0.15 + Math.random() * 0.1,
        });
      }
    }

    function pickTarget() {
      spider.targetX = 80 + Math.random() * (w - 160);
      spider.targetY = 60 + Math.random() * (h * 0.5);
    }

    function drawWeb() {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 0.5;
      for (const t of threads) {
        ctx.beginPath();
        ctx.moveTo(t.ax, t.ay);
        const midX = (t.ax + spider.x) / 2;
        const midY = (t.ay + spider.y) / 2 + h * t.sag;
        ctx.quadraticCurveTo(midX, midY, spider.x, spider.y);
        ctx.stroke();
      }
      const rings = 5;
      for (let r = 1; r <= rings; r++) {
        const radius = (Math.min(w, h) * 0.35 * r) / rings;
        ctx.beginPath();
        ctx.ellipse(w / 2, h * 0.15, radius, radius * 0.3, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    function drawSpider() {
      ctx.save();
      ctx.translate(spider.x, spider.y);
      ctx.rotate(spider.angle);
      ctx.fillStyle = 'rgba(20, 20, 25, 0.9)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 5, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 60, 40, 0.9)';
      ctx.beginPath();
      ctx.arc(-2, -3, 1.2, 0, Math.PI * 2);
      ctx.arc(2, -3, 1.2, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 8; i++) {
        const side = i < 4 ? -1 : 1;
        const legIndex = i % 4;
        const phase = spider.legPhase + legIndex * 0.8;
        const len = 14 + Math.sin(phase) * 3;
        const spread = (legIndex - 1.5) * 0.35;
        ctx.strokeStyle = 'rgba(30, 30, 35, 0.95)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(side * 3, 0);
        ctx.lineTo(side * (8 + Math.cos(phase) * 4), spread * 12 + Math.sin(phase) * 4);
        ctx.lineTo(side * len, spread * 18);
        ctx.stroke();
      }
      ctx.restore();
    }

    function update() {
      const dx = spider.targetX - spider.x;
      const dy = spider.targetY - spider.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist < 8) pickTarget();
      spider.x += (dx / dist) * spider.speed;
      spider.y += (dy / dist) * spider.speed;
      spider.angle = Math.atan2(dy, dx) + Math.PI / 2;
      spider.legPhase += 0.25;
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      drawWeb();
      drawSpider();
      update();
      animId = requestAnimationFrame(draw);
    }

    resizeHandler = resize;
    resize();
    draw();
    window.addEventListener('resize', resize);
  }

  return { init, cleanup };
})();
