import { uhash } from './util.js';

export function drawSky(ctx, viewport, biome) {
  const g = ctx.createLinearGradient(0, 0, 0, viewport.h);
  g.addColorStop(0, biome.sky[0]);
  g.addColorStop(0.38, biome.sky[1]);
  g.addColorStop(0.62, biome.sky[1]);
  g.addColorStop(1, biome.sky[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, viewport.w, viewport.h);

  if (biome.id === 'transylvania') {
    for (let i = 0; i < 70; i++) {
      const hx = uhash(i + 11);
      const hy = uhash(i + 77);
      const twinkle = 0.2 + hx * 0.7;
      ctx.fillStyle = `rgba(240,230,210,${twinkle})`;
      ctx.beginPath();
      ctx.arc(hx * viewport.w, hy * viewport.h * 0.44, hx > 0.9 ? 1.6 : 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
    const mx = viewport.w * 0.78;
    const my = viewport.h * 0.14;
    const moon = ctx.createRadialGradient(mx, my, 4, mx, my, 48);
    moon.addColorStop(0, 'rgba(240,230,200,0.55)');
    moon.addColorStop(1, 'rgba(240,230,200,0)');
    ctx.fillStyle = moon;
    ctx.beginPath();
    ctx.arc(mx, my, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = biome.sun;
    ctx.beginPath();
    ctx.arc(mx, my, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = biome.sky[0];
    ctx.beginPath();
    ctx.arc(mx + 10, my - 4, 22, 0, Math.PI * 2);
    ctx.fill();
  } else if (biome.id === 'fen') {
    const sunX = viewport.w * 0.7;
    const sunY = viewport.h * 0.2;
    const glow = ctx.createRadialGradient(sunX, sunY, 6, sunX, sunY, 70);
    glow.addColorStop(0, 'rgba(200, 210, 150, 0.28)');
    glow.addColorStop(1, 'rgba(200, 210, 150, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = biome.sun;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 16, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const pale = biome.id === 'desert' || biome.id === 'quarry';
    const sunX = viewport.w * (pale ? 0.8 : 0.84);
    const sunY = viewport.h * (pale ? 0.16 : 0.22);
    const sunR = biome.id === 'desert' ? 42 : biome.id === 'quarry' ? 34 : 28;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = pale ? '#fff1c0' : '#ffb060';
    for (let i = 0; i < 7; i++) {
      const a = -0.9 + i * 0.22;
      ctx.beginPath();
      ctx.moveTo(sunX, sunY);
      ctx.lineTo(sunX + Math.cos(a) * viewport.w * 0.7, sunY + Math.sin(a) * viewport.h * 0.7);
      ctx.lineTo(sunX + Math.cos(a + 0.05) * viewport.w * 0.7, sunY + Math.sin(a + 0.05) * viewport.h * 0.7);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    const glow = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, sunR * 3.2);
    glow.addColorStop(0, biome.sun);
    glow.addColorStop(0.28, pale ? 'rgba(255,244,196,0.6)' : 'rgba(255,170,70,0.5)');
    glow.addColorStop(1, 'rgba(255,140,40,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR * 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = biome.sun;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.arc(sunX - sunR * 0.22, sunY - sunR * 0.22, sunR * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  if (biome.id !== 'transylvania') {
    const n = biome.id === 'fen' ? 12 : 8;
    for (let i = 0; i < n; i++) {
      const hx = uhash(i + biome.id.charCodeAt(0));
      const cx = viewport.w * (0.04 + hx * 0.78);
      const cy = viewport.h * (0.08 + uhash(i + 4) * (biome.id === 'fen' ? 0.22 : 0.16));
      const rw = 62 + hx * 58;
      const rh = 15 + hx * 9;
      const dusty = biome.id === 'desert' || biome.id === 'quarry';
      ctx.fillStyle = dusty ? 'rgba(40, 28, 16, 0.08)' : 'rgba(12, 8, 16, 0.16)';
      ctx.beginPath();
      ctx.ellipse(cx - 4, cy + 5, rw, rh, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = dusty
        ? 'rgba(255,255,255,0.2)'
        : biome.id === 'fen'
          ? 'rgba(48, 62, 52, 0.28)'
          : 'rgba(48, 32, 52, 0.18)';
      ctx.beginPath();
      ctx.ellipse(cx, cy, rw, rh, 0, 0, Math.PI * 2);
      ctx.ellipse(cx - rw * 0.35, cy + 4, rw * 0.55, rh * 0.78, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + rw * 0.3, cy + 3, rw * 0.45, rh * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = dusty ? 'rgba(255,255,255,0.12)' : 'rgba(80, 60, 90, 0.1)';
      ctx.beginPath();
      ctx.ellipse(cx + rw * 0.12, cy - 4, rw * 0.42, rh * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
