import { PLAYER_SCREEN_X_RATIO } from '../config.js';
import { worldToScreen } from '../entities/player.js';
import { shotSpreadDeg } from '../entities/loadout.js';
import { drawCreature, drawEnemyVitals, drawFrozenCorpse, drawRagdollBody, drawSurvivor } from './creatures.js';
import { gunWorld } from '../figure.js';
import { rangeDamageMul } from '../systems/ballistics.js';
import { drawReloadGauge } from './hud.js';
import {
  drawAirHaze,
  drawGrain,
  drawHeatHaze,
  drawHorizonGlow,
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
  drawAimCrosshair(ctx, run);
}

function drawPlayer(ctx, run, viewport) {
  if (run.dying || run.player.dead) return;
  const sx = viewport.w * PLAYER_SCREEN_X_RATIO;
  drawSurvivor(ctx, run.player, sx);
  const p = run.player;
  const w = run.weapon;
  const gun = gunWorld(p);
  const mx = sx + gun.sx + Math.cos(p.aimAngle) * gun.len;
  const my = p.y + gun.sy + Math.sin(p.aimAngle) * gun.len;
  const bloom = (shotSpreadDeg(run.stats, w) / Math.max(0.001, run.stats.bloomCap)) * 18;
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

function drawAimCrosshair(ctx, run) {
  const aim = run.aim;
  if (!aim || run.ended || run.dying) return;
  const { x, y, anchorX, anchorY, reach, clamped, fullScreen } = aim;
  const spread = shotSpreadDeg(run.stats, run.weapon);
  const cone = 7 + spread * 1.85;
  const gap = 6;
  const arm = cone + 6;
  const hair = clamped ? 'rgba(224, 150, 98, 0.95)' : 'rgba(243, 230, 208, 0.82)';
  const pip = clamped ? 'rgba(196, 69, 54, 0.95)' : 'rgba(224, 163, 58, 0.92)';

  ctx.save();
  if (clamped && !fullScreen) {
    const ang = Math.atan2(y - anchorY, x - anchorX);
    const tick = 0.2;
    ctx.strokeStyle = 'rgba(196, 69, 54, 0.72)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(anchorX, anchorY, reach, ang - tick, ang + tick);
    ctx.stroke();
  }

  ctx.strokeStyle = hair;
  ctx.lineWidth = 2.15;
  ctx.beginPath();
  ctx.moveTo(x - arm, y);
  ctx.lineTo(x - gap, y);
  ctx.moveTo(x + gap, y);
  ctx.lineTo(x + arm, y);
  ctx.moveTo(x, y - arm);
  ctx.lineTo(x, y - gap);
  ctx.moveTo(x, y + gap);
  ctx.lineTo(x, y + arm);
  ctx.stroke();

  ctx.strokeStyle = pip;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(5.5, cone * 0.48), 0, Math.PI * 2);
  ctx.stroke();

  if (run.weapon.reloading) {
    ctx.fillStyle = run.weapon.jammed ? 'rgba(196, 69, 54, 0.85)' : 'rgba(243, 230, 208, 0.55)';
    ctx.beginPath();
    ctx.arc(x, y, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawEnemies(ctx, run, viewport) {
  const toScreen = (x, y) => w2s(x, y, run, viewport);
  for (const e of run.enemies) drawCreature(ctx, e, toScreen);
  for (const e of run.enemies) drawEnemyVitals(ctx, e, toScreen);
}

function drawBullets(ctx, run, viewport) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (const b of run.bullets) {
    const p = w2s(b.x, b.y, run, viewport);
    const p2 = w2s(b.x - b.vx * 0.045, b.y - b.vy * 0.045, run, viewport);
    const spent = rangeDamageMul(Math.hypot(b.x - b.ox, b.y - b.oy), b.maxDist);
    const a = 0.22 + 0.78 * Math.max(0.12, spent);
    ctx.globalAlpha = a;
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
    ctx.fillStyle = `rgba(255,255,230,${0.85 * a})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
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
    drawFrozenCorpse(ctx, corpse, (x, y) => w2s(x, y, run, viewport));
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

function drawCallouts(ctx, run, viewport) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const c of run.callouts) {
    const p = w2s(c.x, c.y, run, viewport);
    const max = c.maxLife || 0.7;
    const u = Math.max(0, Math.min(1, c.life / max));
    const fade = u < 0.38 ? u / 0.38 : 1;
    const born = 1 - u;
    const pop = 1 + 0.32 * Math.exp(-born * 9);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(pop, pop);
    ctx.globalAlpha = fade;
    ctx.font = `700 ${c.crit || c.head ? 18 : 16}px Georgia, "Iowan Old Style", serif`;
    ctx.shadowColor = 'rgba(8,4,2,0.9)';
    ctx.shadowBlur = 6;
    ctx.fillStyle = c.head ? '#ffe08a' : c.crit ? '#ff8aa0' : '#f3e6d0';
    ctx.fillText(c.text, 0, 0);
    ctx.restore();
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

export function drawBackdrop(ctx, viewport, t, biomeIndex = 0) {
  const run = hubRun(viewport, t, biomeIndex);
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
