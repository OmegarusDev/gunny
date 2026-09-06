import { PX_PER_M, threatForDistance, TRACK_METERS } from '../config.js';
import { createEnemy } from '../entities/enemy.js';
import { cameraX } from '../entities/player.js';
import { randRange } from '../engine/rng.js';

export function stepSpawner(run, dt, viewport) {
  run.spawnTimer -= dt;
  const meters = -run.player.worldX / PX_PER_M;
  if (!run.endless && meters >= TRACK_METERS) return;
  const threat = threatForDistance(meters, run.levelIndex, run.endless);
  run.threat = threat;
  const alive = run.enemies.filter((e) => e.alive).length;
  if (run.spawnTimer > 0 || alive >= threat.maxAlive) return;
  run.spawnTimer = threat.spawnInterval * randRange(run.rng, 0.7, 1.15);
  const cam = cameraX(run.player.worldX, viewport);
  const x = cam + viewport.w + randRange(run.rng, 20, 80);
  run.enemies.push(createEnemy(x, run.terrain, threat.hpMul, threat.speed, run.biome.kind));
}
