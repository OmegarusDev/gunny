import { threatForDistance, TRACK_METERS } from '../config.js';
import { createEnemy } from '../entities/enemy.js';
import { cameraX } from '../entities/player.js';
import { randRange } from '../engine/rng.js';
import { metersFromWorldX } from '../world/metrics.js';

const MIN_GAP = 130;

export function stepSpawner(run, dt, viewport) {
  run.spawnTimer -= dt;
  const meters = metersFromWorldX(run.player.worldX);
  if (!run.endless && meters >= TRACK_METERS) return;
  const stage = run.endless ? 0 : Math.floor(run.levelIndex / 5);
  const threat = threatForDistance(meters, stage, run.endless);
  run.threat = threat;
  const living = run.enemies.filter((e) => e.alive);
  if (run.spawnTimer > 0 || living.length >= threat.maxAlive) return;

  const wantPair = threat.packChance > 0 && run.rng() < threat.packChance;
  const count = Math.min(wantPair ? 2 : 1, threat.maxAlive - living.length);
  run.spawnTimer = threat.spawnInterval * randRange(run.rng, 0.85, 1.25);

  const cam = cameraX(run.player.worldX, viewport);
  let x = cam + viewport.w + randRange(run.rng, 140, 260);
  x = spaceFromLiving(x, living, MIN_GAP);

  for (let i = 0; i < count; i++) {
    const sx = i === 0 ? x : spaceFromLiving(x + MIN_GAP + randRange(run.rng, 20, 70), living, MIN_GAP);
    const enemy = createEnemy(sx, run.terrain, threat.hpMul, threat.speed, run.biome.kind);
    run.enemies.push(enemy);
    living.push(enemy);
  }
}

function spaceFromLiving(x, living, gap) {
  let out = x;
  for (let n = 0; n < 6; n++) {
    let pushed = false;
    for (const e of living) {
      if (Math.abs(e.worldX - out) < gap) {
        out = e.worldX + gap;
        pushed = true;
      }
    }
    if (!pushed) break;
  }
  return out;
}
