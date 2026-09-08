import { JAM_PENALTY, RELOAD_FORGIVE } from '../config.js';
import { playJam, playPerfect, playReloadTone } from '../audio/synth.js';

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

export function startReload(weapon, stats) {
  if (weapon.reloading) return;
  weapon.reloading = true;
  weapon.reloadT = 0;
  weapon.reloadDur = stats.reload;
  weapon.jammed = false;
  weapon.tapped = false;
  weapon.toneAcc = 0;
  weapon.perfectMag = false;
}

export function tapReload(weapon, stats) {
  if (!weapon.reloading || weapon.tapped) return null;
  if (weapon.reloadT < RELOAD_FORGIVE) return 'forgive';
  weapon.tapped = true;
  const t = weapon.reloadT / weapon.reloadDur;
  const mid = 0.58;
  const hw = stats.perfectWidth / 2;
  if (t >= mid - hw && t <= mid + hw) {
    weapon.reloading = false;
    weapon.reloadT = 0;
    weapon.ammo = stats.magSize;
    weapon.perfectMag = true;
    playPerfect();
    return 'perfect';
  }
  weapon.jammed = true;
  weapon.perfectMag = false;
  weapon.reloadDur = weapon.reloadT + (weapon.reloadDur - weapon.reloadT) + JAM_PENALTY;
  playJam();
  return 'jam';
}

export function stepReload(weapon, stats, dt) {
  if (!weapon.reloading) return;
  weapon.reloadT += dt;
  weapon.toneAcc += dt;
  if (weapon.toneAcc > 0.05) {
    weapon.toneAcc = 0;
    playReloadTone(Math.min(1, weapon.reloadT / weapon.reloadDur));
  }
  if (weapon.reloadT >= weapon.reloadDur) {
    weapon.reloading = false;
    weapon.reloadT = 0;
    weapon.ammo = stats.magSize;
    weapon.perfectMag = false;
    weapon.jammed = false;
    weapon.tapped = false;
  }
}

export function reloadNorm(weapon) {
  if (!weapon.reloading) return 0;
  return Math.min(1, weapon.reloadT / weapon.reloadDur);
}

export function perfectBand(stats) {
  const mid = 0.58;
  const hw = stats.perfectWidth / 2;
  return { a: mid - hw, b: mid + hw };
}
