import { JAM_PENALTY, RELOAD_FORGIVE } from '../config.js';
import { playCock, playJam, playMagIn, playMagOut, playPerfect } from '../audio/synth.js';
import { perfectBand } from '../view/reload.js';

export function startReload(weapon, stats) {
  if (weapon.reloading) return;
  weapon.reloading = true;
  weapon.reloadT = 0;
  weapon.reloadDur = stats.reload;
  weapon.jammed = false;
  weapon.tapped = false;
  weapon.perfectMag = false;
  weapon.magIn = false;
  playMagOut();
}

export function tapReload(weapon, stats) {
  if (!weapon.reloading || weapon.tapped) return null;
  // Ignore fire-spam right after the empty mag — a tap here would only jam.
  if (weapon.reloadT < RELOAD_FORGIVE) return 'forgive';
  weapon.tapped = true;
  const t = weapon.reloadDur > 0 ? weapon.reloadT / weapon.reloadDur : 1;
  const band = perfectBand(stats);
  if (t >= band.a && t <= band.b) {
    weapon.reloading = false;
    weapon.reloadT = 0;
    weapon.ammo = stats.magSize;
    weapon.perfectMag = true;
    weapon.cooldown = 0;
    if (!weapon.magIn) playMagIn();
    weapon.magIn = true;
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
  if (!weapon.magIn && weapon.reloadDur > 0 && weapon.reloadT >= weapon.reloadDur * 0.42) {
    weapon.magIn = true;
    playMagIn();
  }
  if (weapon.reloadT >= weapon.reloadDur) {
    weapon.reloading = false;
    weapon.reloadT = 0;
    weapon.ammo = stats.magSize;
    weapon.perfectMag = false;
    weapon.jammed = false;
    weapon.tapped = false;
    weapon.cooldown = 0;
    if (!weapon.magIn) playMagIn();
    weapon.magIn = true;
    playCock();
  }
}
