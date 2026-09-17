import { TRACK_METERS, V_RETREAT } from '../config.js';

/** Walker roles. Kinds stay biome skins; these change hp, speed, and size. */
export const ROLES = {
  grunt: {
    id: 'grunt',
    name: 'Walker',
    hp: 1,
    speed: 1,
    scale: 1,
    weight: 1,
    gap: 130,
    cash: 1,
    xp: 1,
  },
  tank: {
    id: 'tank',
    name: 'Tank',
    hp: 3,
    speed: 0.94,
    scale: 1.28,
    weight: 2,
    gap: 180,
    cash: 2,
    xp: 2,
  },
  heavy: {
    id: 'heavy',
    name: 'Heavy Tank',
    hp: 6,
    speed: 0.88,
    scale: 1.55,
    weight: 3,
    gap: 220,
    cash: 4,
    xp: 4,
  },
  behemoth: {
    id: 'behemoth',
    name: 'Behemoth',
    hp: 10,
    speed: 0.8,
    scale: 2.05,
    weight: 4,
    gap: 280,
    cash: 8,
    xp: 8,
  },
};

/** Always close on the gunner, even at Forest open. */
export const CHASE_FLOOR = V_RETREAT * 1.08;

export function chaseSpeed(threatSpeed, roleId) {
  return Math.max(CHASE_FLOOR, (threatSpeed || 0) * roleOf(roleId).speed) * 1.1;
}

/** Heavies land a road before each receiver checkpoint. Militia ~30m, then +1h / +2h / +4h
 * — these roads follow that stretch, not even spacing. Advanced has no new role.
 * Pay doubles each rank vs a grunt on the same road. */
export const ROLE_UNLOCK = {
  tank: { road: 2, endlessM: 200 },
  heavy: { road: 6, endlessM: 400 },
  behemoth: { road: 14, endlessM: 800 },
};

export function roleOf(id) {
  return ROLES[id] || ROLES.grunt;
}

export function roleUnlocked(roleId, { endless = false, levelIndex = 0, meters = 0 } = {}) {
  const gate = ROLE_UNLOCK[roleId];
  if (!gate) return roleId === 'grunt';
  if (endless) return meters >= gate.endlessM;
  return levelIndex >= gate.road;
}

export function occupancyOf(living) {
  return living.reduce((n, e) => n + roleOf(e.role).weight, 0);
}

export function pickRole(run, meters, living) {
  const ctx = { endless: !!run.endless, levelIndex: run.levelIndex || 0, meters };
  const heat = Math.max(0, Math.min(1, meters / TRACK_METERS));
  const rng = typeof run.rng === 'function' ? run.rng : Math.random;
  const hasBehemoth = living.some((e) => e.role === 'behemoth');

  if (roleUnlocked('behemoth', ctx)) {
    const gateM = run.endless ? ROLE_UNLOCK.behemoth.endlessM : 35;
    if (!run.spawnedBehemoth && meters >= gateM) {
      run.spawnedBehemoth = true;
      return 'behemoth';
    }
    if (!hasBehemoth && rng() < 0.08) return 'behemoth';
  }
  if (roleUnlocked('heavy', ctx) && rng() < 0.07 + heat * 0.1) return 'heavy';
  if (roleUnlocked('tank', ctx) && rng() < 0.14 + heat * 0.18) return 'tank';
  return 'grunt';
}
