import { TRACK_METERS } from '../config.js';
import { fillRoundRect, strokeRoundRect } from '../util/color.js';
import { perfectBand, reloadGaugeBounds, reloadNorm } from '../view/reload.js';
import { runMeters } from '../world/metrics.js';

const BONE = '#f3e6d0';
const GOLD = '#e0a33a';
const BLOOD = '#c44536';
const BRASS = '#d4b07a';
const MUTED = '#c4a990';
const CHIP = '#5a4030';
const SERIF = 'Georgia, "Iowan Old Style", Palatino, serif';
const SANS = '"Segoe UI", "Trebuchet MS", system-ui, sans-serif';
const PAD = 12;
const R = 8;

function panel(ctx, x, y, w, h) {
  ctx.save();
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, R);
  else ctx.rect(x, y, w, h);
  ctx.clip();
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, 'rgba(64, 38, 24, 0.94)');
  g.addColorStop(1, 'rgba(22, 13, 9, 0.95)');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(90, 56, 32, 0.16)';
  for (let i = x + 3; i < x + w; i += 8) ctx.fillRect(i, y, 1, h);
  ctx.restore();
  ctx.strokeStyle = 'rgba(212, 176, 122, 0.82)';
  ctx.lineWidth = 1;
  strokeRoundRect(ctx, x, y, w, h, R);
  ctx.strokeStyle = 'rgba(255, 230, 190, 0.16)';
  ctx.beginPath();
  ctx.moveTo(x + 10, y + 1.2);
  ctx.lineTo(x + w - 10, y + 1.2);
  ctx.stroke();
}

function kicker(ctx, text, x, y, tracking = '0.2em') {
  ctx.fillStyle = GOLD;
  ctx.font = `11px ${SERIF}`;
  ctx.letterSpacing = tracking;
  ctx.fillText(String(text).toUpperCase(), x, y);
  ctx.letterSpacing = '0px';
}

function label(ctx, text, x, y) {
  ctx.fillStyle = MUTED;
  ctx.font = `10px ${SANS}`;
  ctx.letterSpacing = '0.12em';
  ctx.fillText(String(text).toUpperCase(), x, y);
  ctx.letterSpacing = '0px';
}

function value(ctx, text, x, y, size = 22, color = BONE) {
  ctx.fillStyle = color;
  ctx.font = `700 ${size}px ${SERIF}`;
  ctx.letterSpacing = '0.03em';
  ctx.fillText(text, x, y);
  ctx.letterSpacing = '0px';
}

function chip(ctx, x, y, w, h, title, val) {
  ctx.fillStyle = 'rgba(12, 8, 4, 0.42)';
  fillRoundRect(ctx, x, y, w, h, 6);
  ctx.strokeStyle = CHIP;
  ctx.lineWidth = 1;
  strokeRoundRect(ctx, x, y, w, h, 6);
  kicker(ctx, title, x + 10, y + 11, '0.12em');
  value(ctx, val, x + 10, y + 32, 18);
}

function meter(ctx, x, y, w, h, t, fill, edge) {
  ctx.fillStyle = 'rgba(8, 4, 2, 0.55)';
  fillRoundRect(ctx, x, y, w, h, 3);
  const fw = Math.max(0, Math.min(1, t)) * w;
  if (fw > 0.6) {
    ctx.fillStyle = fill;
    fillRoundRect(ctx, x, y, fw, h, 3);
  }
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1;
  strokeRoundRect(ctx, x, y, w, h, 3);
}

function drawBrand(ctx, run, x, y) {
  const endless = run.endless;
  const w = 300;
  const h = endless ? 80 : 86;
  panel(ctx, x, y, w, h);
  const ix = x + 16;
  ctx.textBaseline = 'top';
  kicker(ctx, endless ? 'Endless' : run.biome?.place || 'Road', ix, y + 14, '0.16em');
  if (!endless) {
    ctx.textAlign = 'right';
    kicker(ctx, `L${(run.levelIndex || 0) + 1}`, x + w - 16, y + 14, '0.16em');
    ctx.textAlign = 'left';
  }
  const title = endless ? run.biome?.place || 'The road' : run.biome?.foe || 'Run';
  value(ctx, title, ix, y + 32, 22);
  const metres = runMeters(run);
  if (endless) {
    value(ctx, `${metres.toFixed(0)}m`, ix, y + 56, 18);
    return;
  }
  const barW = w - 32 - 58;
  const accent = run.biome?.accent || BLOOD;
  meter(ctx, ix, y + 64, barW, 6, Math.max(0, Math.min(1, metres / TRACK_METERS)), accent, 'rgba(224, 163, 58, 0.4)');
  ctx.textAlign = 'right';
  value(ctx, `${metres.toFixed(0)}m`, x + w - 16, y + 58, 16);
  ctx.textAlign = 'left';
}

function drawLedger(ctx, run, profile, viewport) {
  const inner = 8;
  const chipW = 86;
  const chipH = 48;
  const gap = 6;
  const w = inner * 2 + chipW * 3 + gap * 2;
  const h = inner * 2 + chipH;
  const x = viewport.w - PAD - w;
  const y = PAD;
  panel(ctx, x, y, w, h);
  ctx.textBaseline = 'top';
  chip(ctx, x + inner, y + inner, chipW, chipH, 'Cash', `$${Math.floor(profile.cash + run.score.cash)}`);
  chip(ctx, x + inner + chipW + gap, y + inner, chipW, chipH, 'XP', String(Math.floor(profile.xp + run.score.xp)));
  chip(ctx, x + inner + (chipW + gap) * 2, y + inner, chipW, chipH, 'Kills', String(run.score.kills));
}

function drawGun(ctx, run, viewport) {
  const w = 176;
  const h = 100;
  const x = viewport.w - PAD - w;
  const y = viewport.h - PAD - h;
  panel(ctx, x, y, w, h);
  const ix = x + 14;
  const barW = w - 28;
  ctx.textBaseline = 'top';
  kicker(ctx, run.weapon.perfectMag ? 'Perfect' : 'Mag', ix, y + 12);
  const mag = `${run.weapon.ammo} / ${run.stats.magSize}`;
  value(ctx, mag, ix, y + 28, 26, run.weapon.perfectMag ? GOLD : BONE);

  label(ctx, 'Heat', ix, y + 62);
  const heatFill = ctx.createLinearGradient(ix + 52, y + 64, ix + barW, y + 64);
  heatFill.addColorStop(0, '#6a2018');
  heatFill.addColorStop(1, run.biome?.accent || BLOOD);
  meter(ctx, ix + 52, y + 64, barW - 52, 7, run.weapon.heat, heatFill, 'rgba(196, 69, 54, 0.45)');

  label(ctx, 'Bloom', ix, y + 80);
  const bloom = Math.max(0, Math.min(1, run.weapon.bloom / Math.max(0.001, run.stats.bloomCap)));
  const bloomFill = ctx.createLinearGradient(ix + 52, y + 82, ix + barW, y + 82);
  bloomFill.addColorStop(0, '#c48a28');
  bloomFill.addColorStop(1, '#ffe08a');
  meter(ctx, ix + 52, y + 82, barW - 52, 6, bloom, bloomFill, 'rgba(224, 163, 58, 0.45)');
}

function drawPause(ctx, run, viewport) {
  if (!run.paused) return;
  ctx.fillStyle = 'rgba(8, 4, 2, 0.66)';
  ctx.fillRect(0, 0, viewport.w, viewport.h);
  const pw = Math.min(340, viewport.w * 0.52);
  const ph = 128;
  const px = (viewport.w - pw) * 0.5;
  const py = viewport.h * 0.5 - ph * 0.5;
  panel(ctx, px, py, pw, ph);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  kicker(ctx, 'Run', viewport.w / 2, py + 18);
  value(ctx, 'Paused', viewport.w / 2, py + 38, 32, GOLD);
  ctx.fillStyle = MUTED;
  ctx.font = `15px ${SANS}`;
  ctx.letterSpacing = '0.04em';
  ctx.fillText('Tap anywhere to resume', viewport.w / 2, py + 80);
  ctx.font = `11px ${SANS}`;
  ctx.fillStyle = 'rgba(243, 230, 208, 0.5)';
  ctx.fillText('P  ·  Esc  ·  Space', viewport.w / 2, py + 102);
  ctx.letterSpacing = '0px';
  ctx.textAlign = 'left';
}

export function drawReloadGauge(ctx, run, viewport) {
  const w = run.weapon;
  if (!w.reloading || run.escaping) return;
  const { barX: x, barY: y, barW, barH } = reloadGaugeBounds(viewport);
  const t = reloadNorm(w);
  const band = perfectBand(run.stats);
  const jam = w.jammed;
  const px = x - 18;
  const py = y - 36;
  const pw = barW + 36;
  const ph = barH + 64;
  panel(ctx, px, py, pw, ph);
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';
  kicker(ctx, jam ? 'Jammed' : 'Reload', px + pw / 2, py + 12);
  ctx.textAlign = 'left';

  ctx.fillStyle = 'rgba(12, 8, 4, 0.55)';
  fillRoundRect(ctx, x, y, barW, barH, 5);
  ctx.strokeStyle = jam ? 'rgba(196, 69, 54, 0.7)' : CHIP;
  ctx.lineWidth = 1;
  strokeRoundRect(ctx, x, y, barW, barH, 5);

  ctx.fillStyle = jam ? 'rgba(196, 69, 54, 0.55)' : 'rgba(224, 163, 58, 0.92)';
  fillRoundRect(ctx, x + band.a * barW, y + 3, Math.max(3, (band.b - band.a) * barW), barH - 6, 3);

  const nx = x + t * barW;
  ctx.fillStyle = jam ? BLOOD : BONE;
  ctx.fillRect(nx - 1.5, y - 5, 3, barH + 10);
  ctx.beginPath();
  ctx.moveTo(nx, y - 5);
  ctx.lineTo(nx - 5, y - 13);
  ctx.lineTo(nx + 5, y - 13);
  ctx.closePath();
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = jam ? '#e07060' : MUTED;
  ctx.font = `11px ${SERIF}`;
  ctx.letterSpacing = '0.18em';
  ctx.fillText(jam ? 'JAMMED' : 'TAP', x + barW * 0.5, y + barH + 10);
  ctx.letterSpacing = '0px';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

export function drawHud(ctx, run, viewport, profile) {
  if (run.escaping) {
    drawPause(ctx, run, viewport);
    return;
  }
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  drawBrand(ctx, run, PAD, PAD);
  drawLedger(ctx, run, profile, viewport);
  drawGun(ctx, run, viewport);
  drawPause(ctx, run, viewport);
  ctx.restore();
}
