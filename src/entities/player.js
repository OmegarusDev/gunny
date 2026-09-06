import { PLAYER } from '../config.js';

export function createPlayer(worldX, terrain) {
  return {
    worldX,
    y: terrain.height(worldX),
    aimAngle: 0,
    coreW: PLAYER.coreW,
    coreH: PLAYER.coreH,
  };
}

export function playerScreenX(viewport) {
  return viewport.w * 0.25;
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
