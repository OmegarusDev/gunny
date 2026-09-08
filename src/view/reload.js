/** Shared reload HUD geometry + timing band (systems + render). */

export const PERFECT_MID = 0.58;

export function reloadGaugeBounds(viewport) {
  const barW = Math.min(480, viewport.w * 0.5);
  const barH = 22;
  const x = (viewport.w - barW) * 0.5;
  const y = viewport.h * 0.42;
  const padX = 24;
  const padY = 36;
  return {
    x: x - 6 - padX,
    y: y - 14 - padY,
    w: barW + 12 + padX * 2,
    h: barH + 22 + padY * 2,
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
  const hw = stats.perfectWidth / 2;
  return { a: PERFECT_MID - hw, b: PERFECT_MID + hw };
}
