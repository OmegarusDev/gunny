import { TERRAIN_AMP } from '../config.js';
import { fbm1D } from '../engine/noise.js';

export function createTerrain(seed, viewportHeight, ampScale = TERRAIN_AMP) {
  const baseline = viewportHeight * 0.72;
  const amp = viewportHeight * ampScale;

  function height(worldX) {
    const n = fbm1D(worldX * 0.0034, seed);
    const n2 = fbm1D(worldX * 0.0075, seed + 17);
    return baseline + n * amp + n2 * amp * 0.16;
  }

  function slope(worldX) {
    const d = 4;
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
