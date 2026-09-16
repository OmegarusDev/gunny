import { hudScale, hudTypeScale, TRACK_METERS } from '../config.js';
import { fillRoundRect, strokeRoundRect } from '../util/color.js';
import { perfectBand, reloadGaugeBounds, reloadNorm } from '../view/reload.js';
import { runMeters } from '../world/metrics.js';

const BONE = '#f3e6d0';
const GOLD = '#e0a33a';
const BLOOD = '#c44536';
const MUTED = '#c4a990';
const CHIP = '#5a4030';
const SERIF = 'Georgia, "Iowan Old Style", Palatino, serif';
const SANS = '"Segoe UI", "Trebuchet MS", system-ui, sans-serif';

function layout(viewport) {
  const u = hudScale(viewport);
  const t = hudTypeScale(viewport);
  const pad = 14 * u;
  const gap = 14 * u;
  const ledgerInner = 8 * u;
  let chipW = 104 * u;
  let chipGap = 8 * u;
  let brandW = 320 * u;
  const ledgerW = () => ledgerInner * 2 + chipW * 3 + chipGap * 2;
  const maxW = Math.max(160, viewport.w - pad * 2);
  const need = brandW + gap + ledgerW();
  if (need > maxW) {
    const s = maxW / need;
    brandW *= s;
    chipW *= s;
    chipGap *= s;
  }
  return {
    u,
    t,
    pad,
    r: Math.max(8 * u, 10),
    kicker: Math.round(18 * t),
    label: Math.round(15 * t),
    value: Math.round(36 * t),
    mag: Math.round(44 * t),
    pause: Math.round(42 * t),
    chipW,
    chipH: 68 * u,
    chipGap,
    ledgerInner,
    brandW,
    gunW: Math.min(220 * u, viewport.w * 0.4),
    gunH: 140 * u,
  };
}

function panel(ctx, x, y, w, h, r) {
  ctx.save();
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
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
  ctx.lineWidth = Math.max(1, 1 * (h > 80 ? 1.2 : 1));
  strokeRoundRect(ctx, x, y, w, h, r);
  ctx.strokeStyle = 'rgba(255, 230, 190, 0.16)';
  ctx.beginPath();
  ctx.moveTo(x + 10, y + 1.2);
  ctx.lineTo(x + w - 10, y + 1.2);
  ctx.stroke();
}

function kicker(ctx, text, x, y, size, tracking = '0.16em') {
  ctx.fillStyle = GOLD;
  ctx.font = `${size}px ${SERIF}`;
  ctx.letterSpacing = tracking;
  ctx.fillText(String(text).toUpperCase(), x, y);
  ctx.letterSpacing = '0px';
}

function label(ctx, text, x, y, size) {
  ctx.fillStyle = MUTED;
  ctx.font = `${size}px ${SANS}`;
  ctx.letterSpacing = '0.1em';
  ctx.fillText(String(text).toUpperCase(), x, y);
  ctx.letterSpacing = '0px';
}

function value(ctx, text, x, y, size, color = BONE) {
  ctx.fillStyle = color;
  ctx.font = `700 ${size}px ${SERIF}`;
  ctx.letterSpacing = '0.02em';
  ctx.fillText(text, x, y);
  ctx.letterSpacing = '0px';
}

function chip(ctx, x, y, w, h, title, val, m) {
  ctx.fillStyle = 'rgba(12, 8, 4, 0.42)';
  fillRoundRect(ctx, x, y, w, h, 6 * m.u);
  ctx.strokeStyle = CHIP;
  ctx.lineWidth = 1;
  strokeRoundRect(ctx, x, y, w, h, 6 * m.u);
  kicker(ctx, title, x + 12 * m.u, y + 12 * m.u, m.kicker, '0.12em');
  value(ctx, val, x + 12 * m.u, y + 36 * m.u, Math.round(28 * m.t));
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

function drawBrand(ctx, run, x, y, m) {
  const endless = run.endless;
  const w = m.brandW;
  const h = endless ? 112 * m.u : 128 * m.u;
  panel(ctx, x, y, w, h, m.r);
  const ix = x + 18 * m.u;
  ctx.textBaseline = 'top';
  kicker(ctx, endless ? 'Endless' : run.biome?.place || 'Road', ix, y + 16 * m.u, m.kicker);
  if (!endless) {
    ctx.textAlign = 'right';
    kicker(ctx, `L${(run.levelIndex || 0) + 1}`, x + w - 18 * m.u, y + 16 * m.u, m.kicker);
    ctx.textAlign = 'left';
  }
  const title = endless ? run.biome?.place || 'The road' : run.biome?.foe || 'Run';
  value(ctx, title, ix, y + 42 * m.u, m.value);
  const metres = runMeters(run);
  if (endless) {
    value(ctx, `${metres.toFixed(0)}m`, ix, y + 84 * m.u, Math.round(26 * m.t));
    return;
  }
  const barW = w - 36 * m.u - 88 * m.u;
  const accent = run.biome?.accent || BLOOD;
  meter(
    ctx,
    ix,
    y + 96 * m.u,
    barW,
    10 * m.u,
    Math.max(0, Math.min(1, metres / TRACK_METERS)),
    accent,
    'rgba(224, 163, 58, 0.4)',
  );
  ctx.textAlign = 'right';
  value(ctx, `${metres.toFixed(0)}m`, x + w - 18 * m.u, y + 86 * m.u, Math.round(24 * m.t));
  ctx.textAlign = 'left';
}

function drawLedger(ctx, run, profile, viewport, m) {
  const inner = m.ledgerInner;
  const w = inner * 2 + m.chipW * 3 + m.chipGap * 2;
  const h = inner * 2 + m.chipH;
  const x = viewport.w - m.pad - w;
  const y = m.pad;
  panel(ctx, x, y, w, h, m.r);
  ctx.textBaseline = 'top';
  chip(ctx, x + inner, y + inner, m.chipW, m.chipH, 'Cash', `$${Math.floor(profile.cash + run.score.cash)}`, m);
  chip(ctx, x + inner + m.chipW + m.chipGap, y + inner, m.chipW, m.chipH, 'XP', String(Math.floor(profile.xp + run.score.xp)), m);
  chip(ctx, x + inner + (m.chipW + m.chipGap) * 2, y + inner, m.chipW, m.chipH, 'Kills', String(run.score.kills), m);
}

function drawGun(ctx, run, viewport, m) {
  const w = m.gunW;
  const h = m.gunH;
  const x = viewport.w - m.pad - w;
  const y = viewport.h - m.pad - h;
  panel(ctx, x, y, w, h, m.r);
  const ix = x + 16 * m.u;
  const barW = w - 32 * m.u;
  ctx.textBaseline = 'top';
  kicker(ctx, run.weapon.perfectMag ? 'Perfect' : 'Mag', ix, y + 16 * m.u, m.kicker);
  value(ctx, `${run.weapon.ammo} / ${run.stats.magSize}`, ix, y + 40 * m.u, m.mag, run.weapon.perfectMag ? GOLD : BONE);

  const barX = ix + 68 * m.u;
  const barInner = barW - 68 * m.u;
  label(ctx, 'Heat', ix, y + 92 * m.u, m.label);
  const heatFill = ctx.createLinearGradient(barX, y + 94 * m.u, barX + barInner, y + 94 * m.u);
  heatFill.addColorStop(0, '#6a2018');
  heatFill.addColorStop(1, run.biome?.accent || BLOOD);
  meter(ctx, barX, y + 94 * m.u, barInner, 11 * m.u, run.weapon.heat, heatFill, 'rgba(196, 69, 54, 0.45)');

  label(ctx, 'Bloom', ix, y + 116 * m.u, m.label);
  const bloom = Math.max(0, Math.min(1, run.weapon.bloom / Math.max(0.001, run.stats.bloomCap)));
  const bloomFill = ctx.createLinearGradient(barX, y + 118 * m.u, barX + barInner, y + 118 * m.u);
  bloomFill.addColorStop(0, '#c48a28');
  bloomFill.addColorStop(1, '#ffe08a');
  meter(ctx, barX, y + 118 * m.u, barInner, 10 * m.u, bloom, bloomFill, 'rgba(224, 163, 58, 0.45)');
}

function drawPause(ctx, run, viewport, m) {
  if (!run.paused) return;
  ctx.fillStyle = 'rgba(8, 4, 2, 0.66)';
  ctx.fillRect(0, 0, viewport.w, viewport.h);
  const pw = Math.min(380 * m.u, viewport.w * 0.56);
  const ph = 148 * m.u;
  const px = (viewport.w - pw) * 0.5;
  const py = viewport.h * 0.5 - ph * 0.5;
  panel(ctx, px, py, pw, ph, m.r);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  kicker(ctx, 'Run', viewport.w / 2, py + 20 * m.u, m.kicker);
  value(ctx, 'Paused', viewport.w / 2, py + 44 * m.u, m.pause, GOLD);
  ctx.fillStyle = MUTED;
  ctx.font = `${Math.round(16 * m.t)}px ${SANS}`;
  ctx.letterSpacing = '0.04em';
  ctx.fillText('Tap anywhere to resume', viewport.w / 2, py + 92 * m.u);
  ctx.font = `${Math.round(13 * m.t)}px ${SANS}`;
  ctx.fillStyle = 'rgba(243, 230, 208, 0.5)';
  ctx.fillText('P  ·  Esc  ·  Space', viewport.w / 2, py + 118 * m.u);
  ctx.letterSpacing = '0px';
  ctx.textAlign = 'left';
}

export function drawReloadGauge(ctx, run, viewport) {
  const w = run.weapon;
  if (!w.reloading || run.dying) return;
  const m = layout(viewport);
  const { barX: x, barY: y, barW, barH } = reloadGaugeBounds(viewport);
  const t = reloadNorm(w);
  const band = perfectBand(run.stats);
  const jam = w.jammed;
  const px = x - 18 * m.u;
  const py = y - 40 * m.u;
  const pw = barW + 36 * m.u;
  const ph = barH + 72 * m.u;
  panel(ctx, px, py, pw, ph, m.r);
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';
  kicker(ctx, jam ? 'Jammed' : 'Reload', px + pw / 2, py + 14 * m.u, m.kicker);
  ctx.textAlign = 'left';

  ctx.fillStyle = 'rgba(12, 8, 4, 0.55)';
  fillRoundRect(ctx, x, y, barW, barH, 5 * m.u);
  ctx.strokeStyle = jam ? 'rgba(196, 69, 54, 0.7)' : CHIP;
  ctx.lineWidth = 1;
  strokeRoundRect(ctx, x, y, barW, barH, 5 * m.u);

  ctx.fillStyle = jam ? 'rgba(196, 69, 54, 0.55)' : 'rgba(224, 163, 58, 0.92)';
  fillRoundRect(ctx, x + band.a * barW, y + 3 * m.u, Math.max(4 * m.u, (band.b - band.a) * barW), barH - 6 * m.u, 3 * m.u);

  const nx = x + t * barW;
  ctx.fillStyle = jam ? BLOOD : BONE;
  ctx.fillRect(nx - 2 * m.u, y - 6 * m.u, 4 * m.u, barH + 12 * m.u);
  ctx.beginPath();
  ctx.moveTo(nx, y - 6 * m.u);
  ctx.lineTo(nx - 6 * m.u, y - 16 * m.u);
  ctx.lineTo(nx + 6 * m.u, y - 16 * m.u);
  ctx.closePath();
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = jam ? '#e07060' : MUTED;
  ctx.font = `${m.kicker}px ${SERIF}`;
  ctx.letterSpacing = '0.16em';
  ctx.fillText(jam ? 'JAMMED' : 'TAP', x + barW * 0.5, y + barH + 12 * m.u);
  ctx.letterSpacing = '0px';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

export function drawHud(ctx, run, viewport, profile) {
  if (run.dying) return;
  const m = layout(viewport);
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  drawBrand(ctx, run, m.pad, m.pad, m);
  drawLedger(ctx, run, profile, viewport, m);
  drawGun(ctx, run, viewport, m);
  drawPause(ctx, run, viewport, m);
  ctx.restore();
}
