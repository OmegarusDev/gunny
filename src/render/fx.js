import { hexRgb, mixHex, rgbStr, shadeHex } from '../util/color.js';
import { uhash } from '../util/hash.js';

export { hexRgb, mixHex, rgbStr, shadeHex };

let grainCanvas = null;

export function drawHorizonGlow(ctx, viewport, biome) {
  const y = viewport.h * 0.42;
  const g = ctx.createLinearGradient(0, y - 56, 0, y + 90);
  const glow =
    biome.id === 'desert'
      ? 'rgba(255,210,120,0.24)'
      : biome.id === 'transylvania'
        ? 'rgba(80,30,50,0.2)'
        : biome.id === 'fen'
          ? 'rgba(70,110,70,0.22)'
          : biome.id === 'quarry'
            ? 'rgba(220,200,160,0.2)'
            : 'rgba(255,140,70,0.22)';
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.45, glow);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, y - 56, viewport.w, 150);
}

export function drawAirHaze(ctx, viewport, biome) {
  const g = ctx.createLinearGradient(0, viewport.h * 0.28, 0, viewport.h * 0.62);
  const haze =
    biome.id === 'desert'
      ? 'rgba(255,220,160,0.18)'
      : biome.id === 'transylvania'
        ? 'rgba(18,10,24,0.28)'
        : biome.id === 'fen'
          ? 'rgba(50,80,60,0.22)'
          : biome.id === 'quarry'
            ? 'rgba(230,220,190,0.16)'
            : 'rgba(180,90,50,0.12)';
  g.addColorStop(0, haze);
  g.addColorStop(0.55, haze);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, viewport.h * 0.28, viewport.w, viewport.h * 0.36);
}

export function drawHeatHaze(ctx, viewport, biome, t) {
  if (biome.id === 'desert') {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = '#ffe8b0';
    for (let i = 0; i < 6; i++) {
      ctx.globalAlpha = 0.045 + (i % 2) * 0.02;
      const y = viewport.h * (0.48 + i * 0.035) + Math.sin(t * 1.5 + i * 1.1) * 4;
      ctx.beginPath();
      ctx.ellipse(viewport.w * (0.42 + (i % 3) * 0.12), y, viewport.w * 0.38, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }
  if (biome.id === 'fen') {
    ctx.save();
    ctx.fillStyle = 'rgba(70, 100, 80, 0.08)';
    for (let i = 0; i < 4; i++) {
      const y = viewport.h * (0.52 + i * 0.04) + Math.sin(t * 0.35 + i) * 6;
      ctx.beginPath();
      ctx.ellipse(viewport.w * (0.4 + (i % 3) * 0.1), y, viewport.w * 0.42, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }
  if (biome.id !== 'quarry') return;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = '#f0e6d0';
  for (let i = 0; i < 5; i++) {
    ctx.globalAlpha = 0.03 + (i % 2) * 0.015;
    const y = viewport.h * (0.46 + i * 0.03) + Math.sin(t * 0.9 + i) * 3;
    ctx.beginPath();
    ctx.ellipse(viewport.w * (0.5 + (i % 3) * 0.08), y, viewport.w * 0.28, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawKeyLight(ctx, viewport, biome) {
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  const g = ctx.createLinearGradient(0, 0, viewport.w, 0);
  if (biome.id === 'transylvania') {
    g.addColorStop(0, 'rgba(4,2,10,0.55)');
    g.addColorStop(0.5, 'rgba(20,12,28,0.12)');
    g.addColorStop(1, 'rgba(180,160,220,0.22)');
  } else if (biome.id === 'desert') {
    g.addColorStop(0, 'rgba(40,20,8,0.22)');
    g.addColorStop(0.45, 'rgba(255,210,140,0.04)');
    g.addColorStop(1, 'rgba(255,236,190,0.28)');
  } else if (biome.id === 'fen') {
    g.addColorStop(0, 'rgba(8,16,12,0.4)');
    g.addColorStop(0.5, 'rgba(40,70,50,0.08)');
    g.addColorStop(1, 'rgba(160,180,120,0.16)');
  } else if (biome.id === 'quarry') {
    g.addColorStop(0, 'rgba(40,28,18,0.26)');
    g.addColorStop(0.5, 'rgba(220,200,170,0.05)');
    g.addColorStop(1, 'rgba(255,236,210,0.22)');
  } else {
    g.addColorStop(0, 'rgba(20,8,6,0.28)');
    g.addColorStop(0.5, 'rgba(255,140,70,0.05)');
    g.addColorStop(1, 'rgba(255,190,110,0.24)');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, viewport.w, viewport.h);
  ctx.restore();
}

export function drawMotes(ctx, viewport, biome, t) {
  const n = biome.id === 'desert' ? 42 : biome.id === 'transylvania' ? 16 : biome.id === 'fen' ? 22 : biome.id === 'quarry' ? 36 : 28;
  const color =
    biome.id === 'desert'
      ? 'rgba(255,220,150,0.18)'
      : biome.id === 'transylvania'
        ? 'rgba(200,180,255,0.1)'
        : biome.id === 'fen'
          ? 'rgba(180,220,160,0.12)'
          : biome.id === 'quarry'
            ? 'rgba(255,244,220,0.16)'
            : 'rgba(255,236,200,0.14)';
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const hx = uhash(i + 91 + biome.id.charCodeAt(0));
    const hy = uhash(i + 17);
    const drift = t * (6 + hx * 18);
    const x = ((hx * viewport.w + drift) % (viewport.w + 30)) - 15;
    const y = viewport.h * (0.16 + hy * 0.55) + Math.sin(t * 0.4 + i) * 6;
    ctx.beginPath();
    ctx.arc(x, y, 0.7 + hx * 1.9, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawVignette(ctx, viewport, biome) {
  const g = ctx.createRadialGradient(
    viewport.w * 0.52,
    viewport.h * 0.46,
    viewport.h * 0.16,
    viewport.w * 0.5,
    viewport.h * 0.5,
    Math.hypot(viewport.w, viewport.h) * 0.62,
  );
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.58, 'rgba(0,0,0,0)');
  g.addColorStop(
    1,
    biome.id === 'transylvania'
      ? 'rgba(2,1,6,0.62)'
      : biome.id === 'fen'
        ? 'rgba(6,12,8,0.5)'
        : 'rgba(12,6,4,0.42)',
  );
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, viewport.w, viewport.h);
  const edge = ctx.createLinearGradient(0, 0, 0, viewport.h);
  edge.addColorStop(0, 'rgba(0,0,0,0.22)');
  edge.addColorStop(0.12, 'rgba(0,0,0,0)');
  edge.addColorStop(0.88, 'rgba(0,0,0,0)');
  edge.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, viewport.w, viewport.h);
}

export function drawGrain(ctx, viewport, t) {
  if (!grainCanvas) {
    grainCanvas = document.createElement('canvas');
    grainCanvas.width = 128;
    grainCanvas.height = 128;
    const g = grainCanvas.getContext('2d');
    const img = g.createImageData(128, 128);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 108 + uhash(i * 13 + 7) * 44;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.globalCompositeOperation = 'overlay';
  const pat = ctx.createPattern(grainCanvas, 'repeat');
  ctx.translate((t * 13) % 128, (t * 9) % 128);
  ctx.fillStyle = pat;
  ctx.fillRect(-128, -128, viewport.w + 256, viewport.h + 256);
  ctx.restore();
}

export function drawHudPanel(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = 'rgba(10, 6, 3, 0.62)';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, 6);
  else ctx.rect(x, y, w, h);
  ctx.fill();
  ctx.strokeStyle = 'rgba(212, 176, 122, 0.28)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 230, 190, 0.14)';
  ctx.beginPath();
  ctx.moveTo(x + 10, y + 1);
  ctx.lineTo(x + w - 10, y + 1);
  ctx.stroke();
  ctx.restore();
}
