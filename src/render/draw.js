import { BODY_SCALE, PLAYER, PLAYER_SCREEN_X_RATIO } from '../config.js';
import { worldToScreen } from '../entities/player.js';
import { perfectBand, reloadNorm } from '../systems/activeReload.js';
import { runMeters } from '../systems/run.js';
import { drawCreature, drawRagdollBody, drawSurvivor } from './creatures.js';
import {
  drawAirHaze,
  drawGrain,
  drawHeatHaze,
  drawHorizonGlow,
  drawHudPanel,
  drawKeyLight,
  drawMotes,
  drawVignette,
} from './fx.js';
import {
  drawFarScenery,
  drawForeground,
  drawGround,
  drawHills,
  drawNearScenery,
  drawSky,
  hubRun,
} from './scenery.js';

function w2s(x, y, run, viewport) {
  return worldToScreen(x, y, run.player.worldX, viewport);
}

function composeScene(ctx, viewport, run, t) {
  const biome = run.biome;
  drawSky(ctx, viewport, biome);
  drawHills(ctx, viewport, run);
  drawFarScenery(ctx, viewport, run);
  drawHorizonGlow(ctx, viewport, biome);
  drawAirHaze(ctx, viewport, biome);
  drawGround(ctx, viewport, run);
  drawHeatHaze(ctx, viewport, biome, t);
  drawNearScenery(ctx, viewport, run);
}

export function drawWorld(ctx, run, viewport) {
  const t = performance.now() / 1000;
  const biome = run.biome;
  composeScene(ctx, viewport, run, t);
  drawKeyLight(ctx, viewport, biome);
  drawGrain(ctx, viewport, t);
  drawCorpses(ctx, run, viewport);
  drawRagdolls(ctx, run, viewport);
  drawGibs(ctx, run, viewport);
  drawEnemies(ctx, run, viewport);
  drawPlayer(ctx, run, viewport);
  drawBullets(ctx, run, viewport);
  drawParticles(ctx, run, viewport);
  ctx.save();
  ctx.globalAlpha = 0.92;
  drawForeground(ctx, viewport, run);
  ctx.restore();
  drawMotes(ctx, viewport, biome, t);
  drawVignette(ctx, viewport, biome);
  drawReloadGauge(ctx, run, viewport);
  drawCallouts(ctx, run, viewport);
}

function drawPlayer(ctx, run, viewport) {
  const sx = viewport.w * PLAYER_SCREEN_X_RATIO;
  drawSurvivor(ctx, run.player, sx);
  const p = run.player;
  const w = run.weapon;
  const mx = sx + PLAYER.gunX + Math.cos(p.aimAngle) * PLAYER.muzzle;
  const my = p.y - PLAYER.gunY + Math.sin(p.aimAngle) * PLAYER.muzzle;
  const bloom = (w.bloom / Math.max(0.001, run.stats.bloomCap)) * 18;
  ctx.save();
  ctx.strokeStyle = 'rgba(224, 163, 58, 0.28)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(mx, my, 7 + bloom, 0, Math.PI * 2);
  ctx.stroke();
  const shot = w.firing && w.cooldown > 0 ? Math.min(1, w.cooldown * run.stats.rof * 1.35) : 0;
  if (shot > 0.08) {
    ctx.globalCompositeOperation = 'lighter';
    const flash = ctx.createRadialGradient(mx, my, 1, mx, my, 22 + shot * 10);
    flash.addColorStop(0, `rgba(255,245,210,${0.85 * shot})`);
    flash.addColorStop(0.28, `rgba(255,180,70,${0.45 * shot})`);
    flash.addColorStop(1, 'rgba(255,120,20,0)');
    ctx.fillStyle = flash;
    ctx.beginPath();
    ctx.arc(mx, my, 22 + shot * 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255,250,230,${0.9 * shot})`;
    ctx.beginPath();
    ctx.ellipse(mx, my, 7 + shot * 4, 2.4, p.aimAngle, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawEnemies(ctx, run, viewport) {
  for (const e of run.enemies) {
    drawCreature(ctx, e, (x, y) => w2s(x, y, run, viewport));
  }
}

function drawBullets(ctx, run, viewport) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (const b of run.bullets) {
    const p = w2s(b.x, b.y, run, viewport);
    const p2 = w2s(b.x - b.vx * 0.045, b.y - b.vy * 0.045, run, viewport);
    ctx.strokeStyle = 'rgba(255, 170, 60, 0.28)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(p2.x, p2.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 230, 150, 0.85)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(p2.x, p2.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 7);
    glow.addColorStop(0, 'rgba(255,255,230,0.95)');
    glow.addColorStop(1, 'rgba(255,180,40,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  for (const im of run.impacts) {
    const p = w2s(im.x, im.y, run, viewport);
    const a = Math.max(0, im.life / 0.18);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(90, 70, 48, 0.7)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 2, 7 + (1 - a) * 10, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(255, 210, 140, ${0.35 * a})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawRagdolls(ctx, run, viewport) {
  for (const rag of run.ragdolls) {
    drawRagdollBody(ctx, rag, (x, y) => w2s(x, y, run, viewport));
  }
}

function drawCorpses(ctx, run, viewport) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const corpse of run.frozenCorpses) {
    ctx.beginPath();
    corpse.points.forEach((pt, i) => {
      const p = w2s(pt.x, pt.y, run, viewport);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.strokeStyle = 'rgba(18, 10, 6, 0.55)';
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(58, 38, 28, 0.75)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

function drawGibs(ctx, run, viewport) {
  for (const g of run.gibs) {
    const p = w2s(g.x, g.y, run, viewport);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(g.rot);
    ctx.globalAlpha = Math.min(1, g.life);
    ctx.fillStyle = '#5a121c';
    ctx.beginPath();
    g.verts.forEach((v, i) => (i ? ctx.lineTo(v.x, v.y) : ctx.moveTo(v.x, v.y)));
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#a82838';
    ctx.beginPath();
    g.verts.forEach((v, i) =>
      i ? ctx.lineTo(v.x * 0.55, v.y * 0.55) : ctx.moveTo(v.x * 0.55, v.y * 0.55),
    );
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function drawParticles(ctx, run, viewport) {
  for (const p of run.particles) {
    const s = w2s(p.x, p.y, run, viewport);
    const a = Math.max(0, p.life / (p.max || 0.4));
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = '#4a1018';
    ctx.beginPath();
    ctx.arc(s.x, s.y, p.r + 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c44536';
    ctx.beginPath();
    ctx.arc(s.x - 0.4, s.y - 0.5, p.r * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawReloadGauge(ctx, run, viewport) {
  const w = run.weapon;
  if (!w.reloading) return;
  const sx = viewport.w * PLAYER_SCREEN_X_RATIO;
  const y = run.player.y - 58 * BODY_SCALE - 22;
  const r = 26;
  const t = reloadNorm(w);
  const band = perfectBand(run.stats);
  ctx.save();
  ctx.strokeStyle = 'rgba(12, 6, 4, 0.72)';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(sx, y, r, Math.PI, 0);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(80, 48, 24, 0.9)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(sx, y, r, Math.PI, 0);
  ctx.stroke();
  ctx.strokeStyle = '#e0a33a';
  ctx.shadowColor = 'rgba(224, 163, 58, 0.55)';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(sx, y, r, Math.PI + band.a * Math.PI, Math.PI + band.b * Math.PI);
  ctx.stroke();
  ctx.shadowBlur = 0;
  const ang = Math.PI + t * Math.PI;
  ctx.strokeStyle = w.jammed ? '#c44536' : '#f3e6d0';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(sx, y);
  ctx.lineTo(sx + Math.cos(ang) * r, y + Math.sin(ang) * r);
  ctx.stroke();
  ctx.restore();
}

function drawCallouts(ctx, run, viewport) {
  ctx.font = '700 12px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  for (const c of run.callouts) {
    const p = w2s(c.x, c.y, run, viewport);
    ctx.save();
    ctx.globalAlpha = Math.max(0, c.life / 0.7);
    ctx.shadowColor = 'rgba(8,4,2,0.85)';
    ctx.shadowBlur = 6;
    ctx.fillStyle = c.head ? '#ffe08a' : c.crit ? '#ff8aa0' : '#f3e6d0';
    ctx.fillText(c.text, p.x, p.y);
    ctx.restore();
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

export function drawHud(ctx, run, viewport, profile) {
  const bone = run.biome?.hud || '#f3e6d0';
  const accent = run.biome?.accent || '#c44536';
  drawHudPanel(ctx, 8, 8, 348, 118);
  drawHudPanel(ctx, 8, viewport.h - 84, 428, 76);
  drawHudPanel(ctx, viewport.w - 176, viewport.h - 70, 168, 62);

  ctx.fillStyle = accent;
  ctx.fillRect(22, 18, 28, 3);
  ctx.fillStyle = '#e0a33a';
  ctx.font = '700 16px Georgia, "Iowan Old Style", serif';
  const place = run.biome ? `${run.biome.place.toUpperCase()}  ·  ${run.biome.foe}` : '';
  const mode = run.endless
    ? `ENDLESS  ·  ${place}`
    : `${place}  ·  L${run.levelIndex + 1}`;
  const m = runMeters(run);
  ctx.fillText(mode, 22, 40);
  ctx.fillStyle = bone;
  ctx.font = '13px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`Distance  ${m.toFixed(1)}m`, 22, 60);
  if (!run.endless) ctx.fillText(`Track  ${Math.min(200, m).toFixed(0)} / 200m`, 22, 78);
  ctx.fillText(`Cash  $${Math.floor(profile.cash + run.score.cash)}    XP  ${Math.floor(profile.xp + run.score.xp)}`, 22, run.endless ? 78 : 96);
  ctx.fillText(`Kills  ${run.score.kills}    Headshots  ${run.score.headshots}    Perfects  ${run.score.perfects}`, 22, run.endless ? 96 : 114);

  const w = run.weapon;
  ctx.fillStyle = bone;
  ctx.fillText(`Mag  ${w.ammo}/${run.stats.magSize}${w.perfectMag ? '  +25%' : ''}`, 22, viewport.h - 58);
  ctx.fillText(`Bloom  ${w.bloom.toFixed(1)}° / ${run.stats.bloomCap}°    Heat  ${(w.heat * 100).toFixed(0)}%`, 22, viewport.h - 40);
  ctx.fillStyle = 'rgba(243, 230, 208, 0.72)';
  ctx.fillText(run.lastCallout || 'Click to fire    Click the bar to reload    P pause', 22, viewport.h - 22);

  const magW = 120;
  const bx = viewport.w - 158;
  const by = viewport.h - 52;
  ctx.fillStyle = 'rgba(8,4,2,0.55)';
  ctx.fillRect(bx, by, magW, 10);
  const magG = ctx.createLinearGradient(bx, by, bx + magW, by);
  magG.addColorStop(0, '#c48a28');
  magG.addColorStop(1, '#ffe08a');
  ctx.fillStyle = magG;
  ctx.fillRect(bx, by, magW * (w.ammo / Math.max(1, run.stats.magSize)), 10);
  ctx.strokeStyle = 'rgba(224, 163, 58, 0.7)';
  ctx.strokeRect(bx, by, magW, 10);
  const heatG = ctx.createLinearGradient(bx, by + 16, bx + magW, by + 16);
  heatG.addColorStop(0, '#6a2018');
  heatG.addColorStop(1, accent);
  ctx.fillStyle = heatG;
  ctx.fillRect(bx, by + 16, magW * w.heat, 6);

  if (run.paused) {
    ctx.fillStyle = 'rgba(12, 6, 4, 0.58)';
    ctx.fillRect(0, 0, viewport.w, viewport.h);
    ctx.fillStyle = bone;
    ctx.font = '32px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 12;
    ctx.fillText('PAUSED', viewport.w / 2, viewport.h / 2);
    ctx.shadowBlur = 0;
    ctx.textAlign = 'left';
  }
}

export function drawBackdrop(ctx, viewport, t) {
  const run = hubRun(viewport, t, Math.floor(t / 9) % 3);
  composeScene(ctx, viewport, run, t);
  ctx.save();
  ctx.globalAlpha = 0.92;
  drawForeground(ctx, viewport, run);
  ctx.restore();
  drawMotes(ctx, viewport, run.biome, t);
  drawKeyLight(ctx, viewport, run.biome);
  drawVignette(ctx, viewport, run.biome);
  drawGrain(ctx, viewport, t);
}
