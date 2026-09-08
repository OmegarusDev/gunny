export const DESIGN_H = 720;
export const FIXED_DT = 1 / 60;
export const MAX_FRAME_DT = 0.1;
/** Longer metre so gait / scenery match the counter (visual scroll stays ~70px/s). */
export const PX_PER_M = 35;
export const PLAYER_SCREEN_X_RATIO = 0.25;
/** Campaign pace: 2 m/s → 250m in 125s. */
export const RETREAT_MPS = 2;
export const V_RETREAT = RETREAT_MPS * PX_PER_M;
export const TERRAIN_AMP = 0.024;
export const BLOOM_CAP_DEG = 12;
export const JAM_PENALTY = 0.9;
export const RELOAD_FORGIVE = 0.32;
export const PERFECT_MAG_MULT = 1.25;
export const RAGDOLL_FREEZE_SPEED = 0.05;
export const MAX_FROZEN = 28;
export const GRAVITY = 980;
export const FLESH_PEN_COST = 1;
export const TRACK_METERS = 250;

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
  // Early: few, spaced. Late: denser, occasional pairs. packChance = chance to spawn 2.
  if (d < 55) {
    band = { spawn: 2.6, max: 2, speed: 118, hpMul: 1.15, profile: 'walk', packChance: 0.08 };
  } else if (d < 120) {
    band = { spawn: 2.15, max: 3, speed: 132, hpMul: 1.05, profile: 'trot', packChance: 0.18 };
  } else if (d < 185) {
    band = { spawn: 1.55, max: 4, speed: 148, hpMul: 0.95, profile: 'trot', packChance: 0.32 };
  } else {
    band = { spawn: 1.05, max: 7, speed: 168, hpMul: 0.82, profile: 'sprint', packChance: 0.45 };
  }
  if (endless && meters > TRACK_METERS) {
    const extra = (meters - TRACK_METERS) / 120;
    band.spawn = Math.max(0.4, band.spawn / (1 + extra * 0.3));
    band.max = Math.min(14, Math.floor(band.max + extra * 1.5));
    band.speed *= 1 + extra * 0.06;
    band.packChance = Math.min(0.55, band.packChance + extra * 0.05);
  }
  const maxAlive = Math.ceil(band.max * tier);
  return {
    spawnInterval: band.spawn / tier,
    maxAlive: endless ? Math.min(14, maxAlive) : maxAlive,
    speed: band.speed * speedTier,
    hpMul: band.hpMul,
    profile: band.profile,
    packChance: band.packChance,
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
