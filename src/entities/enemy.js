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
  if (enemy.crawling) {
    return {
      head: { x: x + 22 * s * enemy.facing, y: y - 8 * s, r: 6 * s },
      upper: { x: x + 8 * s * enemy.facing, y: y - 9 * s, r: 8 * s },
      lower: { x: x - 6 * s * enemy.facing, y: y - 8 * s, r: 8 * s },
      lLeg: { x: x - 18 * s * enemy.facing, y: y - 6 * s, r: 6 * s },
      rLeg: { x: x - 28 * s * enemy.facing, y: y - 5 * s, r: 6 * s },
    };
  }
  return {
    head: { x, y: y - 58 * s, r: 7 * s },
    upper: { x, y: y - 42 * s, r: 9 * s },
    lower: { x, y: y - 26 * s, r: 8 * s },
    lLeg: { x: x - 5 * s, y: y - 11 * s, r: 6 * s },
    rLeg: { x: x + 5 * s, y: y - 11 * s, r: 6 * s },
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
