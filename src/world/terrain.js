import { TERRAIN_AMP } from '../config.js';
import { fbm1D } from '../engine/noise.js';

export function createTerrain(seed, viewportHeight, ampScale = TERRAIN_AMP) {
  const baseline = viewportHeight * 0.72;
  const amp = viewportHeight * ampScale;
  const phase = (seed % 97) * 0.13;

  function height(worldX) {
    // Wavelengths fit on one screen so hills read as peaks, not a tilted rumble.
    const hill = Math.sin(worldX * 0.0062 + phase) * amp * 0.82;
    const roll = fbm1D(worldX * 0.0014, seed);
    const mid = fbm1D(worldX * 0.0031, seed + 9);
    const bump = fbm1D(worldX * 0.008, seed + 17);
    return baseline + hill + roll * amp * 0.34 + mid * amp * 0.14 + bump * amp * 0.05;
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
