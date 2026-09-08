import { PX_PER_M } from '../config.js';

export function metersFromWorldX(worldX) {
  return -worldX / PX_PER_M;
}

export function runMeters(run) {
  return metersFromWorldX(run.player.worldX);
}
