import { BIOMES } from '../../data/biomes.js';
import { createTerrain } from '../../world/terrain.js';

const cache = {
  biomeIndex: -1,
  h: 0,
  terrain: null,
  run: null,
};

export function hubTerrain(viewport, biomeIndex = 0) {
  const idx = biomeIndex % BIOMES.length;
  if (cache.terrain && cache.biomeIndex === idx && cache.h === viewport.h) return cache.terrain;
  cache.biomeIndex = idx;
  cache.h = viewport.h;
  cache.terrain = createTerrain(1801 + idx * 131, viewport.h, BIOMES[idx]);
  cache.run = null;
  return cache.terrain;
}

export function hubRun(viewport, t, biomeIndex = 0) {
  const terrain = hubTerrain(viewport, biomeIndex);
  if (!cache.run) {
    cache.run = {
      biome: BIOMES[cache.biomeIndex],
      player: { worldX: 0 },
      terrain,
    };
  }
  cache.run.player.worldX = -t * 36;
  return cache.run;
}
