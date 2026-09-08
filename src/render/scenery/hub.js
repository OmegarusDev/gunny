import { BIOMES } from '../../data/biomes.js';
import { createTerrain } from '../../world/terrain.js';

export function hubTerrain(viewport, biomeIndex = 0) {
  return createTerrain(1801 + (biomeIndex % BIOMES.length) * 131, viewport.h);
}

export function hubRun(viewport, t, biomeIndex = 0) {
  return {
    biome: BIOMES[biomeIndex % BIOMES.length],
    player: { worldX: -t * 36 },
    terrain: hubTerrain(viewport, biomeIndex),
  };
}
