import { HIT_IMPULSE, LOCATIONAL, enemyHp } from '../config.js';
import { chaseSpeed, roleOf } from '../data/roles.js';
import { limbCirclesFromPose, offsetPose, poseEnemyLocal } from '../figure.js';

let nextId = 1;

export function createEnemy(worldX, terrain, hpMul, speed, kind = 'zombie', roleId = 'grunt') {
  const role = roleOf(roleId);
  const hp = enemyHp(hpMul * role.hp);
  const y = terrain.height(worldX);
  const pace = chaseSpeed(speed, role.id);
  return {
    id: nextId++,
    kind,
    role: role.id,
    scale: role.scale,
    worldX,
    y,
    alive: true,
    crawling: false,
    speed: pace,
    baseSpeed: pace,
    hp,
    max: { ...hp },
    severedHead: false,
    facing: -1,
    flinchLean: 0,
    stun: 0,
    pose: null,
  };
}

function cacheHitVolumes(enemy) {
  const local = enemy.pose || poseEnemyLocal(enemy);
  if (!enemy.pose) enemy.pose = local;
  const circles = limbCirclesFromPose(offsetPose(local, enemy.worldX, enemy.y));
  enemy.hitCircles = circles;
  const list = enemy.hitCircleList || (enemy.hitCircleList = []);
  const lethal = enemy.lethalCircleList || (enemy.lethalCircleList = []);
  list.length = 0;
  lethal.length = 0;
  list.push(
    circles.head,
    circles.upper,
    circles.lower,
    circles.pelvis,
    circles.shL,
    circles.shR,
    circles.lUpp,
    circles.lFore,
    circles.rUpp,
    circles.rFore,
    circles.lThigh,
    circles.rThigh,
    circles.lLeg,
    circles.rLeg,
  );
  for (const c of list) {
    if (c.zone === 'head' || c.zone === 'upper' || c.zone === 'lower') lethal.push(c);
  }
}

/** One IK pose per sim step — hits, vitals, and draw all read this. */
export function cacheEnemyPose(enemy) {
  enemy.pose = poseEnemyLocal(enemy);
  cacheHitVolumes(enemy);
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
  if (!enemy.hitCircles) cacheHitVolumes(enemy);
  return enemy.hitCircles;
}

export function limbCircleList(enemy) {
  if (!enemy.hitCircleList) cacheHitVolumes(enemy);
  return enemy.hitCircleList;
}

export function lethalCircles(enemy) {
  if (!enemy.lethalCircleList) cacheHitVolumes(enemy);
  return enemy.lethalCircleList;
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

/** Head or torso missing — legs are mobility, not the kill bar. */
export function enemyIsHurt(enemy) {
  for (const k of ['head', 'torso']) {
    if ((enemy.hp[k] ?? 0) < (enemy.max[k] ?? 0) - 1e-4) return true;
  }
  return false;
}

export function isDead(enemy) {
  return enemy.hp.head <= 0 || enemy.hp.torso <= 0;
}
