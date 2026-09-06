import { FLESH_PEN_COST } from '../config.js';
import { limbCircles, locationalOf } from '../entities/enemy.js';
import { segmentHitsTerrain } from '../world/terrain.js';
import { segmentHitsCircle } from './hits.js';

export function spawnBullet(x, y, angle, stats, perfectMag) {
  const speed = stats.bulletSpeed;
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    pen: stats.pen * (perfectMag ? 1.25 : 1),
    damage: stats.damage,
    alive: true,
    hitIds: new Set(),
    age: 0,
  };
}

export function stepBullets(run, dt) {
  const { bullets, enemies, terrain, weather, stats } = run;
  const decay = stats.penDecay;
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
      run.pendingHits.push({
        bullet: b,
        enemy: best.enemy,
        zone: best.zone,
        x: best.hit.x,
        y: best.hit.y,
        locational: locationalOf(best.zone),
        nx: Math.cos(Math.atan2(b.vy, b.vx)),
        ny: Math.sin(Math.atan2(b.vy, b.vx)),
      });
      b.hitIds.add(best.enemy.id);
      b.pen -= FLESH_PEN_COST;
      if (b.pen <= 0) {
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
    if (b.age > 1.6 || b.pen <= 0) b.alive = false;
  }
  run.bullets = bullets.filter((b) => b.alive);
}
