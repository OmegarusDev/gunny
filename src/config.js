export const DESIGN_H = 720;
export const FIXED_DT = 1 / 60;
export const MAX_FRAME_DT = 0.1;
export const PX_PER_M = 10;
export const PLAYER_SCREEN_X_RATIO = 0.25;
export const V_RETREAT = 70;
export const TERRAIN_AMP = 0.024;
export const BLOOM_CAP_DEG = 12;
export const JAM_PENALTY = 0.9;
export const RELOAD_FORGIVE = 0.32;
export const PERFECT_MAG_MULT = 1.25;
export const RAGDOLL_FREEZE_SPEED = 0.05;
export const MAX_FROZEN = 28;
export const GRAVITY = 980;
export const FLESH_PEN_COST = 1;
export const TRACK_METERS = 200;

export const LOCATIONAL = {
  head: 2.0,
  upper: 1.0,
  lower: 0.9,
  lLeg: 0.5,
  rLeg: 0.5,
};

export const BASE_CRIT_CHANCE = 0.05;
export const BASE_CRIT_MULT = 1.1;

/** Kill cash is the only early store fuel. mag_2 costs 100 ≈ 10 kills. */
export const ECONOMY = {
  cashPerKill: 10,
  xpPerMeter: 0.1,
  xpPerKill: 8,
  xpPerHeadshot: 5,
  extractBonus: 40,
  extractXp: 45,
};

/** @param {number} stage Campaign stage (floor(level/5)); Endless always 0. */
export function threatForDistance(meters, stage, endless) {
  const tier = 1 + stage * 0.15;
  const speedTier = 1 + stage * 0.08;
  let band;
  const d = endless ? meters : Math.min(meters, TRACK_METERS);
  if (d < 50) {
    band = { spawn: 1.85, max: 3, speed: 118, hpMul: 1.15, profile: 'walk' };
  } else if (d < 150) {
    band = { spawn: 1.15, max: 6, speed: 142, hpMul: 1, profile: 'trot' };
  } else {
    band = { spawn: 0.58, max: 10, speed: 168, hpMul: 0.82, profile: 'sprint' };
  }
  if (endless && meters > TRACK_METERS) {
    const extra = (meters - TRACK_METERS) / 120;
    band.spawn = Math.max(0.28, band.spawn / (1 + extra * 0.35));
    band.max = Math.min(18, Math.floor(band.max + extra * 2));
    band.speed *= 1 + extra * 0.06;
  }
  const maxAlive = Math.ceil(band.max * tier);
  return {
    spawnInterval: band.spawn / tier,
    maxAlive: endless ? Math.min(18, maxAlive) : maxAlive,
    speed: band.speed * speedTier,
    hpMul: band.hpMul,
    profile: band.profile,
  };
}

export function enemyHp(hpMul) {
  return {
    head: 40 * hpMul,
    torso: 56 * hpMul,
    lLeg: 22 * hpMul,
    rLeg: 22 * hpMul,
  };
}
