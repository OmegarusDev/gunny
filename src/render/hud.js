import { hudScale, hudTypeScale, TRACK_METERS } from '../config.js';
import { fillRoundRect, strokeRoundRect } from '../util/color.js';
import { perfectBand, reloadGaugeBounds, reloadNorm } from '../view/reload.js';
import { magRof } from '../entities/loadout.js';
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
    gunH: 118 * u,
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

function trackingPx(size, tracking) {
  const t = String(tracking);
  if (t.endsWith('em')) return parseFloat(t) * size || 0;
  if (t.endsWith('px')) return parseFloat(t) || 0;
  return 0;
}

function measureKicker(ctx, str, size, tracking) {
  ctx.font = `${size}px ${SERIF}`;
  ctx.letterSpacing = '0px';
  const base = ctx.measureText(str).width;
  return base + Math.max(0, str.length - 1) * trackingPx(size, tracking);
}

function kicker(ctx, text, x, y, size, tracking = '0.12em', maxW) {
  const str = String(text).toUpperCase();
  ctx.fillStyle = GOLD;
  let s = size;
  let track = tracking;
  if (maxW != null) {
    while (s > 11 && measureKicker(ctx, str, s, track) > maxW) {
      if (track === '0.12em') track = '0.06em';
      else if (track !== '0px') track = '0px';
      else s -= 1;
    }
  }
  ctx.font = `${s}px ${SERIF}`;
  ctx.letterSpacing = track;
  if (maxW != null) ctx.fillText(str, x, y, maxW);
  else ctx.fillText(str, x, y);
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

function fitValue(ctx, text, x, y, size, maxW, color = BONE) {
  let s = size;
  const str = String(text);
  ctx.fillStyle = color;
  ctx.letterSpacing = '0.02em';
  ctx.font = `700 ${s}px ${SERIF}`;
  while (s > 14 && ctx.measureText(str).width > maxW) {
    s -= 1;
    ctx.font = `700 ${s}px ${SERIF}`;
  }
  ctx.fillText(str, x, y, maxW);
  ctx.letterSpacing = '0px';
}

function chip(ctx, x, y, w, h, title, val, m) {
  ctx.fillStyle = 'rgba(12, 8, 4, 0.42)';
  fillRoundRect(ctx, x, y, w, h, 6 * m.u);
  ctx.strokeStyle = CHIP;
  ctx.lineWidth = 1;
  strokeRoundRect(ctx, x, y, w, h, 6 * m.u);
  const pad = 10 * m.u;
  kicker(ctx, title, x + pad, y + pad, Math.min(m.kicker, Math.round(15 * m.u)), '0.12em', w - pad * 2);
  fitValue(ctx, val, x + pad, y + h * 0.48, Math.round(26 * m.t), w - pad * 2);
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
  const ix = x + 16 * m.u;
  const innerW = w - 32 * m.u;
  ctx.textBaseline = 'top';
  const top = y + 14 * m.u;
  if (endless) {
    kicker(ctx, 'Endless', ix, top, m.kicker, '0.12em', innerW);
  } else {
    const badge = `L${(run.levelIndex || 0) + 1}`;
    const badgeW = measureKicker(ctx, badge, m.kicker, '0.12em') + 10 * m.u;
    kicker(ctx, run.biome?.place || 'Road', ix, top, m.kicker, '0.12em', Math.max(48, innerW - badgeW));
    ctx.textAlign = 'right';
    kicker(ctx, badge, x + w - 16 * m.u, top, m.kicker);
    ctx.textAlign = 'left';
  }
  const title = endless ? run.biome?.place || 'The road' : run.biome?.foe || 'Run';
  fitValue(ctx, title, ix, y + 40 * m.u, m.value, innerW);
  const metres = runMeters(run);
  const dist = `${metres.toFixed(0)}m`;
  if (endless) {
    fitValue(ctx, dist, ix, y + 82 * m.u, Math.round(26 * m.t), innerW);
    return;
  }
  const distSize = Math.round(22 * m.t);
  const accent = run.biome?.accent || BLOOD;
  ctx.textAlign = 'left';
  fitValue(ctx, dist, ix, y + 82 * m.u, distSize, innerW, BONE);
  meter(
    ctx,
    ix,
    y + h - 18 * m.u,
    innerW,
    8 * m.u,
    Math.max(0, Math.min(1, metres / TRACK_METERS)),
    accent,
    'rgba(224, 163, 58, 0.4)',
  );
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
  const innerW = w - 32 * m.u;
  ctx.textBaseline = 'top';
  kicker(ctx, run.weapon.perfectMag ? 'Perfect' : 'Mag', ix, y + 14 * m.u, m.kicker, '0.12em', innerW);
  fitValue(
    ctx,
    `${run.weapon.ammo} / ${run.stats.magSize}`,
    ix,
    y + 36 * m.u,
    m.mag,
    innerW,
    run.weapon.perfectMag ? GOLD : BONE,
  );
  const cycle = run.weapon.reloading
    ? 0
    : Math.max(0, Math.min(1, 1 - (run.weapon.cooldown || 0) * magRof(run.stats, run.weapon)));
  const dry = Math.max(0, Math.min(1, (run.weapon.dryFlash || 0) / 0.14));
  const cycleY = y + 82 * m.u;
  const cycleH = 5 * m.u;
  ctx.fillStyle = 'rgba(8, 4, 2, 0.55)';
  fillRoundRect(ctx, ix, cycleY, innerW, cycleH, 2);
  if (cycle > 0.02) {
    ctx.fillStyle = dry > 0.04 ? `rgba(196, 69, 54, ${0.55 + 0.4 * dry})` : GOLD;
    fillRoundRect(ctx, ix, cycleY, innerW * cycle, cycleH, 2);
  }
  ctx.strokeStyle =
    dry > 0.04 ? `rgba(196, 69, 54, ${0.5 + 0.4 * dry})` : 'rgba(224, 163, 58, 0.45)';
  ctx.lineWidth = 1;
  strokeRoundRect(ctx, ix, cycleY, innerW, cycleH, 2);

  ctx.font = `${m.label}px ${SANS}`;
  ctx.letterSpacing = '0.1em';
  const labelW = Math.ceil(ctx.measureText('BLOOM').width) + 12 * m.u;
  ctx.letterSpacing = '0px';
  const barX = ix + labelW;
  const barInner = Math.max(28, innerW - labelW);
  const bloomY = y + h - 24 * m.u;

  label(ctx, 'Bloom', ix, bloomY, m.label);
  const bloom = Math.max(0, Math.min(1, run.weapon.bloom / Math.max(0.001, run.stats.bloomCap)));
  const bloomFill = ctx.createLinearGradient(barX, bloomY + 2 * m.u, barX + barInner, bloomY + 2 * m.u);
  bloomFill.addColorStop(0, '#c48a28');
  bloomFill.addColorStop(1, '#ffe08a');
  meter(ctx, barX, bloomY + 2 * m.u, barInner, 10 * m.u, bloom, bloomFill, 'rgba(224, 163, 58, 0.45)');
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
  ctx.letterSpacing = '0.08em';
  ctx.fillText('P  ·  Esc  ·  Space', viewport.w / 2, py + 118 * m.u);
  ctx.letterSpacing = '0px';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

export function drawReloadGauge(ctx, run, viewport) {
  const w = run.weapon;
  if (!w.reloading || run.dying) return;
  const m = layout(viewport);
  const { barX: x, barY: y, barW, barH } = reloadGaugeBounds(viewport);
  const t = reloadNorm(w);
  const band = perfectBand(run.stats);
  const jam = w.jammed;
  const px = x - 14 * m.u;
  const py = y - 32 * m.u;
  const pw = barW + 28 * m.u;
  const ph = barH + 58 * m.u;
  panel(ctx, px, py, pw, ph, m.r);
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';
  kicker(ctx, jam ? 'Jammed' : 'Reload', px + pw / 2, py + 10 * m.u, m.kicker);
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
  ctx.letterSpacing = '0.08em';
  ctx.fillText(jam ? 'JAMMED' : 'Tap Anywhere', x + barW * 0.5, y + barH + 8 * m.u);
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
