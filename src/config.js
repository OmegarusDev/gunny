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

/** How far a round keeps full energy and cone. Past this, damage and accuracy drop with distance squared; tracers still fly. */
export function effectiveShotRange(stats, viewport) {
  const extra = (stats?.shotRange || 0) - SHOT_REACH_BASE;
  return clampShotRange(baseShotRange(viewport) + extra, viewport);
}
export const JAM_PENALTY = 0.9;
export const RELOAD_FORGIVE = 0.32;
/** Perfect reload: +10% cyclic rate for the mag you just seated. */
export const PERFECT_MAG_ROF = 1.1;
export const RAGDOLL_FREEZE_SPEED = 0.05;
export const MAX_FROZEN = 28;
export const GRAVITY = 980;
export const FLESH_PEN_COST = 1;
/** Flat pen added on a head hit. Stacks with crit pen. */
export const HEADSHOT_PEN = 0.12;
/** Flat pen added on a crit. Stacks with headshot pen. */
export const CRIT_PEN = 0.12;
/** Pen × speed → hit impulse. No extra ammo mass stat. */
export const HIT_IMPULSE = {
  refSpeed: 1600,
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

/**
 * Two linear scales, compounded. In-road +20%, per-road +10% at open, so
 * Road n+1 opens harder than Road n opened, but easier than Road n extracted.
 * Density uses the same pair. Rhythm (clusters / rests) lives in the spawner.
 */
export const THREAT = {
  chill: { spawn: 2.9, max: 2, speed: 138, packChance: 0.18 },
  /** Campaign L0 grunt toughness at 0m. Torso is 50 at hpMul 1. */
  gruntHp: 1,
  roadHpStep: 0.1,
  roadHpRamp: 0.2,
  roadDensityStep: 0.1,
  roadDensityRamp: 0.2,
  speedStep: 0.025,
  speedRamp: 0.045,
  /** Endless HP and density vs the same campaign metres. */
  endlessHard: 2,
  speedCap: 222,
  speedSprint: 252,
  /** Campaign depth (road + extract t) before the sprint band. ~road 13. */
  sprintRoad: 13,
  /** Endless extra units ((m-250)/120) before the sprint band. ~1.9km. */
  sprintEndless: 14,
  spawnFloor: 0.55,
  maxAliveCap: 14,
  packCap: 0.42,
  packGrow: 0.05,
  restChance: 0.2,
  followChance: 0.12,
  clusterGapMin: 36,
  clusterGapMax: 78,
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
 * XP is distance + kills + heads. First grunt is 5 XP, then × hpMul by road.
 * Clearing 250m pays cash only: $50 on Forest, ×1.2 per later road, capped so
 * Road 20 does not print a receiver. */
export const ECONOMY = {
  cashPerKill: 10,
  xpPerMeter: 0.05,
  xpPerKill: 5,
  xpPerHeadshot: 2,
  xpPerPerfect: 1,
  extractCashBase: 50,
  extractCashRate: 1.2,
  extractCashCap: 400,
};

/** Campaign 250m payday. Uncapped 1.2^L is $1.6k by Road 20 and tens of thousands later. */
export function extractCash(levelIndex) {
  const L = Math.max(0, Math.floor(Number(levelIndex) || 0));
  const raw = ECONOMY.extractCashBase * ECONOMY.extractCashRate ** L;
  return Math.round(Math.min(ECONOMY.extractCashCap, raw));
}

/** Struck, ragdoll flop, then the end screen. Flavour copy is still an escape. */
export const DEATH_HOLD = 1.8;

/** Cached WebAPK / home-screen payload. JS + icons, no extra asset packs. */
export const INSTALL_DOWNLOAD = 'about 1 MB';

/**
 * HUD layout vs type. Short phones need a readability bump; mapping 1:1 to CSS
 * px made camp-sized chrome eat a 390px landscape. Panels stay near design
 * space; type tracks the screen a bit more, both capped.
 */
export const HUD_SCALE_MAX = 1.06;
export const HUD_TYPE_MAX = 1.28;

function hudRaw(viewport) {
  const cssH = Math.max(1, viewport?.cssH || viewport?.h || DESIGN_H);
  return DESIGN_H / cssH;
}

function blendTowardCss(raw, amount, cap) {
  return Math.min(cap, Math.max(0.94, 1 + (raw - 1) * amount));
}

export function hudScale(viewport) {
  return blendTowardCss(hudRaw(viewport), 0.18, HUD_SCALE_MAX);
}

export function hudTypeScale(viewport) {
  return blendTowardCss(hudRaw(viewport), 0.4, HUD_TYPE_MAX);
}

function compoundLinear(levelIndex, trackT, step, ramp) {
  const L = Math.max(0, levelIndex || 0);
  const t = Math.max(0, Math.min(1, trackT || 0));
  return (1 + L * step) * (1 + t * ramp);
}

/**
 * Map total metres onto a campaign road + extract t, so Endless can be
 * twice this distance of campaign rather than a separate HP formula.
 */
export function campaignProgress(meters) {
  const m = Math.max(0, meters || 0);
  if (m > 0 && m % TRACK_METERS === 0) {
    return { levelIndex: m / TRACK_METERS - 1, trackT: 1 };
  }
  return {
    levelIndex: Math.floor(m / TRACK_METERS),
    trackT: TRACK_METERS > 0 ? (m % TRACK_METERS) / TRACK_METERS : 0,
  };
}

/**
 * Campaign: per-road linear × in-road linear for HP and density.
 * Next open is a step up from the last open, and a step down from that extract.
 * Endless: twice that campaign-at-the-same-metres curve.
 */
export function threatForDistance(meters, levelIndex, endless) {
  const m = Math.max(0, meters || 0);
  let L = Math.max(0, levelIndex || 0);
  let trackT = TRACK_METERS > 0 ? Math.max(0, Math.min(1, m / TRACK_METERS)) : 0;
  if (endless) {
    const prog = campaignProgress(m);
    L = prog.levelIndex;
    trackT = prog.trackT;
  }

  const scale = endless ? THREAT.endlessHard : 1;
  const hpMul = scale * THREAT.gruntHp * compoundLinear(L, trackT, THREAT.roadHpStep, THREAT.roadHpRamp);
  const dens = scale * compoundLinear(L, trackT, THREAT.roadDensityStep, THREAT.roadDensityRamp);

  const spawn = Math.max(THREAT.spawnFloor, THREAT.chill.spawn / dens);
  const maxAlive = Math.min(THREAT.maxAliveCap, Math.max(THREAT.chill.max, Math.round(THREAT.chill.max * dens)));
  let speed = THREAT.chill.speed * compoundLinear(L, trackT, THREAT.speedStep, THREAT.speedRamp);

  const depth = L + trackT;
  if (endless) {
    const extra = m > TRACK_METERS ? (m - TRACK_METERS) / 120 : 0;
    const sprintT = Math.max(0, extra - THREAT.sprintEndless) / 10;
    speed = Math.min(speed, THREAT.speedCap);
    if (sprintT > 0) {
      const t = Math.min(1, sprintT);
      speed = THREAT.speedCap + (THREAT.speedSprint - THREAT.speedCap) * t;
    }
  } else {
    speed = Math.min(speed, THREAT.speedCap);
    const sprintT = Math.max(0, depth - THREAT.sprintRoad) / 8;
    if (sprintT > 0) {
      const t = Math.min(1, sprintT);
      speed = THREAT.speedCap + (THREAT.speedSprint - THREAT.speedCap) * t;
    }
  }

  const packChance = Math.max(0, Math.min(THREAT.packCap, THREAT.chill.packChance + (dens - 1) * THREAT.packGrow));
  return {
    spawnInterval: spawn,
    maxAlive,
    speed,
    hpMul,
    packChance,
  };
}

export function enemyHp(hpMul) {
  const m = Math.max(0.2, hpMul);
  return {
    head: Math.max(1, 36 * m),
    torso: Math.max(1, 50 * m),
    lLeg: Math.max(1, 20 * m),
    rLeg: Math.max(1, 20 * m),
  };
}
