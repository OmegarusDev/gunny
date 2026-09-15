import { TERRAIN_AMP } from '../config.js';
import { uhash } from '../util/hash.js';

/** Average distance between crests, in world px. */
const CELL = 2100;
/** Closest two crests can sit — keeps max slope gentle even at full amplitude. */
const MIN_SPAN = 1700;
const JITTER = CELL - MIN_SPAN;

function unit(seed, i, salt) {
  return uhash((Math.imul(i, 0x85ebca6b) ^ Math.imul(salt, 0x9e3779b9) ^ seed) | 0);
}

export function createTerrain(seed, viewportHeight, ampScale = TERRAIN_AMP) {
  const baseline = viewportHeight * 0.72;
  const amp = viewportHeight * ampScale;
  const s = seed | 0;

  function crestX(i) {
    return i * CELL + (unit(s, i, 1) - 0.5) * JITTER;
  }

  function crestY(i) {
    const mag = (0.28 + unit(s, i, 3) * 0.72) * amp;
    return (unit(s, i, 5) * 2 - 1) * mag;
  }

  function spanIndex(worldX) {
    let i = Math.floor(worldX / CELL);
    let n = 0;
    while (n++ < 6 && crestX(i) > worldX) i -= 1;
    while (n++ < 12 && crestX(i + 1) < worldX) i += 1;
    return i;
  }

  function height(worldX) {
    const i = spanIndex(worldX);
    const x0 = crestX(i);
    const x1 = crestX(i + 1);
    const t = Math.max(0, Math.min(1, (worldX - x0) / Math.max(1, x1 - x0)));
    const u = t * t * (3 - 2 * t);
    return baseline + crestY(i) + (crestY(i + 1) - crestY(i)) * u;
  }

  function slope(worldX) {
    const d = 8;
    return (height(worldX + d) - height(worldX - d)) / (2 * d);
  }

  return { seed, height, slope, baseline, amp };
}

export function segmentHitsTerrain(x1, y1, x2, y2, heightFn) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(2, Math.ceil(dist / 4));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = x1 + dx * t;
    const y = y1 + dy * t;
    if (y >= heightFn(x)) {
      return { x, y, t };
    }
  }
  return null;
}
