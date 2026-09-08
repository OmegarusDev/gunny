import { PLAYER_SCREEN_X_RATIO } from '../../config.js';
import { mixHex, shadeHex } from '../fx.js';
import { uhash, worldLeft } from './util.js';

export function drawHills(ctx, viewport, run) {
  const biome = run.biome;
  const left = worldLeft(run.player.worldX, viewport);
  const jagged = biome.id !== 'desert' && biome.id !== 'quarry';
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
      y -=
        biome.id === 'transylvania'
          ? 8 + a * a * 30 + b * 12
          : biome.id === 'fen'
            ? 3 + a * 10 + b * 5
            : 5 + a * 16 + b * 7;
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

  if (biome.id === 'fen') {
    ctx.fillStyle = 'rgba(18, 28, 24, 0.55)';
    for (let px = 12; px < viewport.w; px += 11) {
      const worldX = player.worldX - viewport.w * PLAYER_SCREEN_X_RATIO + px;
      const h = uhash(Math.floor(worldX / 11) + 12);
      if (h < 0.5) continue;
      const y = terrain.height(worldX);
      ctx.globalAlpha = 0.25 + h * 0.35;
      ctx.beginPath();
      ctx.ellipse(px, y + 9 + h * 3, 6 + h * 5, 1.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

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
