import { TERRAIN_FLOOR_PAD, TERRAIN_HEADROOM } from '../config.js';
import { valueNoise1D } from '../engine/noise.js';
import { playerHeadClearance } from '../figure.js';

function oct2(x, seed) {
  return valueNoise1D(x, seed) * 0.68 + valueNoise1D(x * 1.91, seed + 41) * 0.32;
}

function contrast(n, k) {
  const t = Math.tanh(k);
  return Math.tanh(n * k) / t;
}

/** Per-road relief. Freqs in 1/world-px; weights are mixed then remapped into [peak, floor]. */
const SHAPES = {
  forest: {
    slowF: 0.0002,
    hillF: 0.00055,
    shoulderF: 0.00092,
    dipF: 0.00108,
    bumpF: 0.00245,
    bump2F: 0.0039,
    wSlow: 0.2,
    wHill: 0.34,
    wShoulder: 0.24,
    wDip: 0.16,
    wBump: 0.1,
    warp: 920,
    punch: 2.05,
  },
  fen: {
    slowF: 0.00013,
    hillF: 0.00026,
    shoulderF: 0.00044,
    dipF: 0.0007,
    bumpF: 0.0019,
    bump2F: 0.0028,
    wSlow: 0.48,
    wHill: 0.28,
    wShoulder: 0.14,
    wDip: 0.08,
    wBump: 0.06,
    warp: 540,
    punch: 1.12,
  },
  transylvania: {
    slowF: 0.00017,
    hillF: 0.0004,
    shoulderF: 0.0007,
    dipF: 0.00105,
    bumpF: 0.0022,
    bump2F: 0.0033,
    wSlow: 0.32,
    wHill: 0.36,
    wShoulder: 0.18,
    wDip: 0.12,
    wBump: 0.08,
    warp: 780,
    punch: 1.55,
  },
  desert: {
    slowF: 0.00015,
    hillF: 0.0003,
    shoulderF: 0.00046,
    dipF: 0.00064,
    bumpF: 0.00145,
    bump2F: 0.0021,
    wSlow: 0.4,
    wHill: 0.42,
    wShoulder: 0.2,
    wDip: 0.06,
    wBump: 0.03,
    warp: 1180,
    punch: 1.22,
  },
  quarry: {
    slowF: 0.00018,
    hillF: 0.00038,
    shoulderF: 0.00066,
    dipF: 0.00098,
    bumpF: 0.00205,
    bump2F: 0.0031,
    wSlow: 0.3,
    wHill: 0.32,
    wShoulder: 0.2,
    wDip: 0.12,
    wBump: 0.08,
    warp: 640,
    punch: 1.4,
    terrace: 0.4,
  },
};

function shapeFor(biome) {
  const id = typeof biome === 'string' ? biome : biome?.id;
  return SHAPES[id] || SHAPES.forest;
}

export function terrainBounds(viewportHeight) {
  const floorY = viewportHeight * (1 - TERRAIN_FLOOR_PAD);
  const peakY = viewportHeight * TERRAIN_HEADROOM + playerHeadClearance();
  return { floorY, peakY, amp: (floorY - peakY) / 2, baseline: (floorY + peakY) / 2 };
}

export function createTerrain(seed, viewportHeight, biome = null) {
  const { floorY, peakY, amp, baseline } = terrainBounds(viewportHeight);
  const sh = shapeFor(biome);
  const s = seed | 0;

  function height(worldX) {
    const env = 0.5 + 0.5 * (valueNoise1D(worldX * 0.0001, s + 2) * 0.5 + 0.5);
    const warpAmt = sh.warp * (0.45 + 0.55 * (valueNoise1D(worldX * 0.00012, s + 1) * 0.5 + 0.5));
    const warp = valueNoise1D(worldX * 0.00027, s + 4) * warpAmt;
    const slow = oct2(worldX * sh.slowF, s);
    const hill = oct2((worldX + warp) * sh.hillF, s + 6);
    const shoulder = oct2((worldX - warp * 0.55) * sh.shoulderF, s + 8);
    const dip = valueNoise1D((worldX + warp * 0.28) * sh.dipF, s + 10);
    const bump = valueNoise1D(worldX * sh.bumpF, s + 12) * 0.6 + valueNoise1D(worldX * sh.bump2F, s + 14) * 0.4;
    let n =
      slow * sh.wSlow +
      hill * sh.wHill * env +
      shoulder * sh.wShoulder * env +
      dip * sh.wDip * env +
      bump * sh.wBump;
    if (sh.terrace) {
      const benches = Math.round(n * 5) / 5;
      n = n * (1 - sh.terrace) + benches * sh.terrace;
    }
    n = contrast(n * 1.28, sh.punch);
    n = Math.max(-1, Math.min(1, n));
    return peakY + (floorY - peakY) * (0.5 + 0.5 * n);
  }

  function slope(worldX) {
    const d = 8;
    return (height(worldX + d) - height(worldX - d)) / (2 * d);
  }

  return { seed, height, slope, baseline, amp, peakY, floorY };
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
