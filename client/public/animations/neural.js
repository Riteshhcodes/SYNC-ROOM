window.SyncRoomNeural = (function () {
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
    const canvas = document.getElementById('neural-bg');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let w = 0;
    let h = 0;
    const nodes = [];
    const NODE_COUNT = 55;
    const CONNECT_DIST = 140;

    function resize() {
      w = canvas.clientWidth || window.innerWidth;
      h = canvas.clientHeight || window.innerHeight;
      canvas.width = w;
      canvas.height = h;
      if (nodes.length === 0) {
        for (let i = 0; i < NODE_COUNT; i++) {
          nodes.push({
            x: Math.random() * w,
            y: Math.random() * h,
            z: Math.random(),
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            vz: (Math.random() - 0.5) * 0.002,
          });
        }
      }
    }

    function project(n) {
      return {
        x: n.x,
        y: n.y,
        r: 2 + n.z * 2.5,
        alpha: 0.15 + n.z * 0.5,
      };
    }

    function update() {
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        n.z += n.vz;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
        if (n.z < 0 || n.z > 1) n.vz *= -1;
      }
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      const projected = nodes.map(project);

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dist = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
          if (dist < CONNECT_DIST) {
            const alpha = (1 - dist / CONNECT_DIST) * 0.25 * projected[i].alpha;
            const grad = ctx.createLinearGradient(
              projected[i].x,
              projected[i].y,
              projected[j].x,
              projected[j].y
            );
            grad.addColorStop(0, `rgba(0, 245, 212, ${alpha})`);
            grad.addColorStop(1, `rgba(102, 126, 234, ${alpha})`);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(projected[i].x, projected[i].y);
            ctx.lineTo(projected[j].x, projected[j].y);
            ctx.stroke();
          }
        }
      }

      for (const p of projected) {
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
        g.addColorStop(0, `rgba(0, 245, 212, ${p.alpha})`);
        g.addColorStop(1, 'rgba(102, 126, 234, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
        ctx.fill();
      }

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
