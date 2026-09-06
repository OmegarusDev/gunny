import { BODY_SCALE, PLAYER, PLAYER_SCREEN_X_RATIO } from '../config.js';
import { worldToScreen } from '../entities/player.js';
import { perfectBand, reloadNorm } from '../systems/activeReload.js';
import { runMeters } from '../systems/run.js';
import { drawCreature, drawRagdollBody, drawSurvivor } from './creatures.js';
import { drawFarScenery, drawGround, drawHills, drawNearScenery, drawSky, hubRun } from './scenery.js';

function w2s(x, y, run, viewport) {
  return worldToScreen(x, y, run.player.worldX, viewport);
}

export function drawWorld(ctx, run, viewport) {
  const biome = run.biome;
  drawSky(ctx, viewport, biome);
  drawHills(ctx, viewport, run);
  drawFarScenery(ctx, viewport, run);
  drawGround(ctx, viewport, run);
  drawNearScenery(ctx, viewport, run);
  drawVignette(ctx, viewport, biome);
  drawCorpses(ctx, run, viewport);
  drawRagdolls(ctx, run, viewport);
  drawGibs(ctx, run, viewport);
  drawEnemies(ctx, run, viewport);
  drawPlayer(ctx, run, viewport);
  drawBullets(ctx, run, viewport);
  drawParticles(ctx, run, viewport);
  drawReloadGauge(ctx, run, viewport, biome);
  drawCallouts(ctx, run, viewport);
}

function drawVignette(ctx, viewport, biome) {
  const g = ctx.createRadialGradient(
    viewport.w * 0.5,
    viewport.h * 0.48,
    viewport.h * 0.2,
    viewport.w * 0.5,
    viewport.h * 0.5,
    viewport.w * 0.72,
  );
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, biome.id === 'transylvania' ? 'rgba(4,2,8,0.55)' : 'rgba(20,10,6,0.28)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, viewport.w, viewport.h);
}

function drawPlayer(ctx, run, viewport) {
  const sx = viewport.w * PLAYER_SCREEN_X_RATIO;
  drawSurvivor(ctx, run.player, sx);
  const p = run.player;
  const bloom = (run.weapon.bloom / Math.max(0.001, run.stats.bloomCap)) * 18;
  ctx.strokeStyle = 'rgba(224, 163, 58, 0.4)';
  ctx.beginPath();
  ctx.arc(
    sx + PLAYER.gunX + Math.cos(p.aimAngle) * 70 * BODY_SCALE,
    p.y - PLAYER.gunY + Math.sin(p.aimAngle) * 70 * BODY_SCALE,
    6 + bloom,
    0,
    Math.PI * 2,
  );
  ctx.stroke();
}

function drawEnemies(ctx, run, viewport) {
  for (const e of run.enemies) {
    drawCreature(ctx, e, (x, y) => w2s(x, y, run, viewport));
  }
}

function drawBullets(ctx, run, viewport) {
  ctx.strokeStyle = '#ffe08a';
  ctx.fillStyle = '#ffe08a';
  ctx.lineWidth = 2;
  for (const b of run.bullets) {
    const p = w2s(b.x, b.y, run, viewport);
    const p2 = w2s(b.x - b.vx * 0.03, b.y - b.vy * 0.03, run, viewport);
    ctx.beginPath();
    ctx.moveTo(p2.x, p2.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
  }
  ctx.fillStyle = '#6a5a40';
  for (const im of run.impacts) {
    const p = w2s(im.x, im.y, run, viewport);
    ctx.globalAlpha = Math.max(0, im.life / 0.18);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawRagdolls(ctx, run, viewport) {
  for (const rag of run.ragdolls) {
    drawRagdollBody(ctx, rag, (x, y) => w2s(x, y, run, viewport));
  }
}

function drawCorpses(ctx, run, viewport) {
  ctx.strokeStyle = 'rgba(40, 28, 20, 0.7)';
  ctx.lineWidth = 3;
  for (const corpse of run.frozenCorpses) {
    ctx.beginPath();
    corpse.points.forEach((pt, i) => {
      const p = w2s(pt.x, pt.y, run, viewport);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
  }
}

function drawGibs(ctx, run, viewport) {
  ctx.fillStyle = '#8b1e2d';
  for (const g of run.gibs) {
    const p = w2s(g.x, g.y, run, viewport);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(g.rot);
    ctx.globalAlpha = Math.min(1, g.life);
    ctx.beginPath();
    g.verts.forEach((v, i) => (i ? ctx.lineTo(v.x, v.y) : ctx.moveTo(v.x, v.y)));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function drawParticles(ctx, run, viewport) {
  for (const p of run.particles) {
    const s = w2s(p.x, p.y, run, viewport);
    ctx.fillStyle = '#8b1e2d';
    ctx.globalAlpha = Math.max(0, p.life / (p.max || 0.4));
    ctx.beginPath();
    ctx.arc(s.x, s.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawReloadGauge(ctx, run, viewport, biome) {
  const w = run.weapon;
  if (!w.reloading) return;
  const sx = viewport.w * PLAYER_SCREEN_X_RATIO;
  const y = run.player.y - 58 * BODY_SCALE - 22;
  const r = 26;
  const t = reloadNorm(w);
  const band = perfectBand(run.stats);
  ctx.strokeStyle = 'rgba(40, 24, 16, 0.7)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(sx, y, r, Math.PI, 0);
  ctx.stroke();
  ctx.strokeStyle = '#e0a33a';
  ctx.beginPath();
  ctx.arc(sx, y, r, Math.PI + band.a * Math.PI, Math.PI + band.b * Math.PI);
  ctx.stroke();
  const ang = Math.PI + t * Math.PI;
  ctx.strokeStyle = w.jammed ? '#c44536' : '#f3e6d0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(sx, y);
  ctx.lineTo(sx + Math.cos(ang) * r, y + Math.sin(ang) * r);
  ctx.stroke();
}

function drawCallouts(ctx, run, viewport) {
  ctx.font = '700 12px Georgia, serif';
  ctx.textAlign = 'center';
  for (const c of run.callouts) {
    const p = w2s(c.x, c.y, run, viewport);
    ctx.globalAlpha = Math.max(0, c.life / 0.7);
    ctx.fillStyle = c.head ? '#ffe08a' : c.crit ? '#ff8aa0' : '#f3e6d0';
    ctx.fillText(c.text, p.x, p.y);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

export function drawHud(ctx, run, viewport, profile) {
  const bone = run.biome?.hud || '#f3e6d0';
  const accent = run.biome?.accent || '#c44536';
  ctx.fillStyle = 'rgba(18, 10, 6, 0.42)';
  ctx.fillRect(0, 0, 340, 122);
  ctx.fillRect(0, viewport.h - 78, 420, 78);
  ctx.fillRect(viewport.w - 168, viewport.h - 62, 168, 62);

  ctx.fillStyle = accent;
  ctx.fillRect(18, 12, 28, 3);
  ctx.fillStyle = '#e0a33a';
  ctx.font = '700 16px Georgia, "Iowan Old Style", serif';
  const place = run.biome ? `${run.biome.place.toUpperCase()}  ·  ${run.biome.foe}` : '';
  const mode = run.endless
    ? `ENDLESS  ·  ${place}`
    : `${place}  ·  L${run.levelIndex + 1}`;
  const m = runMeters(run);
  ctx.fillText(mode, 18, 34);
  ctx.fillStyle = bone;
  ctx.font = '13px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`Distance  ${m.toFixed(1)}m`, 18, 54);
  if (!run.endless) ctx.fillText(`Track  ${Math.min(200, m).toFixed(0)} / 200m`, 18, 72);
  ctx.fillText(`Cash  $${Math.floor(profile.cash + run.score.cash)}    XP  ${Math.floor(profile.xp + run.score.xp)}`, 18, run.endless ? 72 : 90);
  ctx.fillText(`Kills  ${run.score.kills}    Headshots  ${run.score.headshots}    Perfects  ${run.score.perfects}`, 18, run.endless ? 90 : 108);

  const w = run.weapon;
  ctx.fillStyle = bone;
  ctx.fillText(`Mag  ${w.ammo}/${run.stats.magSize}${w.perfectMag ? '  +25%' : ''}`, 18, viewport.h - 52);
  ctx.fillText(`Bloom  ${w.bloom.toFixed(1)}° / ${run.stats.bloomCap}°    Heat  ${(w.heat * 100).toFixed(0)}%`, 18, viewport.h - 34);
  ctx.fillStyle = 'rgba(243, 230, 208, 0.72)';
  ctx.fillText(run.lastCallout || 'Click to fire    Click the bar to reload    P pause', 18, viewport.h - 16);

  const magW = 120;
  ctx.strokeStyle = '#e0a33a';
  ctx.strokeRect(viewport.w - 150, viewport.h - 48, magW, 10);
  ctx.fillStyle = '#e0a33a';
  ctx.fillRect(viewport.w - 150, viewport.h - 48, magW * (w.ammo / run.stats.magSize), 10);
  ctx.fillStyle = accent;
  ctx.fillRect(viewport.w - 150, viewport.h - 32, magW * w.heat, 6);

  if (run.paused) {
    ctx.fillStyle = 'rgba(20, 12, 8, 0.55)';
    ctx.fillRect(0, 0, viewport.w, viewport.h);
    ctx.fillStyle = bone;
    ctx.font = '32px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', viewport.w / 2, viewport.h / 2);
    ctx.textAlign = 'left';
  }
}

export function drawBackdrop(ctx, viewport, t) {
  const run = hubRun(viewport, t, Math.floor(t / 9) % 3);
  drawSky(ctx, viewport, run.biome);
  drawHills(ctx, viewport, run);
  drawFarScenery(ctx, viewport, run);
  drawGround(ctx, viewport, run);
  drawNearScenery(ctx, viewport, run);
  drawVignette(ctx, viewport, run.biome);
}
