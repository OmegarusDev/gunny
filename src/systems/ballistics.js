import { FLESH_PEN_COST, PERFECT_MAG_MULT, SHOT_EDGE_PAD } from '../config.js';
import { limbCircles, locationalOf } from '../entities/enemy.js';
import { cameraX } from '../entities/player.js';
import { segmentHitsTerrain } from '../world/terrain.js';
import { segmentHitsCircle } from './hits.js';
import { shotEnergy } from './impulse.js';

/** Full energy to maxDist, then inverse-square from the muzzle. */
export function rangeDamageMul(travelled, maxDist) {
  const r = Math.max(1, maxDist);
  if (travelled <= r) return 1;
  return (r / travelled) ** 2;
}

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
    perfect: !!perfectMag,
    maxDist: range,
    alive: true,
    hitIds: new Set(),
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
    b.pen -= decay * Math.hypot(nx - b.x, ny - b.y);

    const dirt = segmentHitsTerrain(b.x, b.y, nx, ny, terrain.height);
    let maxT = 1;
    if (dirt) maxT = dirt.t;

    let best = null;
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      if (b.hitIds.has(enemy.id)) continue;
      for (const c of Object.values(limbCircles(enemy))) {
        const hit = segmentHitsCircle(b.x, b.y, nx, ny, c.x, c.y, c.r);
        if (!hit || hit.t > maxT) continue;
        if (!best || hit.t < best.t) best = { enemy, zone: c.zone, hit };
      }
    }

    if (best) {
      const nxDir = Math.cos(Math.atan2(b.vy, b.vx));
      const nyDir = Math.sin(Math.atan2(b.vy, b.vx));
      const travelled = Math.hypot(best.hit.x - b.ox, best.hit.y - b.oy);
      const rangeMul = rangeDamageMul(travelled, b.maxDist);
      b.hitIds.add(best.enemy.id);
      if (rangeMul > 0.05) {
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
          nx: nxDir,
          ny: nyDir,
          rangeMul,
          energy: shotEnergy(Math.hypot(b.vx, b.vy), stopped, penBefore) * rangeMul,
        });
        if (stopped) {
          b.alive = false;
          b.x = best.hit.x;
          b.y = best.hit.y;
          continue;
        }
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
    const offY = ny < -120 || ny > viewport.h + 120;
    if (b.pen <= 0 || nx > viewRight || offY) b.alive = false;
  }
  run.bullets = bullets.filter((b) => b.alive);
}
