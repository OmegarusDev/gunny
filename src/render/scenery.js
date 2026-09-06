import { PLAYER_SCREEN_X_RATIO } from '../config.js';
import { BIOMES } from '../data/biomes.js';

function uhash(n) {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

function worldLeft(playerWorldX, viewport) {
  return playerWorldX - viewport.w * PLAYER_SCREEN_X_RATIO;
}

function toScreen(worldX, playerWorldX, viewport) {
  return worldX - worldLeft(playerWorldX, viewport);
}

export function drawSky(ctx, viewport, biome) {
  const g = ctx.createLinearGradient(0, 0, 0, viewport.h);
  g.addColorStop(0, biome.sky[0]);
  g.addColorStop(0.48, biome.sky[1]);
  g.addColorStop(1, biome.sky[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, viewport.w, viewport.h);

  if (biome.id === 'transylvania') {
    for (let i = 0; i < 52; i++) {
      const hx = uhash(i + 11);
      const hy = uhash(i + 77);
      ctx.fillStyle = `rgba(240,230,200,${0.25 + hx * 0.6})`;
      ctx.fillRect(hx * viewport.w, hy * viewport.h * 0.42, hx > 0.92 ? 2 : 1, hx > 0.92 ? 2 : 1);
    }
    ctx.fillStyle = biome.sun;
    ctx.beginPath();
    ctx.arc(viewport.w * 0.78, viewport.h * 0.14, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = biome.sky[0];
    ctx.beginPath();
    ctx.arc(viewport.w * 0.78 + 10, viewport.h * 0.13, 22, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const sunX = viewport.w * (biome.id === 'desert' ? 0.8 : 0.84);
    const sunY = viewport.h * (biome.id === 'desert' ? 0.16 : 0.22);
    const sunR = biome.id === 'desert' ? 42 : 28;
    const glow = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, sunR * 2.4);
    glow.addColorStop(0, biome.sun);
    glow.addColorStop(0.35, biome.id === 'desert' ? 'rgba(255,244,196,0.55)' : 'rgba(255,180,80,0.45)');
    glow.addColorStop(1, 'rgba(255,140,40,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR * 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = biome.sun;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
    ctx.fill();
  }

  if (biome.id !== 'transylvania') {
    ctx.fillStyle = biome.id === 'desert' ? 'rgba(255,255,255,0.22)' : 'rgba(40, 28, 48, 0.16)';
    for (let i = 0; i < 5; i++) {
      const hx = uhash(i + biome.id.charCodeAt(0));
      ctx.beginPath();
      ctx.ellipse(viewport.w * (0.08 + hx * 0.7), viewport.h * (0.12 + uhash(i + 4) * 0.16), 48 + hx * 40, 12 + hx * 8, 0, 0, Math.PI * 2);
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
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, viewport.h);
  ctx.lineTo(0, yBase);
  for (let px = 0; px <= viewport.w; px += jagged ? 7 : 14) {
    const wx = left * (0.35 + layer * 0.12) + px;
    let y = yBase + Math.sin(wx * freq + layer) * amp + Math.cos(wx * freq * 0.45) * amp * 0.4;
    if (jagged) {
      const h = uhash(Math.floor((left + px) / 14) + layer * 90 + biome.id.charCodeAt(0));
      y -= biome.id === 'transylvania' ? 10 + h * 34 : 6 + h * 22;
    }
    ctx.lineTo(px, y);
  }
  ctx.lineTo(viewport.w, viewport.h);
  ctx.closePath();
  ctx.fill();
}

export function drawFarScenery(ctx, viewport, run) {
  const biome = run.biome;
  const left = worldLeft(run.player.worldX, viewport);
  const spacing = biome.id === 'desert' ? 150 : biome.id === 'transylvania' ? 52 : 64;
  const start = Math.floor((left - 90) / spacing) * spacing;
  for (let wx = start; wx < left + viewport.w + 90; wx += spacing) {
    const h = uhash(Math.floor(wx / spacing) + 40 + biome.id.charCodeAt(0));
    const sx = toScreen(wx, run.player.worldX, viewport);
    const ground = run.terrain.height(wx) - 36 - h * 18;
    if (biome.id === 'desert') drawDuneBush(ctx, sx, ground, h, biome);
    else if (biome.id === 'transylvania') drawPine(ctx, sx, ground, 90 + h * 60, biome, 0.9);
    else drawTree(ctx, sx, ground, 78 + h * 48, biome, 0.78);
  }
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
    const sx = toScreen(wx + (h - 0.5) * 14, run.player.worldX, viewport);
    const verge = run.terrain.height(wx) - 10;
    if (biome.id === 'desert') {
      if (h > 0.62) drawCactus(ctx, sx, verge, 36 + h * 40, biome);
      else if (h > 0.38) drawRock(ctx, sx, verge + 8, 12 + h * 14, biome);
    } else if (biome.id === 'transylvania') {
      if (h > 0.42) drawPine(ctx, sx, verge, 120 + h * 80, biome, 1);
      if (h > 0.7) drawFence(ctx, sx, verge + 8);
    } else {
      if (h > 0.34) drawTree(ctx, sx, verge, 110 + h * 72, biome, 1);
      if (h > 0.78) drawFence(ctx, sx, verge + 8);
      if (h < 0.2) drawGrassTuft(ctx, sx, verge + 10, biome);
    }
  }
  drawForeground(ctx, viewport, run);
}

function drawForeground(ctx, viewport, run) {
  const biome = run.biome;
  const left = worldLeft(run.player.worldX, viewport);
  const spacing = 120;
  const start = Math.floor((left - 60) / spacing) * spacing;
  for (let wx = start; wx < left + viewport.w + 60; wx += spacing) {
    const h = uhash(Math.floor(wx / spacing) + 200);
    if (h < 0.45) continue;
    const sx = toScreen(wx, run.player.worldX, viewport);
    if (sx < 380 || sx > viewport.w - 190) continue;
    const y = viewport.h + 8;
    if (biome.id === 'desert') drawRock(ctx, sx, y - 6, 18 + h * 16, biome);
    else if (biome.id === 'transylvania') drawPine(ctx, sx, y, 160 + h * 50, biome, 1.15);
    else drawTree(ctx, sx, y, 140 + h * 48, biome, 1.2);
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
  ctx.fillStyle = biome.soil;
  ctx.fill();

  strokeAlong(ctx, pts, 0, biome.grass, 44);
  strokeAlong(ctx, pts, 0, biome.verge, 28);
  strokeAlong(ctx, pts, 7, biome.road, 9);
  strokeAlong(ctx, pts, -6, biome.road, 9);
  strokeAlong(ctx, pts, 7, biome.rut, 1.6);
  strokeAlong(ctx, pts, -6, biome.rut, 1.6);

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

function drawTree(ctx, x, ground, h, biome, scale) {
  const canopy = biome.canopy[Math.floor(uhash(Math.floor(x) + 3) * biome.canopy.length) % biome.canopy.length];
  ctx.fillStyle = biome.trunk;
  ctx.fillRect(x - 3.5 * scale, ground - h * 0.5, 7 * scale, h * 0.5);
  ctx.fillStyle = canopy;
  ctx.beginPath();
  ctx.arc(x, ground - h * 0.58, h * 0.36, 0, Math.PI * 2);
  ctx.arc(x - h * 0.2, ground - h * 0.44, h * 0.24, 0, Math.PI * 2);
  ctx.arc(x + h * 0.18, ground - h * 0.48, h * 0.22, 0, Math.PI * 2);
  ctx.arc(x + h * 0.02, ground - h * 0.72, h * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,220,0.08)';
  ctx.beginPath();
  ctx.arc(x - h * 0.08, ground - h * 0.62, h * 0.12, 0, Math.PI * 2);
  ctx.fill();
}

function drawPine(ctx, x, ground, h, biome, scale) {
  ctx.fillStyle = biome.trunk;
  ctx.fillRect(x - 2.5 * scale, ground - h * 0.22, 5 * scale, h * 0.22);
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = biome.canopy[i % biome.canopy.length];
    const top = ground - h + i * h * 0.18;
    const w = (11 + i * 8) * scale;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x - w, top + h * 0.28);
    ctx.lineTo(x + w, top + h * 0.28);
    ctx.closePath();
    ctx.fill();
  }
}

function drawCactus(ctx, x, ground, h, biome) {
  ctx.fillStyle = biome.canopy[0];
  ctx.fillRect(x - 5, ground - h + 5, 10, h - 5);
  ctx.beginPath();
  ctx.arc(x, ground - h + 5, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x - 16, ground - h * 0.58, 14, 6);
  ctx.fillRect(x - 16, ground - h * 0.58, 6, h * 0.28);
  ctx.beginPath();
  ctx.arc(x - 13, ground - h * 0.58, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x + 5, ground - h * 0.46, 12, 6);
  ctx.fillRect(x + 11, ground - h * 0.46, 6, h * 0.22);
  ctx.beginPath();
  ctx.arc(x + 14, ground - h * 0.46, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawDuneBush(ctx, x, ground, h, biome) {
  ctx.fillStyle = biome.canopy[1] || biome.canopy[0];
  ctx.beginPath();
  ctx.ellipse(x, ground - 5, 12 + h * 10, 6 + h * 4, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawRock(ctx, x, ground, s, biome) {
  ctx.fillStyle = biome.id === 'desert' ? '#8a6848' : '#3a3228';
  ctx.beginPath();
  ctx.moveTo(x - s, ground);
  ctx.lineTo(x - s * 0.45, ground - s * 0.75);
  ctx.lineTo(x + s * 0.2, ground - s * 0.95);
  ctx.lineTo(x + s, ground - s * 0.4);
  ctx.lineTo(x + s * 0.8, ground);
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
  ctx.strokeStyle = '#6a5340';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, ground);
  ctx.lineTo(x, ground - 26);
  ctx.moveTo(x - 16, ground - 16);
  ctx.lineTo(x + 16, ground - 16);
  ctx.moveTo(x - 16, ground - 10);
  ctx.lineTo(x + 16, ground - 10);
  ctx.stroke();
}

function drawCastle(ctx, viewport, run) {
  const wx = Math.floor(run.player.worldX / 1100) * 1100 + 640;
  const sx = toScreen(wx, run.player.worldX, viewport);
  if (sx < -100 || sx > viewport.w + 100) return;
  const y = viewport.h * 0.38;
  ctx.fillStyle = '#0a0b12';
  ctx.fillRect(sx, y, 52, 70);
  ctx.fillRect(sx - 18, y + 22, 18, 48);
  ctx.fillRect(sx + 52, y + 14, 22, 56);
  ctx.fillRect(sx + 14, y - 22, 12, 22);
  ctx.fillRect(sx + 38, y - 14, 10, 14);
  for (let i = 0; i < 5; i++) ctx.fillRect(sx + i * 11, y - 6, 6, 6);
  ctx.fillStyle = '#3a1020';
  ctx.fillRect(sx + 10, y + 28, 8, 12);
  ctx.fillRect(sx + 28, y + 28, 8, 12);
  ctx.fillRect(sx + 18, y + 50, 10, 20);
}

export function hubTerrain(viewport, t) {
  return {
    height(x) {
      return viewport.h * 0.72 + Math.sin(x * 0.008 + t * 0.28) * 12 + Math.cos(x * 0.018) * 6;
    },
  };
}

export function hubRun(viewport, t, biomeIndex = 0) {
  return {
    biome: BIOMES[biomeIndex % BIOMES.length],
    player: { worldX: -t * 36 },
    terrain: hubTerrain(viewport, t),
  };
}
