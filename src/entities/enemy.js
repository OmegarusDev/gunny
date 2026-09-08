import { LOCATIONAL, enemyHp } from '../config.js';
import { limbCirclesFromPose, poseEnemy } from '../figure.js';

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
  return limbCirclesFromPose(poseEnemy(enemy));
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
