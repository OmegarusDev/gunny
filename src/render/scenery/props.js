import { shadeHex } from '../fx.js';
import {
  inViewX,
  pineHalf,
  tilesInView,
  toScreen,
  treeHalf,
  TREE_TYPES,
  uhash,
  worldLeft,
} from './util.js';

export function drawFarScenery(ctx, viewport, run) {
  const biome = run.biome;
  const viewW = viewport.w;
  const left = worldLeft(run.player.worldX, viewport);
  const spacing =
    biome.id === 'desert' ? 150 : biome.id === 'transylvania' ? 52 : biome.id === 'fen' ? 42 : biome.id === 'quarry' ? 92 : 64;
  const maxHalf = biome.id === 'desert' || biome.id === 'fen' || biome.id === 'quarry' ? 48 : 112;
  const { start, end } = tilesInView(left, viewW, spacing, maxHalf);
  ctx.save();
  ctx.globalAlpha = biome.id === 'desert' ? 0.78 : 0.68;
  for (let wx = start; wx < end; wx += spacing) {
    const sx = toScreen(wx, run.player.worldX, viewport);
    if (!inViewX(sx, maxHalf, viewW)) continue;
    const id = Math.floor(wx / spacing) + 40 + biome.id.charCodeAt(0);
    const h = uhash(id);
    const ground = run.terrain.height(wx) - 36 - h * 18;
    if (biome.id === 'desert') {
      if (inViewX(sx, 28, viewW)) drawDuneBush(ctx, sx, ground, h, biome);
    } else if (biome.id === 'transylvania') {
      if (inViewX(sx, pineHalf(0.9), viewW)) drawPine(ctx, sx, ground, 90 + h * 60, biome, 0.9, id);
    } else if (biome.id === 'fen') {
      if (inViewX(sx, 14, viewW)) drawReed(ctx, sx, ground + 8, 28 + h * 22, biome, id);
    } else if (biome.id === 'quarry') {
      if (inViewX(sx, 40, viewW)) drawSpoil(ctx, sx, ground + 12, 34 + h * 28, biome);
    } else {
      const th = 78 + h * 48;
      if (inViewX(sx, treeHalf(th), viewW)) drawTree(ctx, sx, ground, th, biome, 0.78, id);
    }
  }
  ctx.restore();
  if (biome.id === 'transylvania') drawCastle(ctx, viewport, run);
  if (biome.id === 'quarry') drawGantry(ctx, viewport, run);
}

export function drawNearScenery(ctx, viewport, run) {
  const biome = run.biome;
  const viewW = viewport.w;
  const left = worldLeft(run.player.worldX, viewport);
  const spacing = biome.id === 'desert' ? 96 : biome.id === 'fen' ? 36 : biome.id === 'quarry' ? 70 : 50;
  const maxHalf = biome.id === 'desert' || biome.id === 'fen' || biome.id === 'quarry' ? 48 : 160;
  const { start, end } = tilesInView(left, viewW, spacing, maxHalf);
  for (let wx = start; wx < end; wx += spacing) {
    const id = Math.floor(wx / spacing);
    const h = uhash(id + 9);
    const plantX = wx + (h - 0.5) * 14;
    const sx = toScreen(plantX, run.player.worldX, viewport);
    if (!inViewX(sx, maxHalf, viewW)) continue;
    const verge = run.terrain.height(plantX) - 10;
    if (biome.id === 'desert') {
      if (h > 0.62 && inViewX(sx, 22, viewW)) drawCactus(ctx, sx, verge, 36 + h * 40, biome, id);
      else if (h > 0.38 && inViewX(sx, 18, viewW)) drawRock(ctx, sx, verge + 8, 12 + h * 14, biome, id);
    } else if (biome.id === 'transylvania') {
      if (h > 0.42 && inViewX(sx, pineHalf(1), viewW)) drawPine(ctx, sx, verge, 120 + h * 80, biome, 1, id);
      if (h > 0.7 && inViewX(sx, 18, viewW)) drawFence(ctx, sx, verge + 8);
    } else if (biome.id === 'fen') {
      if (h > 0.22 && inViewX(sx, 16, viewW)) drawReed(ctx, sx, verge + 6, 46 + h * 50, biome, id);
      if (h > 0.72 && inViewX(sx, 20, viewW)) drawSnag(ctx, sx + 8, verge + 4, 28 + h * 22, biome, id);
    } else if (biome.id === 'quarry') {
      if (h > 0.55 && inViewX(sx, 22, viewW)) drawRock(ctx, sx, verge + 8, 14 + h * 16, biome, id);
      else if (h > 0.28 && inViewX(sx, 28, viewW)) drawRail(ctx, sx, verge + 6, biome);
      if (h > 0.82 && inViewX(sx, 28, viewW)) drawSpoil(ctx, sx, verge + 4, 22 + h * 16, biome);
    } else {
      const th = 110 + h * 72;
      if (h > 0.34 && inViewX(sx, treeHalf(th), viewW)) drawTree(ctx, sx, verge, th, biome, 1, id);
      if (h > 0.78 && inViewX(sx, 18, viewW)) drawFence(ctx, sx, verge + 8);
      if (h < 0.2 && inViewX(sx, 12, viewW)) drawGrassTuft(ctx, sx, verge + 10, biome);
    }
  }
}

export function drawForeground(ctx, viewport, run) {
  const biome = run.biome;
  const viewW = viewport.w;
  const left = worldLeft(run.player.worldX, viewport);
  const spacing = 120;
  const maxHalf = biome.id === 'desert' || biome.id === 'quarry' ? 40 : biome.id === 'fen' ? 24 : 165;
  const { start, end } = tilesInView(left, viewW, spacing, maxHalf);
  for (let wx = start; wx < end; wx += spacing) {
    const id = Math.floor(wx / spacing) + 200;
    const h = uhash(id);
    if (h < 0.45) continue;
    const sx = toScreen(wx, run.player.worldX, viewport);
    if (!inViewX(sx, maxHalf, viewW)) continue;
    const y = viewport.h + 8;
    if (biome.id === 'desert') {
      if (inViewX(sx, 24, viewW)) drawRock(ctx, sx, y - 6, 18 + h * 16, biome, id);
    } else if (biome.id === 'transylvania') {
      if (inViewX(sx, pineHalf(1.15), viewW)) drawPine(ctx, sx, y, 160 + h * 50, biome, 1.15, id);
    } else if (biome.id === 'fen') {
      if (inViewX(sx, 18, viewW)) drawReed(ctx, sx, y - 4, 90 + h * 40, biome, id);
    } else if (biome.id === 'quarry') {
      if (inViewX(sx, 32, viewW)) drawSpoil(ctx, sx, y - 2, 36 + h * 22, biome);
    } else {
      const th = 140 + h * 48;
      if (inViewX(sx, treeHalf(th), viewW)) drawTree(ctx, sx, y, th, biome, 1.2, id);
    }
  }
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
  const chalk = biome.id === 'quarry';
  const desert = biome.id === 'desert';
  ctx.fillStyle = shadeHex(desert ? '#8a6848' : chalk ? '#9a8e7a' : '#3a3228', -0.1);
  const skew = (uhash(seed + 4) - 0.5) * 0.4;
  ctx.beginPath();
  ctx.moveTo(x - s, ground);
  ctx.lineTo(x - s * (0.5 + skew), ground - s * (0.65 + uhash(seed + 1) * 0.25));
  ctx.lineTo(x + s * skew, ground - s * (0.85 + uhash(seed + 2) * 0.2));
  ctx.lineTo(x + s * (0.85 + skew * 0.3), ground - s * (0.3 + uhash(seed + 3) * 0.2));
  ctx.lineTo(x + s * 0.8, ground);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = shadeHex(desert ? '#c4a070' : chalk ? '#d4c8b0' : '#5a4a3a', 0.05);
  ctx.beginPath();
  ctx.moveTo(x + s * skew, ground - s * (0.85 + uhash(seed + 2) * 0.2));
  ctx.lineTo(x + s * (0.85 + skew * 0.3), ground - s * (0.3 + uhash(seed + 3) * 0.2));
  ctx.lineTo(x + s * 0.35, ground - s * 0.2);
  ctx.closePath();
  ctx.fill();
}

function drawReed(ctx, x, ground, h, biome, seed) {
  seed >>>= 0;
  const n = 5 + (seed % 4);
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const hx = uhash(seed * 13 + i);
    const lean = (hx - 0.5) * 12;
    const hh = h * (0.5 + hx * 0.55);
    const px = x + (i - n / 2) * 3.4;
    ctx.strokeStyle = shadeHex(biome.canopy[i % biome.canopy.length], hx > 0.55 ? 0.12 : -0.18);
    ctx.lineWidth = 1.15 + hx;
    ctx.beginPath();
    ctx.moveTo(px, ground);
    ctx.quadraticCurveTo(px + lean * 0.25, ground - hh * 0.52, px + lean, ground - hh);
    ctx.stroke();
    if (hx > 0.42) {
      ctx.fillStyle = shadeHex(biome.canopy[0], -0.15);
      ctx.beginPath();
      ctx.ellipse(px + lean, ground - hh, 3.1, 1.35, lean * 0.06, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawSnag(ctx, x, ground, h, biome, seed) {
  const lean = (uhash(seed) - 0.5) * 0.45 * h;
  ctx.fillStyle = shadeHex(biome.trunk, -0.08);
  ctx.beginPath();
  ctx.moveTo(x - 4, ground);
  ctx.lineTo(x - 2 + lean, ground - h);
  ctx.lineTo(x + 3 + lean, ground - h * 0.9);
  ctx.lineTo(x + 5, ground);
  ctx.fill();
  ctx.fillStyle = shadeHex(biome.trunk, 0.14);
  ctx.fillRect(x + lean - 1, ground - h * 0.62, 9, 2.2);
}

function drawSpoil(ctx, x, ground, h, biome) {
  ctx.fillStyle = shadeHex(biome.hillNear, -0.08);
  ctx.beginPath();
  ctx.moveTo(x - h * 0.72, ground);
  ctx.lineTo(x - h * 0.08, ground - h * 0.52);
  ctx.lineTo(x + h * 0.18, ground - h * 0.74);
  ctx.lineTo(x + h * 0.78, ground);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = shadeHex(biome.hillFar, 0.14);
  ctx.beginPath();
  ctx.moveTo(x - h * 0.12, ground - h * 0.38);
  ctx.lineTo(x + h * 0.18, ground - h * 0.74);
  ctx.lineTo(x + h * 0.42, ground - h * 0.34);
  ctx.fill();
}

function drawRail(ctx, x, ground, biome) {
  ctx.fillStyle = shadeHex(biome.trunk, -0.12);
  ctx.fillRect(x - 24, ground - 3, 48, 2);
  ctx.fillRect(x - 24, ground - 8, 48, 2);
  ctx.fillStyle = shadeHex(biome.soil, -0.18);
  for (let i = -2; i <= 2; i++) ctx.fillRect(x + i * 10 - 3, ground - 1, 7, 4);
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
  if (!inViewX(sx + 26, 52, viewport.w)) return;
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

function drawGantry(ctx, viewport, run) {
  const wx = Math.floor(run.player.worldX / 1400) * 1400 + 520;
  const sx = toScreen(wx, run.player.worldX, viewport);
  if (!inViewX(sx + 22, 44, viewport.w)) return;
  const y = run.terrain.height(wx) - 8;
  const biome = run.biome;
  ctx.strokeStyle = shadeHex(biome.trunk, 0.04);
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(sx, y);
  ctx.lineTo(sx, y - 78);
  ctx.moveTo(sx + 44, y + 6);
  ctx.lineTo(sx + 44, y - 78);
  ctx.moveTo(sx, y - 78);
  ctx.lineTo(sx + 44, y - 78);
  ctx.moveTo(sx + 22, y - 78);
  ctx.lineTo(sx + 22, y - 58);
  ctx.stroke();
  ctx.fillStyle = shadeHex(biome.accent, -0.18);
  ctx.fillRect(sx + 19, y - 58, 6, 10);
}
