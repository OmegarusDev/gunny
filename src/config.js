/**
 * Coordinate spaces:
 * - Design: 720px tall (`DESIGN_H`). Sim, aim, and canvas drawing live here.
 * - CSS overlay: device pixels. Input maps client → design via `height / DESIGN_H`.
 * - World X: road metres × `PX_PER_M`. The gunner is glued at `PLAYER_SCREEN_X_RATIO`.
 */
export const DESIGN_H = 720;
export const FIXED_DT = 1 / 60;
export const MAX_FRAME_DT = 0.1;
/** Backing-store cap. 3× phones pay fill cost without extra sharpness at 720 design. */
export const MAX_DPR = 2;
/** Longer metre so gait / scenery match the counter (visual scroll stays ~70px/s). */
export const PX_PER_M = 35;
export const PLAYER_SCREEN_X_RATIO = 0.2;
/** Campaign pace: 2 m/s → 250m in 125s. */
export const RETREAT_MPS = 2;
export const V_RETREAT = RETREAT_MPS * PX_PER_M;
/** Valley floor sits this fraction above the bottom of the screen. */
export const TERRAIN_FLOOR_PAD = 0.065;
/** Empty sky above the gunner’s head at the highest peak. */
export const TERRAIN_HEADROOM = 0.18;
/** Typical half-span; real min/max come from floor pad + headroom. */
export const TERRAIN_AMP = 0.18;
export const BLOOM_CAP_DEG = 12;
/** Irons: sight picture to ~35% of the screen. Optics push this out. LPVO is viewport-wide. */
export const AIM_SCREEN_FRAC = 0.35;
/** Bullets: two-thirds across. Barrels extend this, optics do not. */
export const SHOT_SCREEN_FRAC = 2 / 3;
export const DESIGN_W = DESIGN_H * (16 / 9);
export const AIM_REACH_BASE = DESIGN_W * (AIM_SCREEN_FRAC - PLAYER_SCREEN_X_RATIO);
export const AIM_REACH_MIN = Math.round(AIM_REACH_BASE * 0.72);
/** Last disc optic (ACOG). LPVO ignores this and clamps to the viewport. */
export const AIM_REACH_MAX = 520;
export const SHOT_REACH_BASE = DESIGN_W * (SHOT_SCREEN_FRAC - PLAYER_SCREEN_X_RATIO);
export const SHOT_REACH_MIN = Math.round(SHOT_REACH_BASE * 0.72);
export const SHOT_REACH_MAX = 860;
/** Keep the last metres of the screen (and off-screen spawns) out of shot range. */
export const SHOT_EDGE_PAD = 36;

function visibleFromGun(viewport) {
  return viewport.w * (1 - PLAYER_SCREEN_X_RATIO) - SHOT_EDGE_PAD;
}

export function baseAimReach(viewport) {
  return viewport.w * (AIM_SCREEN_FRAC - PLAYER_SCREEN_X_RATIO);
}

export function baseShotRange(viewport) {
  return viewport.w * (SHOT_SCREEN_FRAC - PLAYER_SCREEN_X_RATIO);
}

export function clampAimReach(range, viewport) {
  return Math.max(AIM_REACH_MIN, Math.min(range, visibleFromGun(viewport)));
}

export function clampShotRange(range, viewport) {
  return Math.max(SHOT_REACH_MIN, Math.min(range, visibleFromGun(viewport)));
}

/** How far the pointer/reticle can be held. Optics only — not barrels, stocks, or marksman. */
export function effectiveAimReach(stats, viewport) {
  if (usesFullScreenAim(stats)) return Math.hypot(viewport.w, viewport.h);
  const extra = (stats?.aimReach || 0) - AIM_REACH_BASE;
  return clampAimReach(baseAimReach(viewport) + extra, viewport);
}

export function usesFullScreenAim(stats) {
  return (stats?.fullScreenAim || 0) > 0;
}

/** How far a round keeps full energy. Past this, damage drops hard; tracers still fly. */
export function effectiveShotRange(stats, viewport) {
  const extra = (stats?.shotRange || 0) - SHOT_REACH_BASE;
  return clampShotRange(baseShotRange(viewport) + extra, viewport);
}
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

/** Within-road swarm ramp (SPAN) is larger than per-road start shift (STEP). */
export const THREAT = {
  step: 0.35,
  span: 1,
  chill: { spawn: 3.4, max: 1, speed: 124, packChance: 0.02 },
  hectic: { spawn: 1.05, max: 7, speed: 186, packChance: 0.45 },
  /** Campaign L0 grunt toughness at 0m. */
  gruntHp: 1,
  /** Each later road’s baseline HP. */
  roadHpStep: 0.18,
  /** Subtle extra HP across one 250m extract (~10%). */
  roadHpRamp: 0.1,
  /** Endless starts tougher than Forest open, then climbs with metres. */
  endlessHp: 1.24,
  endlessHpPerM: 0.00215,
  /** 0 = Forest open; 1 = Forest extract swarm. Endless opens already mid-hectic. */
  endlessOpen: 0.52,
  /** Determined chase. Below a sprint for almost the whole game. */
  speedCap: 204,
  /** Late-campaign / deep-endless only — urgent, not a blur. */
  speedSprint: 236,
  speedOver: 0.1,
  /** Campaign `over` before the sprint band. ~road 13 finale. */
  sprintOver: 4.5,
  /** Endless extra units ((m-250)/120) before the sprint band. ~1.9km. */
  sprintEndless: 14,
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

/** Kill cash is the only early store fuel. mag_2 costs 100 ≈ 10 kills.
 * XP is distance + kills + heads + extract. First skill ranks cost 30–50. */
export const ECONOMY = {
  cashPerKill: 10,
  xpPerMeter: 0.05,
  xpPerKill: 3,
  xpPerHeadshot: 2,
  xpPerPerfect: 1,
  extractBonus: 40,
  extractXp: 18,
};

/** Struck, drop, crawl off the left, then the end screen. Flavour is escape, not death. */
export const ESCAPE_DURATION = 1.05;
export const ESCAPE_DROP = 0.22;
export const ESCAPE_CRAWL_PPS = 340;

/** Cached WebAPK / home-screen payload. JS + icons, no extra asset packs. */
export const INSTALL_DOWNLOAD = 'about 1 MB';

function swarmFromPressure(pressure) {
  const { chill, hectic } = THREAT;
  const rawU = THREAT.span > 0 ? pressure / THREAT.span : 0;
  const u = Math.max(0, Math.min(1, rawU));
  const over = Math.max(0, rawU - 1);
  const lerp = (a, b) => a + (b - a) * u;

  let spawn = Math.max(THREAT.spawnFloor, lerp(chill.spawn, hectic.spawn));
  let maxAlive = Math.max(1, Math.round(lerp(chill.max, hectic.max)));
  let speed = lerp(chill.speed, hectic.speed);
  let packChance = lerp(chill.packChance, hectic.packChance);

  if (over > 0) {
    spawn = Math.max(THREAT.spawnFloor, spawn / (1 + over * 0.18));
    maxAlive = Math.min(THREAT.maxAliveCap, Math.floor(maxAlive + over * 1.2));
    speed *= 1 + over * THREAT.speedOver;
    packChance += over * 0.04;
  }

  return { spawn, maxAlive, speed, packChance, over };
}

/**
 * Campaign: per-road HP baseline, plus a small climb toward extract.
 * Endless: steeper HP/swarm with metres, not campaign `levelIndex`.
 */
export function threatForDistance(meters, levelIndex, endless) {
  const m = Math.max(0, meters || 0);
  const L = Math.max(0, levelIndex || 0);
  const trackT = Math.max(0, Math.min(1, m / TRACK_METERS));

  let pressure;
  let hpMul;
  if (endless) {
    pressure = THREAT.endlessOpen * THREAT.span + (m / TRACK_METERS) * THREAT.span;
    hpMul = THREAT.endlessHp * (1 + m * THREAT.endlessHpPerM);
  } else {
    pressure = L * THREAT.step + trackT * THREAT.span;
    hpMul = THREAT.gruntHp * (1 + L * THREAT.roadHpStep) * (1 + trackT * THREAT.roadHpRamp);
  }

  const swarm = swarmFromPressure(pressure);
  let { spawn, maxAlive, speed, packChance, over } = swarm;

  const extra = endless && m > TRACK_METERS ? (m - TRACK_METERS) / 120 : 0;
  speed = Math.min(speed, THREAT.speedCap);
  const sprintT = endless
    ? Math.max(0, extra - THREAT.sprintEndless) / 10
    : Math.max(0, over - THREAT.sprintOver) / 8;
  if (sprintT > 0) {
    const t = Math.min(1, sprintT);
    speed = THREAT.speedCap + (THREAT.speedSprint - THREAT.speedCap) * t;
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
  const m = Math.max(0.2, hpMul);
  return {
    head: Math.max(1, 40 * m),
    torso: Math.max(1, 56 * m),
    lLeg: Math.max(1, 22 * m),
    rLeg: Math.max(1, 22 * m),
  };
}
