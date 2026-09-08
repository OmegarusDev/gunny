import { PLAYER_SCREEN_X_RATIO } from '../../config.js';

export { uhash } from '../../util/hash.js';

export const TREE_TYPES = [
  [
    [0, 0.58, 0.36],
    [-0.2, 0.44, 0.24],
    [0.18, 0.48, 0.22],
    [0.02, 0.72, 0.18],
  ],
  [
    [0, 0.7, 0.22],
    [-0.12, 0.52, 0.2],
    [0.12, 0.54, 0.18],
    [0, 0.88, 0.16],
  ],
  [
    [0, 0.42, 0.28],
    [-0.28, 0.38, 0.22],
    [0.26, 0.38, 0.22],
    [-0.08, 0.55, 0.2],
    [0.1, 0.55, 0.18],
  ],
  [
    [-0.1, 0.58, 0.32],
    [-0.3, 0.46, 0.24],
    [0.12, 0.5, 0.18],
    [-0.02, 0.74, 0.16],
  ],
  [
    [0.1, 0.58, 0.32],
    [0.28, 0.46, 0.24],
    [-0.14, 0.5, 0.18],
    [0.04, 0.74, 0.16],
  ],
  [
    [-0.22, 0.58, 0.24],
    [0.22, 0.56, 0.24],
    [0, 0.42, 0.16],
    [-0.1, 0.72, 0.14],
    [0.12, 0.7, 0.14],
  ],
  [
    [0, 0.62, 0.3],
    [-0.24, 0.4, 0.2],
    [0.24, 0.38, 0.2],
    [0, 0.48, 0.22],
  ],
  [
    [0, 0.68, 0.38],
    [-0.22, 0.62, 0.18],
    [0.22, 0.62, 0.18],
  ],
];

export function worldLeft(playerWorldX, viewport) {
  return playerWorldX - viewport.w * PLAYER_SCREEN_X_RATIO;
}

export function toScreen(worldX, playerWorldX, viewport) {
  return worldX - worldLeft(playerWorldX, viewport);
}

export function inViewX(sx, half, viewW) {
  return sx + half > 0 && sx - half < viewW;
}

export function treeHalf(h) {
  return h * 0.82 + 8;
}

export function pineHalf(scale) {
  return 42 * scale;
}

export function tilesInView(left, viewW, spacing, half) {
  const start = Math.floor((left - half) / spacing) * spacing;
  const end = left + viewW + half;
  return { start, end };
}
