export const DESIGN_H = 720;
export const FIXED_DT = 1 / 60;
export const MAX_FRAME_DT = 0.1;
/** Backing-store cap. 3× phones pay fill cost without extra sharpness at 720 design. */
export const MAX_DPR = 2;
/** Longer metre so gait / scenery match the counter (visual scroll stays ~70px/s). */
export const PX_PER_M = 35;
export const PLAYER_SCREEN_X_RATIO = 0.25;
/** Campaign pace: 2 m/s → 250m in 125s. */
export const RETREAT_MPS = 2;
export const V_RETREAT = RETREAT_MPS * PX_PER_M;
export const TERRAIN_AMP = 0.024;
export const BLOOM_CAP_DEG = 12;
/** Base aim disc radius (px) from the gun — optics/skills push this out. */
export const AIM_REACH_BASE = 168;
export const AIM_REACH_MIN = 120;
export const AIM_REACH_MAX = 360;
/** Static cone (degrees) before bloom/heat — first shots are not lasers. */
export const BASE_SPREAD_DEG = 2.35;
export const JAM_PENALTY = 0.9;
export const RELOAD_FORGIVE = 0.32;
export const PERFECT_MAG_MULT = 1.25;
export const RAGDOLL_FREEZE_SPEED = 0.05;
export const MAX_FROZEN = 28;
export const GRAVITY = 980;
export const FLESH_PEN_COST = 1;
/** Pen × speed → hit impulse. No extra ammo mass stat. */
export const HIT_IMPULSE = {
  refSpeed: 820,
  overpen: 0.35,
  ragdollKick: 10,
  flinchLean: 0.5,
  critLean: 0.12,
  stunPerEnergy: 0.16,
  stunMax: 0.28,
  stunHitch: 0.3,
  flinchDamp: 20,
  flinchCap: 0.35,
};
export const TRACK_METERS = 250;

/** Within-road ramp (SPAN) is larger than per-road start shift (STEP). */
export const THREAT = {
  step: 0.35,
  span: 1,
  chill: { spawn: 3.4, max: 1, speed: 108, packChance: 0.02, hpMul: 1.15 },
  hectic: { spawn: 1.05, max: 7, speed: 168, packChance: 0.45, hpMul: 0.82 },
  spawnFloor: 0.45,
  maxAliveCap: 14,
  packCap: 0.55,
};

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

/** @param {number} levelIndex Campaign road (0 = first). Endless always treated as 0 for the 250m curve. */
export function threatForDistance(meters, levelIndex, endless) {
  const L = endless ? 0 : Math.max(0, levelIndex || 0);
  const trackT = Math.max(0, Math.min(1, meters / TRACK_METERS));
  const pressure = L * THREAT.step + trackT * THREAT.span;
  const u = THREAT.span > 0 ? pressure / THREAT.span : 0;
  const { chill, hectic } = THREAT;
  const lerp = (a, b) => a + (b - a) * u;

  let spawn = Math.max(THREAT.spawnFloor, lerp(chill.spawn, hectic.spawn));
  let maxAlive = Math.max(1, Math.round(lerp(chill.max, hectic.max)));
  let speed = lerp(chill.speed, hectic.speed);
  let packChance = lerp(chill.packChance, hectic.packChance);
  const hpMul = lerp(chill.hpMul, hectic.hpMul);

  if (endless && meters > TRACK_METERS) {
    const extra = (meters - TRACK_METERS) / 120;
    spawn = Math.max(THREAT.spawnFloor, spawn / (1 + extra * 0.3));
    maxAlive = Math.min(THREAT.maxAliveCap, Math.floor(maxAlive + extra * 1.5));
    speed *= 1 + extra * 0.06;
    packChance += extra * 0.05;
  }

  return {
    spawnInterval: spawn,
    maxAlive: Math.min(THREAT.maxAliveCap, maxAlive),
    speed,
    hpMul,
    packChance: Math.max(0, Math.min(THREAT.packCap, packChance)),
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
