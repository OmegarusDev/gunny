import { threatForDistance, TRACK_METERS, THREAT } from '../config.js';
import { occupancyOf, pickRole, roleOf } from '../data/roles.js';
import { createEnemy } from '../entities/enemy.js';
import { cameraX } from '../entities/player.js';
import { randRange } from '../engine/rng.js';
import { pickRosterKind } from '../data/kinds.js';
import { metersFromWorldX } from '../world/metrics.js';

export function stepSpawner(run, dt, viewport) {
  run.spawnTimer -= dt;
  const meters = metersFromWorldX(run.player.worldX);
  if (!run.endless && meters >= TRACK_METERS) return;
  const threat = threatForDistance(meters, run.endless ? 0 : run.levelIndex, run.endless);
  run.threat = threat;
  const living = run.enemies.filter((e) => e.alive);
  const occ = occupancyOf(living);
  if (run.spawnTimer > 0 || occ >= threat.maxAlive) return;

  const roll = run.rng();
  const wantCluster = threat.packChance > 0 && roll < threat.packChance;
  const wantRest = !wantCluster && run.rng() < THREAT.restChance;
  const wantFollow = !wantCluster && !wantRest && run.rng() < THREAT.followChance;
  if (wantRest) run.spawnTimer = threat.spawnInterval * randRange(run.rng, 1.7, 2.6);
  else if (wantFollow) run.spawnTimer = threat.spawnInterval * randRange(run.rng, 0.28, 0.52);
  else run.spawnTimer = threat.spawnInterval * randRange(run.rng, 0.8, 1.28);

  const cam = cameraX(run.player.worldX, viewport);
  const x = cam + viewport.w + randRange(run.rng, 140, 260);

  const firstRole = pickRole(run, meters, living);
  const first = spawnOne(run, living, x, threat, firstRole, false);
  living.push(first);

  if (!wantCluster || firstRole === 'behemoth') return;
  const nextRole = pickRole(run, meters, living);
  if (nextRole === 'behemoth') return;
  if (occupancyOf(living) + roleOf(nextRole).weight > threat.maxAlive) return;
  spawnOne(run, living, first.worldX, threat, nextRole, true);
}

function spawnOne(run, living, nearX, threat, roleId, cluster) {
  const role = roleOf(roleId);
  const jitter = living.length ? randRange(run.rng, 20, 70) : 0;
  const sx = cluster
    ? nearX + randRange(run.rng, THREAT.clusterGapMin, THREAT.clusterGapMax)
    : spaceFromLiving(nearX + jitter, living, role.gap);
  const kind = pickRosterKind(run.biome.roster, run.rng);
  const enemy = createEnemy(sx, run.terrain, threat.hpMul, threat.speed, kind, role.id);
  run.enemies.push(enemy);
  return enemy;
}

function spaceFromLiving(x, living, gap) {
  let out = x;
  for (let n = 0; n < 6; n++) {
    let pushed = false;
    for (const e of living) {
      const need = Math.max(gap, roleOf(e.role).gap);
      if (Math.abs(e.worldX - out) < need) {
        out = e.worldX + need;
        pushed = true;
      }
    }
    if (!pushed) break;
  }
  return out;
}
