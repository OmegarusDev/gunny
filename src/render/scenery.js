import { PLAYER_SCREEN_X_RATIO } from '../config.js';
import { BIOMES } from '../data/biomes.js';
import { createTerrain } from '../world/terrain.js';
import { mixHex, shadeHex } from './fx.js';

function uhash(n) {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

const TREE_TYPES = [
  [
    [0, 0.58, 0.36],
    [-0.2, 0.44, 0.24],
    [0.18, 0.48, 0.22],
    [0.02, 0.72, 0.18],
  ],
  [
    [0, 0.7, 0.22],
    [-0.12, 0.52, 0.2],
    [0.12, 0.54, 0.18],
    [0, 0.88, 0.16],
  ],
  [
    [0, 0.42, 0.28],
    [-0.28, 0.38, 0.22],
    [0.26, 0.38, 0.22],
    [-0.08, 0.55, 0.2],
    [0.1, 0.55, 0.18],
  ],
  [
    [-0.1, 0.58, 0.32],
    [-0.3, 0.46, 0.24],
    [0.12, 0.5, 0.18],
    [-0.02, 0.74, 0.16],
  ],
  [
    [0.1, 0.58, 0.32],
    [0.28, 0.46, 0.24],
    [-0.14, 0.5, 0.18],
    [0.04, 0.74, 0.16],
  ],
  [
    [-0.22, 0.58, 0.24],
    [0.22, 0.56, 0.24],
    [0, 0.42, 0.16],
    [-0.1, 0.72, 0.14],
    [0.12, 0.7, 0.14],
  ],
  [
    [0, 0.62, 0.3],
    [-0.24, 0.4, 0.2],
    [0.24, 0.38, 0.2],
    [0, 0.48, 0.22],
  ],
  [
    [0, 0.68, 0.38],
    [-0.22, 0.62, 0.18],
    [0.22, 0.62, 0.18],
  ],
];

function worldLeft(playerWorldX, viewport) {
  return playerWorldX - viewport.w * PLAYER_SCREEN_X_RATIO;
}

function toScreen(worldX, playerWorldX, viewport) {
  return worldX - worldLeft(playerWorldX, viewport);
}

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
  } else {
    const sunX = viewport.w * (biome.id === 'desert' ? 0.8 : 0.84);
    const sunY = viewport.h * (biome.id === 'desert' ? 0.16 : 0.22);
    const sunR = biome.id === 'desert' ? 42 : 28;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = biome.id === 'desert' ? '#fff1c0' : '#ffb060';
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
    glow.addColorStop(0.28, biome.id === 'desert' ? 'rgba(255,244,196,0.6)' : 'rgba(255,170,70,0.5)');
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
    for (let i = 0; i < 8; i++) {
      const hx = uhash(i + biome.id.charCodeAt(0));
      const cx = viewport.w * (0.04 + hx * 0.78);
      const cy = viewport.h * (0.08 + uhash(i + 4) * 0.16);
      const rw = 62 + hx * 58;
      const rh = 15 + hx * 9;
      ctx.fillStyle = biome.id === 'desert' ? 'rgba(40, 28, 16, 0.08)' : 'rgba(12, 8, 16, 0.16)';
      ctx.beginPath();
      ctx.ellipse(cx - 4, cy + 5, rw, rh, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = biome.id === 'desert' ? 'rgba(255,255,255,0.2)' : 'rgba(48, 32, 52, 0.18)';
      ctx.beginPath();
      ctx.ellipse(cx, cy, rw, rh, 0, 0, Math.PI * 2);
      ctx.ellipse(cx - rw * 0.35, cy + 4, rw * 0.55, rh * 0.78, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + rw * 0.3, cy + 3, rw * 0.45, rh * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = biome.id === 'desert' ? 'rgba(255,255,255,0.12)' : 'rgba(80, 60, 90, 0.1)';
      ctx.beginPath();
      ctx.ellipse(cx + rw * 0.12, cy - 4, rw * 0.42, rh * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawHills(ctx, viewport, run) {
  const biome = run.biome;
  const left = worldLeft(run.player.worldX, viewport);
  const jagged = biome.id !== 'desert';
  drawRidge(ctx, viewport, left, biome.hillFar, viewport.h * 0.46, 38, 0.0007, jagged, biome, 1);
  drawRidge(ctx, viewport, left, biome.hillNear, viewport.h * 0.54, 26, 0.0012, jagged, biome, 2);
}

function drawRidge(ctx, viewport, left, color, yBase, amp, freq, jagged, biome, layer) {
  const faded = layer === 1 ? mixHex(color, biome.sky[1], 0.34) : mixHex(color, biome.sky[1], 0.08);
  const parallax = 0.22 + layer * 0.12;
  const ys = [];
  for (let px = 0; px <= viewport.w; px += 6) {
    const wx = left * parallax + px;
    let y = yBase + Math.sin(wx * freq + layer) * amp + Math.cos(wx * freq * 0.45) * amp * 0.4;
    if (jagged) {
      const a = Math.abs(Math.sin(wx * 0.018 + layer * 1.7));
      const b = Math.abs(Math.sin(wx * 0.041 + layer));
      y -= biome.id === 'transylvania' ? 8 + a * a * 30 + b * 12 : 5 + a * 16 + b * 7;
    }
    ys.push(y);
  }
  ctx.fillStyle = faded;
  ctx.beginPath();
  ctx.moveTo(0, viewport.h);
  ctx.lineTo(0, ys[0]);
  ys.forEach((y, i) => ctx.lineTo(i * 6, y));
  ctx.lineTo(viewport.w, viewport.h);
  ctx.closePath();
  ctx.fill();
  const shade = ctx.createLinearGradient(0, yBase - 40, 0, viewport.h * 0.72);
  shade.addColorStop(0, 'rgba(255,255,255,0)');
  shade.addColorStop(1, 'rgba(0,0,0,0.18)');
  ctx.fillStyle = shade;
  ctx.fill();
  ctx.strokeStyle = mixHex(color, biome.sky[0], 0.45);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ys.forEach((y, i) => (i ? ctx.lineTo(i * 6, y) : ctx.moveTo(0, y)));
  ctx.stroke();
}

export function drawFarScenery(ctx, viewport, run) {
  const biome = run.biome;
  const left = worldLeft(run.player.worldX, viewport);
  const spacing = biome.id === 'desert' ? 150 : biome.id === 'transylvania' ? 52 : 64;
  const start = Math.floor((left - 90) / spacing) * spacing;
  ctx.save();
  ctx.globalAlpha = biome.id === 'desert' ? 0.78 : 0.68;
  for (let wx = start; wx < left + viewport.w + 90; wx += spacing) {
    const id = Math.floor(wx / spacing) + 40 + biome.id.charCodeAt(0);
    const h = uhash(id);
    const sx = toScreen(wx, run.player.worldX, viewport);
    const ground = run.terrain.height(wx) - 36 - h * 18;
    if (biome.id === 'desert') drawDuneBush(ctx, sx, ground, h, biome);
    else if (biome.id === 'transylvania') drawPine(ctx, sx, ground, 90 + h * 60, biome, 0.9, id);
    else drawTree(ctx, sx, ground, 78 + h * 48, biome, 0.78, id);
  }
  ctx.restore();
  if (biome.id === 'transylvania') drawCastle(ctx, viewport, run);
}

export function drawNearScenery(ctx, viewport, run) {
  const biome = run.biome;
  const left = worldLeft(run.player.worldX, viewport);
  const spacing = biome.id === 'desert' ? 96 : 50;
  const start = Math.floor((left - 40) / spacing) * spacing;
  for (let wx = start; wx < left + viewport.w + 40; wx += spacing) {
    const id = Math.floor(wx / spacing);
    const h = uhash(id + 9);
    const plantX = wx + (h - 0.5) * 14;
    const sx = toScreen(plantX, run.player.worldX, viewport);
    const verge = run.terrain.height(plantX) - 10;
    if (biome.id === 'desert') {
      if (h > 0.62) drawCactus(ctx, sx, verge, 36 + h * 40, biome, id);
      else if (h > 0.38) drawRock(ctx, sx, verge + 8, 12 + h * 14, biome, id);
    } else if (biome.id === 'transylvania') {
      if (h > 0.42) drawPine(ctx, sx, verge, 120 + h * 80, biome, 1, id);
      if (h > 0.7) drawFence(ctx, sx, verge + 8);
    } else {
      if (h > 0.34) drawTree(ctx, sx, verge, 110 + h * 72, biome, 1, id);
      if (h > 0.78) drawFence(ctx, sx, verge + 8);
      if (h < 0.2) drawGrassTuft(ctx, sx, verge + 10, biome);
    }
  }
}

export function drawForeground(ctx, viewport, run) {
  const biome = run.biome;
  const left = worldLeft(run.player.worldX, viewport);
  const spacing = 120;
  const start = Math.floor((left - 60) / spacing) * spacing;
  for (let wx = start; wx < left + viewport.w + 60; wx += spacing) {
    const id = Math.floor(wx / spacing) + 200;
    const h = uhash(id);
    if (h < 0.45) continue;
    const sx = toScreen(wx, run.player.worldX, viewport);
    if (sx < 380 || sx > viewport.w - 190) continue;
    const y = viewport.h + 8;
    if (biome.id === 'desert') drawRock(ctx, sx, y - 6, 18 + h * 16, biome, id);
    else if (biome.id === 'transylvania') drawPine(ctx, sx, y, 160 + h * 50, biome, 1.15, id);
    else drawTree(ctx, sx, y, 140 + h * 48, biome, 1.2, id);
  }
}

export function drawGround(ctx, viewport, run) {
  const biome = run.biome;
  const { terrain, player } = run;
  const pts = [];
  for (let px = 0; px <= viewport.w; px += 4) {
    const worldX = player.worldX - viewport.w * PLAYER_SCREEN_X_RATIO + px;
    pts.push({ px, y: terrain.height(worldX) });
  }
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.px, p.y) : ctx.moveTo(p.px, p.y)));
  ctx.lineTo(viewport.w, viewport.h);
  ctx.lineTo(0, viewport.h);
  ctx.closePath();
  const soil = ctx.createLinearGradient(0, viewport.h * 0.55, 0, viewport.h);
  soil.addColorStop(0, shadeHex(biome.soil, 0.08));
  soil.addColorStop(0.22, biome.soil);
  soil.addColorStop(1, shadeHex(biome.soil, -0.22));
  ctx.fillStyle = soil;
  ctx.fill();

  strokeAlong(ctx, pts, 1, shadeHex(biome.grass, -0.18), 48);
  strokeAlong(ctx, pts, 0, biome.grass, 40);
  strokeAlong(ctx, pts, -1, shadeHex(biome.verge, 0.12), 26);
  strokeAlong(ctx, pts, 8, shadeHex(biome.road, -0.16), 11);
  strokeAlong(ctx, pts, -5, biome.road, 10);
  strokeAlong(ctx, pts, -7, shadeHex(biome.road, 0.14), 3);
  strokeAlong(ctx, pts, 8, biome.rut, 1.8);
  strokeAlong(ctx, pts, -5, biome.rut, 1.8);

  ctx.strokeStyle = shadeHex(biome.grass, 0.1);
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  for (let px = 8; px < viewport.w; px += 7) {
    const worldX = player.worldX - viewport.w * PLAYER_SCREEN_X_RATIO + px;
    const h = uhash(Math.floor(worldX / 7) + 44);
    if (h < 0.55) continue;
    const y = terrain.height(worldX);
    ctx.moveTo(px, y + 2);
    ctx.lineTo(px + (h - 0.75) * 6, y - 5 - h * 7);
  }
  ctx.stroke();

  ctx.fillStyle = shadeHex(biome.road, -0.28);
  for (let px = 10; px < viewport.w; px += 9) {
    const worldX = player.worldX - viewport.w * PLAYER_SCREEN_X_RATIO + px;
    const h = uhash(Math.floor(worldX / 9) + 90);
    if (h < 0.62) continue;
    const y = terrain.height(worldX);
    ctx.globalAlpha = 0.35 + h * 0.25;
    ctx.beginPath();
    ctx.ellipse(px + (h - 0.5) * 5, y + 6 + h * 4, 1.4 + h, 0.6, h, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (biome.mist) {
    const mist = ctx.createLinearGradient(0, viewport.h * 0.5, 0, viewport.h * 0.72);
    mist.addColorStop(0, 'rgba(0,0,0,0)');
    mist.addColorStop(1, biome.mist);
    ctx.fillStyle = mist;
    ctx.fillRect(0, viewport.h * 0.48, viewport.w, viewport.h * 0.28);
  }
}

function strokeAlong(ctx, pts, dy, color, width) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.px, p.y + dy) : ctx.moveTo(p.px, p.y + dy)));
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'butt';
  ctx.stroke();
}

function drawTree(ctx, x, ground, h, biome, scale, seed) {
  seed >>>= 0;
  const type = TREE_TYPES[seed % TREE_TYPES.length];
  const lean = (uhash(seed + 11) - 0.5) * 0.14 * h;
  const trunkW = (4.5 + uhash(seed + 2) * 4) * scale;
  const trunkH = h * (0.46 + uhash(seed + 7) * 0.1);
  ctx.fillStyle = shadeHex(biome.trunk, -0.25);
  ctx.beginPath();
  ctx.moveTo(x - trunkW * 0.55, ground);
  ctx.lineTo(x - trunkW * 0.32 + lean, ground - trunkH);
  ctx.lineTo(x + trunkW * 0.08 + lean, ground - trunkH);
  ctx.lineTo(x + trunkW * 0.1, ground);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = shadeHex(biome.trunk, 0.12);
  ctx.beginPath();
  ctx.moveTo(x + trunkW * 0.08 + lean, ground - trunkH);
  ctx.lineTo(x + trunkW * 0.32 + lean, ground - trunkH);
  ctx.lineTo(x + trunkW * 0.55, ground);
  ctx.lineTo(x + trunkW * 0.1, ground);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(8,4,2,0.22)';
  ctx.beginPath();
  ctx.ellipse(x - 10 * scale, ground + 3, 16 * scale + h * 0.08, 4.5 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  const shade = biome.canopy[(seed + 3) % biome.canopy.length];
  const hi = biome.canopy[(seed + 5) % biome.canopy.length];
  ctx.fillStyle = shadeHex(shade, -0.18);
  ctx.beginPath();
  for (let i = 0; i < type.length; i++) {
    const [dx, dy, r] = type[i];
    const jx = (uhash(seed + 17 + i) - 0.5) * 0.07;
    const jy = (uhash(seed + 31 + i) - 0.5) * 0.05;
    const rr = r * h * (0.9 + uhash(seed + 41 + i) * 0.18);
    const cx = x + lean + (dx + jx) * h;
    const cy = ground - (dy + jy) * h;
    ctx.moveTo(cx + rr, cy);
    ctx.arc(cx, cy, rr, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.fillStyle = hi;
  ctx.beginPath();
  for (let i = 0; i < type.length; i++) {
    const [dx, dy, r] = type[i];
    const jx = (uhash(seed + 17 + i) - 0.5) * 0.07;
    const jy = (uhash(seed + 31 + i) - 0.5) * 0.05;
    const rr = r * h * (0.72 + uhash(seed + 41 + i) * 0.12);
    const cx = x + lean + (dx + jx) * h + rr * 0.22;
    const cy = ground - (dy + jy) * h - rr * 0.18;
    ctx.moveTo(cx + rr * 0.65, cy);
    ctx.arc(cx, cy, rr * 0.65, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.fillStyle = shadeHex(hi, 0.35);
  ctx.globalAlpha = 0.45;
  const [tdx, tdy, tr] = type[0];
  ctx.beginPath();
  ctx.arc(x + lean + (tdx + 0.06) * h, ground - (tdy + 0.08) * h, tr * h * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawPine(ctx, x, ground, h, biome, scale, seed) {
  seed >>>= 0;
  const tiers = 3 + (seed % 3);
  const lean = (uhash(seed + 8) - 0.5) * 10 * scale;
  ctx.fillStyle = shadeHex(biome.trunk, -0.2);
  ctx.fillRect(x - 2.5 * scale + lean * 0.2, ground - h * 0.22, 3 * scale, h * 0.22);
  ctx.fillStyle = shadeHex(biome.trunk, 0.15);
  ctx.fillRect(x + 0.5 * scale + lean * 0.2, ground - h * 0.22, 2.2 * scale, h * 0.22);
  ctx.fillStyle = 'rgba(8,4,2,0.2)';
  ctx.beginPath();
  ctx.ellipse(x - 8 * scale, ground + 2, 14 * scale, 3.6 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < tiers; i++) {
    const t = i / Math.max(1, tiers - 1);
    const top = ground - h + i * (h / (tiers + 0.4));
    const w = (9 + t * 22 + uhash(seed + 20 + i) * 6) * scale;
    const drop = h * (0.26 + uhash(seed + 40 + i) * 0.08);
    const ox = lean * (1 - t * 0.5);
    ctx.fillStyle = shadeHex(biome.canopy[(seed + i) % biome.canopy.length], -0.12);
    ctx.beginPath();
    ctx.moveTo(x + ox, top);
    ctx.lineTo(x - w + ox, top + drop);
    ctx.lineTo(x + w + ox, top + drop);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = shadeHex(biome.canopy[(seed + i) % biome.canopy.length], 0.18);
    ctx.beginPath();
    ctx.moveTo(x + ox + 1, top + 2);
    ctx.lineTo(x + w * 0.15 + ox, top + drop * 0.55);
    ctx.lineTo(x + w * 0.72 + ox, top + drop);
    ctx.lineTo(x + ox, top + drop * 0.35);
    ctx.closePath();
    ctx.fill();
  }
}

function drawCactus(ctx, x, ground, h, biome, seed) {
  seed >>>= 0;
  const base = biome.canopy[seed % biome.canopy.length];
  const dark = shadeHex(base, -0.18);
  const lit = shadeHex(base, 0.2);
  ctx.fillStyle = 'rgba(8,4,2,0.22)';
  ctx.beginPath();
  ctx.ellipse(x - 6, ground + 2, 12, 3.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = dark;
  ctx.fillRect(x - 5, ground - h + 5, 10, h - 5);
  ctx.fillStyle = lit;
  ctx.fillRect(x - 1, ground - h + 5, 4, h - 5);
  ctx.beginPath();
  ctx.arc(x, ground - h + 5, 5, 0, Math.PI * 2);
  ctx.fill();
  const left = uhash(seed + 1) > 0.28;
  const right = uhash(seed + 2) > 0.32;
  if (left) {
    const ly = 0.45 + uhash(seed + 3) * 0.22;
    const lh = h * (0.18 + uhash(seed + 4) * 0.16);
    ctx.fillStyle = dark;
    ctx.fillRect(x - 16, ground - h * ly, 14, 6);
    ctx.fillRect(x - 16, ground - h * ly, 6, lh);
    ctx.fillStyle = lit;
    ctx.fillRect(x - 14, ground - h * ly, 3, lh);
    ctx.beginPath();
    ctx.arc(x - 13, ground - h * ly, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  if (right) {
    const ry = 0.38 + uhash(seed + 5) * 0.2;
    const rh = h * (0.14 + uhash(seed + 6) * 0.14);
    ctx.fillStyle = dark;
    ctx.fillRect(x + 5, ground - h * ry, 12, 6);
    ctx.fillRect(x + 11, ground - h * ry, 6, rh);
    ctx.fillStyle = lit;
    ctx.fillRect(x + 14, ground - h * ry, 3, rh);
    ctx.beginPath();
    ctx.arc(x + 14, ground - h * ry, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawDuneBush(ctx, x, ground, h, biome) {
  const rx = 12 + h * 10;
  const ry = 6 + h * 4;
  ctx.fillStyle = 'rgba(8,4,2,0.16)';
  ctx.beginPath();
  ctx.ellipse(x - 4, ground + 1, rx, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = shadeHex(biome.canopy[1] || biome.canopy[0], -0.2);
  ctx.beginPath();
  ctx.ellipse(x - 2, ground - 4, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = biome.canopy[1] || biome.canopy[0];
  ctx.beginPath();
  ctx.ellipse(x + 3, ground - 6, rx * 0.72, ry * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawRock(ctx, x, ground, s, biome, seed = 1) {
  seed >>>= 0;
  ctx.fillStyle = shadeHex(biome.id === 'desert' ? '#8a6848' : '#3a3228', -0.1);
  const skew = (uhash(seed + 4) - 0.5) * 0.4;
  ctx.beginPath();
  ctx.moveTo(x - s, ground);
  ctx.lineTo(x - s * (0.5 + skew), ground - s * (0.65 + uhash(seed + 1) * 0.25));
  ctx.lineTo(x + s * skew, ground - s * (0.85 + uhash(seed + 2) * 0.2));
  ctx.lineTo(x + s * (0.85 + skew * 0.3), ground - s * (0.3 + uhash(seed + 3) * 0.2));
  ctx.lineTo(x + s * 0.8, ground);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = shadeHex(biome.id === 'desert' ? '#c4a070' : '#5a4a3a', 0.05);
  ctx.beginPath();
  ctx.moveTo(x + s * skew, ground - s * (0.85 + uhash(seed + 2) * 0.2));
  ctx.lineTo(x + s * (0.85 + skew * 0.3), ground - s * (0.3 + uhash(seed + 3) * 0.2));
  ctx.lineTo(x + s * 0.35, ground - s * 0.2);
  ctx.closePath();
  ctx.fill();
}

function drawGrassTuft(ctx, x, ground, biome) {
  ctx.strokeStyle = biome.verge;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x, ground);
  ctx.lineTo(x - 4, ground - 8);
  ctx.moveTo(x, ground);
  ctx.lineTo(x + 3, ground - 10);
  ctx.moveTo(x, ground);
  ctx.lineTo(x + 6, ground - 7);
  ctx.stroke();
}

function drawFence(ctx, x, ground) {
  ctx.fillStyle = 'rgba(8,4,2,0.18)';
  ctx.beginPath();
  ctx.ellipse(x - 2, ground + 1, 8, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4a3a2c';
  ctx.fillRect(x - 2, ground - 26, 4, 26);
  ctx.fillStyle = '#7a624c';
  ctx.fillRect(x, ground - 26, 1.6, 26);
  ctx.fillStyle = '#5a4636';
  ctx.fillRect(x - 16, ground - 17, 32, 2.4);
  ctx.fillRect(x - 16, ground - 11, 32, 2.2);
  ctx.fillStyle = '#8a7060';
  ctx.fillRect(x - 16, ground - 17, 32, 0.7);
  ctx.fillRect(x - 16, ground - 11, 32, 0.7);
}

function drawCastle(ctx, viewport, run) {
  const wx = Math.floor(run.player.worldX / 1100) * 1100 + 640;
  const sx = toScreen(wx, run.player.worldX, viewport);
  if (sx < -100 || sx > viewport.w + 100) return;
  const y = viewport.h * 0.38;
  ctx.fillStyle = '#07080e';
  ctx.fillRect(sx, y, 52, 70);
  ctx.fillRect(sx - 18, y + 22, 18, 48);
  ctx.fillRect(sx + 52, y + 14, 22, 56);
  ctx.fillRect(sx + 14, y - 22, 12, 22);
  ctx.fillRect(sx + 38, y - 14, 10, 14);
  ctx.fillStyle = '#161822';
  ctx.fillRect(sx + 32, y, 20, 70);
  ctx.fillRect(sx + 60, y + 14, 14, 56);
  ctx.fillStyle = '#07080e';
  for (let i = 0; i < 5; i++) ctx.fillRect(sx + i * 11, y - 6, 6, 6);
  ctx.fillStyle = '#3a1020';
  ctx.fillRect(sx + 10, y + 28, 8, 12);
  ctx.fillRect(sx + 28, y + 28, 8, 12);
  ctx.fillRect(sx + 18, y + 50, 10, 20);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = 'rgba(180, 30, 40, 0.35)';
  ctx.beginPath();
  ctx.arc(sx + 14, y + 34, 7, 0, Math.PI * 2);
  ctx.arc(sx + 32, y + 34, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function hubTerrain(viewport, biomeIndex = 0) {
  return createTerrain(1801 + (biomeIndex % 3) * 131, viewport.h);
}

export function hubRun(viewport, t, biomeIndex = 0) {
  return {
    biome: BIOMES[biomeIndex % BIOMES.length],
    player: { worldX: -t * 36 },
    terrain: hubTerrain(viewport, biomeIndex),
  };
}
