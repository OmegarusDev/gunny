import { BIOMES } from '../../data/biomes.js';
import { createTerrain } from '../../world/terrain.js';

export function hubTerrain(viewport, biomeIndex = 0) {
  const biome = BIOMES[biomeIndex % BIOMES.length];
  return createTerrain(1801 + (biomeIndex % BIOMES.length) * 131, viewport.h, biome);
}

export function hubRun(viewport, t, biomeIndex = 0) {
  return {
    biome: BIOMES[biomeIndex % BIOMES.length],
    player: { worldX: -t * 36 },
    terrain: hubTerrain(viewport, biomeIndex),
  };
}
