import { BODY_SCALE, LOCATIONAL, enemyHp } from '../config.js';

let nextId = 1;

export function createEnemy(worldX, terrain, hpMul, speed, kind = 'zombie') {
  const hp = enemyHp(hpMul);
  const y = terrain.height(worldX);
  return {
    id: nextId++,
    kind,
    worldX,
    y,
    alive: true,
    crawling: false,
    speed,
    baseSpeed: speed,
    hp,
    max: { ...hp },
    severedHead: false,
    facing: -1,
  };
}

export function limbCircles(enemy) {
  const s = BODY_SCALE;
  const x = enemy.worldX;
  const y = enemy.y;
  const gait = Math.sin(-enemy.worldX * 0.11);
  if (enemy.crawling) {
    return {
      head: { x: x + 22 * s * enemy.facing, y: y - 8 * s, r: 6.2 * s },
      upper: { x: x + 8 * s * enemy.facing, y: y - 9 * s, r: 8.5 * s },
      lower: { x: x - 6 * s * enemy.facing, y: y - 8 * s, r: 8 * s },
      lLeg: { x: x - 18 * s * enemy.facing, y: y - 6 * s, r: 6 * s },
      rLeg: { x: x - 28 * s * enemy.facing, y: y - 5 * s, r: 6 * s },
    };
  }
  const hunch = enemy.kind === 'zombie' ? 5 * s : enemy.kind === 'vampire' ? -3 * s : 2 * s;
  const headShift = enemy.kind === 'zombie' ? -3.5 * s : enemy.kind === 'vampire' ? 1 * s : 0;
  return {
    head: {
      x: x + headShift + gait * s * 0.5,
      y: y - 58 * s + Math.abs(gait) * s * 0.7 + hunch,
      r: 7.2 * s,
    },
    upper: { x: x + headShift * 0.4, y: y - 42 * s + hunch, r: 9.5 * s },
    lower: { x: x - headShift * 0.15, y: y - 26 * s + hunch * 0.3, r: 8.5 * s },
    lLeg: { x: x - 6 * s - gait * 5.5 * s, y: y - 11 * s + Math.max(0, gait) * 3.2 * s, r: 6.2 * s },
    rLeg: { x: x + 6 * s + gait * 5.5 * s, y: y - 11 * s + Math.max(0, -gait) * 3.2 * s, r: 6.2 * s },
  };
}

export function lethalCircles(enemy) {
  const c = limbCircles(enemy);
  return [c.head, c.upper, c.lower];
}

export function updateLocomotion(enemy) {
  const maxLegs = enemy.max.lLeg + enemy.max.rLeg;
  const legs = Math.max(0, enemy.hp.lLeg) + Math.max(0, enemy.hp.rLeg);
  const deadLeg = enemy.hp.lLeg <= 0 || enemy.hp.rLeg <= 0;
  if (deadLeg) {
    enemy.crawling = true;
    enemy.speed = enemy.baseSpeed * 0.2;
  } else if (legs < maxLegs * 0.5) {
    enemy.crawling = false;
    enemy.speed = enemy.baseSpeed * 0.6;
  } else {
    enemy.crawling = false;
    enemy.speed = enemy.baseSpeed;
  }
}

export function locationalOf(zone) {
  return LOCATIONAL[zone] ?? 1;
}

export function isDead(enemy) {
  return enemy.hp.head <= 0 || enemy.hp.torso <= 0;
}
