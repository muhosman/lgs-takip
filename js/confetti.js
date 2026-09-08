// Hafif konfeti — kutlama anları için
let raf = null;

export function confetti(duration = 2200) {
  const cv = document.getElementById('confetti');
  if (!cv) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = innerWidth * dpr;
  cv.height = innerHeight * dpr;
  cv.style.display = 'block';
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const colors = ['#F0679B', '#A38CF0', '#FFC65C', '#5FCFB4', '#63C6E0', '#FF9CC5'];
  const bits = Array.from({ length: 110 }, () => ({
    x: Math.random() * innerWidth,
    y: -20 - Math.random() * innerHeight * 0.5,
    w: 6 + Math.random() * 7,
    h: 9 + Math.random() * 9,
    vy: 2.2 + Math.random() * 3.4,
    vx: -1.4 + Math.random() * 2.8,
    rot: Math.random() * Math.PI,
    vr: -0.16 + Math.random() * 0.32,
    c: colors[(Math.random() * colors.length) | 0],
  }));

  const start = performance.now();
  cancelAnimationFrame(raf);

  (function frame(now) {
    const t = now - start;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const b of bits) {
      b.x += b.vx; b.y += b.vy; b.rot += b.vr; b.vy += 0.035;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot);
      ctx.globalAlpha = Math.max(0, 1 - t / duration);
      ctx.fillStyle = b.c;
      ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
      ctx.restore();
    }
    if (t < duration) raf = requestAnimationFrame(frame);
    else { ctx.clearRect(0, 0, innerWidth, innerHeight); cv.style.display = 'none'; }
  })(start);
}
