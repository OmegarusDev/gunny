import { PLAYER_SCREEN_X_RATIO } from '../config.js';
import { gunWorld } from '../figure.js';

/** Screen-space gun pivot (muzzle shoulder), used as aim-reach center. */
export function gunScreenAnchor(player, viewport) {
  const sx = viewport.w * PLAYER_SCREEN_X_RATIO;
  const gun = gunWorld(player);
  return {
    x: sx + gun.sx,
    y: player.y + gun.sy,
  };
}

/** Clamp a raw pointer into the aim-reach disc around the gun. */
export function clampAimPoint(rawX, rawY, anchorX, anchorY, reach) {
  const r = Math.max(1, reach);
  const dx = rawX - anchorX;
  const dy = rawY - anchorY;
  const d = Math.hypot(dx, dy);
  if (d <= r || d < 1e-6) return { x: rawX, y: rawY, clamped: false };
  const s = r / d;
  return { x: anchorX + dx * s, y: anchorY + dy * s, clamped: true };
}

/** LPVO: hold anywhere on the canvas. */
export function clampToViewport(rawX, rawY, viewW, viewH) {
  const x = Math.max(0, Math.min(rawX, viewW));
  const y = Math.max(0, Math.min(rawY, viewH));
  return { x, y, clamped: x !== rawX || y !== rawY };
}

export function resolveAimPoint(rawX, rawY, player, viewport, aimReach, opts = {}) {
  const anchor = gunScreenAnchor(player, viewport);
  const fullScreen = !!opts.fullScreen;
  const point = fullScreen
    ? clampToViewport(rawX, rawY, viewport.w, viewport.h)
    : clampAimPoint(rawX, rawY, anchor.x, anchor.y, aimReach);
  return {
    x: point.x,
    y: point.y,
    clamped: point.clamped,
    anchorX: anchor.x,
    anchorY: anchor.y,
    reach: Math.max(1, aimReach),
    fullScreen,
  };
}
