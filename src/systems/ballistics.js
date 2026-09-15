import { FLESH_PEN_COST, PERFECT_MAG_MULT, SHOT_EDGE_PAD } from '../config.js';
import { limbCircles, locationalOf } from '../entities/enemy.js';
import { cameraX } from '../entities/player.js';
import { segmentHitsTerrain } from '../world/terrain.js';
import { segmentHitsCircle } from './hits.js';
import { shotEnergy } from './impulse.js';

export function spawnBullet(x, y, angle, stats, perfectMag, maxDist) {
  const speed = stats.bulletSpeed;
  const range = Math.max(1, maxDist ?? stats.shotRange ?? stats.aimReach);
  return {
    x,
    y,
    ox: x,
    oy: y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    pen: stats.pen * (perfectMag ? PERFECT_MAG_MULT : 1),
    maxDist: range,
    alive: true,
    hitIds: new Set(),
    age: 0,
  };
}

export function stepBullets(run, dt, viewport) {
  const { bullets, enemies, terrain, weather, stats } = run;
  const decay = stats.penDecay;
  const viewRight = cameraX(run.player.worldX, viewport) + viewport.w - SHOT_EDGE_PAD;
  for (const b of bullets) {
    if (!b.alive) continue;
    const nx = b.x + b.vx * dt + weather.windX * dt;
    const ny = b.y + b.vy * dt + weather.windY * dt;
    b.age += dt;
    b.pen -= decay * Math.hypot(nx - b.x, ny - b.y);

    const dirt = segmentHitsTerrain(b.x, b.y, nx, ny, terrain.height);
    let maxT = 1;
    if (dirt) maxT = dirt.t;

    let best = null;
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      if (b.hitIds.has(enemy.id)) continue;
      const limbs = limbCircles(enemy);
      for (const zone of ['head', 'upper', 'lower', 'lLeg', 'rLeg']) {
        const c = limbs[zone];
        const hit = segmentHitsCircle(b.x, b.y, nx, ny, c.x, c.y, c.r);
        if (!hit || hit.t > maxT) continue;
        if (!best || hit.t < best.t) best = { enemy, zone, hit };
      }
    }

    if (best) {
      const nx = Math.cos(Math.atan2(b.vy, b.vx));
      const ny = Math.sin(Math.atan2(b.vy, b.vx));
      b.hitIds.add(best.enemy.id);
      const penBefore = b.pen;
      b.pen -= FLESH_PEN_COST;
      const stopped = b.pen <= 0;
      run.pendingHits.push({
        bullet: b,
        enemy: best.enemy,
        zone: best.zone,
        x: best.hit.x,
        y: best.hit.y,
        locational: locationalOf(best.zone),
        nx,
        ny,
        energy: shotEnergy(Math.hypot(b.vx, b.vy), stopped, penBefore),
      });
      if (stopped) {
        b.alive = false;
        b.x = best.hit.x;
        b.y = best.hit.y;
        continue;
      }
      b.x = best.hit.x;
      b.y = best.hit.y;
      continue;
    }

    if (dirt) {
      b.alive = false;
      b.x = dirt.x;
      b.y = dirt.y;
      run.impacts.push({ x: dirt.x, y: dirt.y, life: 0.18, dirt: true });
      continue;
    }

    b.x = nx;
    b.y = ny;
    const travelled = Math.hypot(nx - b.ox, ny - b.oy);
    if (b.age > 1.6 || b.pen <= 0 || travelled >= b.maxDist || nx > viewRight) b.alive = false;
  }
  run.bullets = bullets.filter((b) => b.alive);
}
