import { hudScale } from '../config.js';

/** 2s on a 3s reload. The mark sits 20% into the gold band. */
export const PERFECT_MARK = 2 / 3;
export const PERFECT_MARK_IN_BAND = 0.2;

export function reloadGaugeBounds(viewport) {
  const u = hudScale(viewport);
  const barW = Math.min(360 * u, viewport.w * 0.46);
  const barH = 14 * u;
  const x = (viewport.w - barW) * 0.5;
  const y = viewport.h * 0.2;
  const padX = 18 * u;
  const padY = 20 * u;
  return {
    x: x - 6 - padX,
    y: y - 28 * u - padY,
    w: barW + 12 + padX * 2,
    h: barH + 52 * u + padY,
    barX: x,
    barY: y,
    barW,
    barH,
  };
}

export function pointerInReloadGauge(px, py, viewport) {
  const b = reloadGaugeBounds(viewport);
  return px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h;
}

export function reloadNorm(weapon) {
  if (!weapon.reloading) return 0;
  const dur = weapon.reloadDur;
  if (!(dur > 0)) return 0;
  return Math.min(1, weapon.reloadT / dur);
}

export function perfectBand(stats) {
  const w = Math.max(0.04, stats.perfectWidth || 0);
  let a = PERFECT_MARK - PERFECT_MARK_IN_BAND * w;
  let b = a + w;
  if (a < 0) {
    b -= a;
    a = 0;
  }
  if (b > 1) {
    a -= b - 1;
    b = 1;
  }
  return { a: Math.max(0, a), b: Math.min(1, b) };
}
