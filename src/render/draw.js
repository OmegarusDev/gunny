import { PLAYER_SCREEN_X_RATIO, TRACK_METERS, PERFECT_MAG_MULT } from '../config.js';
import { worldToScreen } from '../entities/player.js';
import { runMeters } from '../world/metrics.js';
import { perfectBand, reloadGaugeBounds, reloadNorm } from '../view/reload.js';
import { fillRoundRect, strokeRoundRect } from '../util/color.js';
import { shotSpreadDeg } from '../entities/loadout.js';
import { drawCreature, drawFrozenCorpse, drawRagdollBody, drawSurvivor } from './creatures.js';
import { gunWorld } from '../figure.js';
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
  drawAimCrosshair(ctx, run);
}

function drawPlayer(ctx, run, viewport) {
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
  if (!aim || run.ended) return;
  const { x, y, anchorX, anchorY, reach, clamped } = aim;
  const spread = shotSpreadDeg(run.stats, run.weapon);
  const cone = 5 + spread * 1.6;

  ctx.save();
  ctx.strokeStyle = clamped ? 'rgba(196, 169, 144, 0.22)' : 'rgba(212, 176, 122, 0.18)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.arc(anchorX, anchorY, reach, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = 'rgba(243, 230, 208, 0.55)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x - cone - 3, y);
  ctx.lineTo(x - 4, y);
  ctx.moveTo(x + 4, y);
  ctx.lineTo(x + cone + 3, y);
  ctx.moveTo(x, y - cone - 3);
  ctx.lineTo(x, y - 4);
  ctx.moveTo(x, y + 4);
  ctx.lineTo(x, y + cone + 3);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(224, 163, 58, 0.7)';
  ctx.beginPath();
  ctx.arc(x, y, Math.max(3, cone * 0.35), 0, Math.PI * 2);
  ctx.stroke();

  if (run.weapon.reloading) {
    ctx.fillStyle = run.weapon.jammed ? 'rgba(196, 69, 54, 0.85)' : 'rgba(243, 230, 208, 0.55)';
    ctx.beginPath();
    ctx.arc(x, y, 2.2, 0, Math.PI * 2);
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

function drawReloadGauge(ctx, run, viewport) {
  const w = run.weapon;
  if (!w.reloading) return;
  const { barX: x, barY: y, barW, barH } = reloadGaugeBounds(viewport);
  const t = reloadNorm(w);
  const band = perfectBand(run.stats);
  const jam = w.jammed;
  ctx.save();
  ctx.fillStyle = 'rgba(8, 4, 2, 0.78)';
  fillRoundRect(ctx, x - 8, y - 12, barW + 16, barH + 24, 7);
  ctx.strokeStyle = jam ? 'rgba(196, 69, 54, 0.55)' : 'rgba(212, 176, 122, 0.35)';
  ctx.lineWidth = 1;
  strokeRoundRect(ctx, x - 8, y - 12, barW + 16, barH + 24, 7);

  ctx.fillStyle = 'rgba(48, 28, 14, 0.95)';
  fillRoundRect(ctx, x, y, barW, barH, 4);

  ctx.fillStyle = jam ? 'rgba(196, 69, 54, 0.55)' : 'rgba(224, 163, 58, 0.92)';
  ctx.fillRect(x + band.a * barW, y + 2, Math.max(2, (band.b - band.a) * barW), barH - 4);

  const nx = x + t * barW;
  ctx.fillStyle = jam ? '#c44536' : '#f3e6d0';
  ctx.fillRect(nx - 1.5, y - 5, 3, barH + 10);
  ctx.beginPath();
  ctx.moveTo(nx, y - 5);
  ctx.lineTo(nx - 5, y - 13);
  ctx.lineTo(nx + 5, y - 13);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = jam ? '#e07060' : 'rgba(243, 230, 208, 0.7)';
  ctx.font = '700 11px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(jam ? 'JAMMED' : 'TAP', x + barW * 0.5, y + barH + 18);
  ctx.textAlign = 'left';
  ctx.restore();
}

function drawCallouts(ctx, run, viewport) {
  ctx.font = '700 12px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  for (const c of run.callouts) {
    const p = w2s(c.x, c.y, run, viewport);
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, c.life / 0.7));
    ctx.shadowColor = 'rgba(8,4,2,0.85)';
    ctx.shadowBlur = 5;
    ctx.fillStyle = c.head ? '#ffe08a' : c.crit ? '#ff8aa0' : '#f3e6d0';
    ctx.fillText(c.text, p.x, p.y);
    ctx.restore();
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function drawMeterBar(ctx, x, y, w, h, fill, fillColor, edge) {
  ctx.fillStyle = 'rgba(8,4,2,0.55)';
  fillRoundRect(ctx, x, y, w, h, 3);
  const fw = Math.max(0, Math.min(1, fill)) * w;
  if (fw > 0) {
    ctx.fillStyle = fillColor;
    fillRoundRect(ctx, x, y, fw, h, 3);
  }
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1;
  strokeRoundRect(ctx, x, y, w, h, 3);
}

export function drawHud(ctx, run, viewport, profile) {
  const bone = run.biome?.hud || '#f3e6d0';
  const accent = run.biome?.accent || '#c44536';
  const endless = run.endless;
  const topH = endless ? 92 : 118;
  drawHudPanel(ctx, 8, 8, 340, topH);
  drawHudPanel(ctx, 8, viewport.h - 78, 400, 70);
  drawHudPanel(ctx, viewport.w - 168, viewport.h - 66, 160, 58);

  ctx.fillStyle = accent;
  ctx.fillRect(22, 18, 26, 3);
  ctx.fillStyle = '#e0a33a';
  ctx.font = '700 15px Georgia, "Iowan Old Style", serif';
  const place = run.biome ? `${run.biome.place.toUpperCase()}  ·  ${run.biome.foe}` : '';
  const mode = endless ? `ENDLESS  ·  ${place}` : `${place}  ·  L${run.levelIndex + 1}`;
  const m = runMeters(run);
  ctx.fillText(mode, 22, 38);
  ctx.fillStyle = bone;
  ctx.font = '12px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`Distance  ${m.toFixed(1)}m`, 22, 58);
  if (!endless) {
    ctx.fillText(`Track  ${Math.min(TRACK_METERS, m).toFixed(0)} / ${TRACK_METERS}m`, 22, 74);
    const prog = Math.max(0, Math.min(1, m / TRACK_METERS));
    drawMeterBar(ctx, 22, 84, 300, 6, prog, accent, 'rgba(224, 163, 58, 0.45)');
    ctx.fillStyle = 'rgba(243, 230, 208, 0.88)';
    ctx.fillText(
      `Cash  $${Math.floor(profile.cash + run.score.cash)}   XP  ${Math.floor(profile.xp + run.score.xp)}   ·   Kills  ${run.score.kills}   HS  ${run.score.headshots}   Perf  ${run.score.perfects}`,
      22,
      108,
    );
  } else {
    ctx.fillStyle = 'rgba(243, 230, 208, 0.88)';
    ctx.fillText(
      `Cash  $${Math.floor(profile.cash + run.score.cash)}   XP  ${Math.floor(profile.xp + run.score.xp)}   ·   Kills  ${run.score.kills}   HS  ${run.score.headshots}   Perf  ${run.score.perfects}`,
      22,
      82,
    );
  }

  const w = run.weapon;
  ctx.fillStyle = bone;
  ctx.font = '12px "Segoe UI", system-ui, sans-serif';
  const perfectHud = w.perfectMag ? `  DMG×${PERFECT_MAG_MULT}` : '';
  ctx.fillText(`Mag  ${w.ammo}/${run.stats.magSize}${perfectHud}`, 22, viewport.h - 54);
  ctx.fillText(
    `Bloom  ${w.bloom.toFixed(1)}° / ${run.stats.bloomCap}°    Heat  ${(w.heat * 100).toFixed(0)}%`,
    22,
    viewport.h - 36,
  );
  ctx.fillStyle = 'rgba(243, 230, 208, 0.62)';
  ctx.fillText(run.lastCallout || 'Tap to fire · tap again to reload · P pause', 22, viewport.h - 18);

  const magW = 116;
  const bx = viewport.w - 150;
  const by = viewport.h - 48;
  const magFill = ctx.createLinearGradient(bx, by, bx + magW, by);
  magFill.addColorStop(0, '#c48a28');
  magFill.addColorStop(1, '#ffe08a');
  drawMeterBar(ctx, bx, by, magW, 9, w.ammo / Math.max(1, run.stats.magSize), magFill, 'rgba(224, 163, 58, 0.55)');
  const heatFill = ctx.createLinearGradient(bx, by + 14, bx + magW, by + 14);
  heatFill.addColorStop(0, '#6a2018');
  heatFill.addColorStop(1, accent);
  drawMeterBar(ctx, bx, by + 14, magW, 5, w.heat, heatFill, 'rgba(196, 69, 54, 0.4)');

  if (run.paused) {
    ctx.fillStyle = 'rgba(8, 4, 2, 0.66)';
    ctx.fillRect(0, 0, viewport.w, viewport.h);
    const pw = Math.min(360, viewport.w * 0.56);
    const ph = 118;
    const px = (viewport.w - pw) * 0.5;
    const py = viewport.h * 0.5 - ph * 0.5;
    ctx.fillStyle = 'rgba(18, 10, 6, 0.92)';
    fillRoundRect(ctx, px, py, pw, ph, 8);
    ctx.strokeStyle = 'rgba(224, 163, 58, 0.55)';
    ctx.lineWidth = 1.2;
    strokeRoundRect(ctx, px, py, pw, ph, 8);
    ctx.textAlign = 'center';
    ctx.fillStyle = bone;
    ctx.font = '700 30px Georgia, "Iowan Old Style", serif';
    ctx.fillText('PAUSED', viewport.w / 2, py + 44);
    ctx.fillStyle = '#e0a33a';
    ctx.font = '15px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('Tap anywhere to resume', viewport.w / 2, py + 74);
    ctx.fillStyle = 'rgba(243, 230, 208, 0.55)';
    ctx.font = '12px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('P · Esc · Space', viewport.w / 2, py + 96);
    ctx.textAlign = 'left';
  }
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
