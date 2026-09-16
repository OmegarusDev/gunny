import { HIT_IMPULSE, LOCATIONAL, enemyHp } from '../config.js';
import { limbCirclesFromPose, offsetPose, poseEnemyLocal } from '../figure.js';

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
    flinchLean: 0,
    stun: 0,
    pose: null,
  };
}

/** One IK pose per sim step — hits, vitals, and draw all read this. */
export function cacheEnemyPose(enemy) {
  enemy.pose = poseEnemyLocal(enemy);
  return enemy.pose;
}

export function applyFlinch(enemy, hit, { crit = false } = {}) {
  const e = hit.energy || 0;
  let lean = (enemy.flinchLean || 0) + hit.nx * e * HIT_IMPULSE.flinchLean;
  if (hit.zone === 'head') lean += hit.nx * e * 0.22;
  if (crit) lean += hit.nx * e * HIT_IMPULSE.critLean;
  const cap = HIT_IMPULSE.flinchCap;
  enemy.flinchLean = Math.max(-cap, Math.min(cap, lean));
  if (crit) {
    enemy.stun = Math.min(HIT_IMPULSE.stunMax, (enemy.stun || 0) + e * HIT_IMPULSE.stunPerEnergy);
  }
}

export function stepFlinch(enemy, dt) {
  const damp = Math.exp(-dt * HIT_IMPULSE.flinchDamp);
  enemy.flinchLean = (enemy.flinchLean || 0) * damp;
  enemy.stun = Math.max(0, (enemy.stun || 0) - dt);
}

export function limbCircles(enemy) {
  const local = enemy.pose || poseEnemyLocal(enemy);
  return limbCirclesFromPose(offsetPose(local, enemy.worldX, enemy.y));
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

/** Head + torso remaining. Legs are mobility, not the kill bar. */
export function lethalHpRatio(enemy) {
  const max = (enemy.max?.head || 0) + (enemy.max?.torso || 0);
  if (max <= 0) return 0;
  const cur = Math.max(0, enemy.hp.head) + Math.max(0, enemy.hp.torso);
  return Math.max(0, Math.min(1, cur / max));
}

/** Any pool missing — bar stays hidden on fresh spawns. */
export function enemyIsHurt(enemy) {
  for (const k of ['head', 'torso', 'lLeg', 'rLeg']) {
    if ((enemy.hp[k] ?? 0) < (enemy.max[k] ?? 0) - 1e-4) return true;
  }
  return false;
}

export function isDead(enemy) {
  return enemy.hp.head <= 0 || enemy.hp.torso <= 0;
}
