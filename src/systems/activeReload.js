import { JAM_PENALTY, RELOAD_FORGIVE } from '../config.js';
import { playJam, playPerfect, playReloadTone } from '../audio/synth.js';
import { perfectBand } from '../view/reload.js';

export {
  perfectBand,
  pointerInReloadGauge,
  reloadGaugeBounds,
  reloadNorm,
} from '../view/reload.js';

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
  const t = weapon.reloadDur > 0 ? weapon.reloadT / weapon.reloadDur : 1;
  const band = perfectBand(stats);
  if (t >= band.a && t <= band.b) {
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
