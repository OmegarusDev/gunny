let grainCanvas = null;

export function hexRgb(hex) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbStr(r, g, b, a = 1) {
  return `rgba(${r | 0},${g | 0},${b | 0},${a})`;
}

export function mixHex(a, b, t) {
  const A = hexRgb(a);
  const B = hexRgb(b);
  return rgbStr(A.r + (B.r - A.r) * t, A.g + (B.g - A.g) * t, A.b + (B.b - A.b) * t);
}

export function shadeHex(hex, t) {
  return mixHex(hex, t < 0 ? '#000000' : '#fff6e8', Math.min(1, Math.abs(t)));
}

export function contactShadow(ctx, x, y, rx, ry, alpha = 0.3) {
  ctx.save();
  ctx.fillStyle = `rgba(8,4,2,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function volumeEllipse(ctx, x, y, rx, ry, hex) {
  ctx.fillStyle = shadeHex(hex, -0.32);
  ctx.beginPath();
  ctx.ellipse(x - rx * 0.14, y + ry * 0.08, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = hex;
  ctx.beginPath();
  ctx.ellipse(x, y, rx * 0.92, ry * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = shadeHex(hex, 0.28);
  ctx.beginPath();
  ctx.ellipse(x + rx * 0.28, y - ry * 0.26, rx * 0.4, ry * 0.34, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawHorizonGlow(ctx, viewport, biome) {
  const y = viewport.h * 0.42;
  const g = ctx.createLinearGradient(0, y - 56, 0, y + 90);
  const glow =
    biome.id === 'desert'
      ? 'rgba(255,210,120,0.24)'
      : biome.id === 'transylvania'
        ? 'rgba(80,30,50,0.2)'
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
        : 'rgba(180,90,50,0.12)';
  g.addColorStop(0, haze);
  g.addColorStop(0.55, haze);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, viewport.h * 0.28, viewport.w, viewport.h * 0.36);
}

export function drawHeatHaze(ctx, viewport, biome, t) {
  if (biome.id !== 'desert') return;
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
  const n = biome.id === 'desert' ? 42 : biome.id === 'transylvania' ? 16 : 28;
  const color =
    biome.id === 'desert'
      ? 'rgba(255,220,150,0.18)'
      : biome.id === 'transylvania'
        ? 'rgba(200,180,255,0.1)'
        : 'rgba(255,236,200,0.14)';
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const hx = hash01(i + 91 + biome.id.charCodeAt(0));
    const hy = hash01(i + 17);
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
    viewport.w * 0.78,
  );
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.58, 'rgba(0,0,0,0)');
  g.addColorStop(1, biome.id === 'transylvania' ? 'rgba(2,1,6,0.62)' : 'rgba(12,6,4,0.42)');
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
      const v = 108 + hash01(i * 13 + 7) * 44;
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
  ctx.fillStyle = 'rgba(10, 6, 3, 0.58)';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, 5);
  else ctx.rect(x, y, w, h);
  ctx.fill();
  ctx.strokeStyle = 'rgba(212, 176, 122, 0.32)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 230, 190, 0.16)';
  ctx.beginPath();
  ctx.moveTo(x + 8, y + 1);
  ctx.lineTo(x + w - 8, y + 1);
  ctx.stroke();
  ctx.restore();
}

function hash01(n) {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}
