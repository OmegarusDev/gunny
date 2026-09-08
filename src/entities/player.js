import { PLAYER_SCREEN_X_RATIO } from '../config.js';

export function createPlayer(worldX, terrain) {
  return {
    worldX,
    y: terrain.height(worldX),
    aimAngle: 0,
  };
}

export function playerScreenX(viewport) {
  return viewport.w * PLAYER_SCREEN_X_RATIO;
}

export function cameraX(playerWorldX, viewport) {
  return playerWorldX - playerScreenX(viewport);
}

export function worldToScreen(worldX, worldY, playerWorldX, viewport) {
  return {
    x: worldX - cameraX(playerWorldX, viewport),
    y: worldY,
  };
}

export function screenToWorld(sx, sy, playerWorldX, viewport) {
  return {
    x: sx + cameraX(playerWorldX, viewport),
    y: sy,
  };
}
