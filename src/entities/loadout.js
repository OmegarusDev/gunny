import { AIM_REACH_MAX, AIM_REACH_MIN, SHOT_REACH_MAX, SHOT_REACH_MIN, BLOOM_CAP_DEG, BASE_CRIT_CHANCE, BASE_CRIT_MULT, PERFECT_MAG_ROF } from '../config.js';
import { RECEIVERS, SLOT_MIN_TIER, SLOTS } from '../data/receivers.js';
import { PARTS } from '../data/attachments.js';
import { SKILLS } from '../data/skills.js';

export function effectiveRps(stats) {
  const rof = Math.max(0.01, stats?.rof || 0);
  const mag = Math.max(1, Math.round(stats?.magSize || 1));
  const reload = Math.max(0, stats?.reload || 0);
  const cycle = (mag - 1) / rof + reload;
  return mag / Math.max(1e-6, cycle);
}

export function formatRpm(stats) {
  return String(Math.round(effectiveRps(stats) * 60));
}

export function magRof(stats, weapon) {
  const rof = Math.max(0.01, stats?.rof || 0);
  return weapon?.perfectMag ? rof * PERFECT_MAG_ROF : rof;
}

/**
 * Gun stats. `stack: 'add'` sums onto the receiver base (Mul keys still start at 1 and add).
 * `stack: 'mul'` multiplies the running value. Unknown part keys are ignored.
 */
export const STATS = [
  { id: 'damage', stack: 'add', min: 6, gunsmith: true, gunsmithLabel: 'DMG', format: (v) => v.toFixed(1), hint: 'Damage per shot, before crits and range falloff.' },
  { id: 'rof', stack: 'add', min: 0.4, gunsmith: true, gunsmithLabel: 'ROF', format: (v) => String(Math.round((v || 0) * 60)), hint: 'Cyclic rate in rounds per minute. Reload is separate. A perfect reload adds 10% for that mag.' },
  { id: 'magSize', stack: 'add', min: 1, round: true, gunsmith: true, gunsmithLabel: 'MAG', format: (v) => String(v), hint: 'Rounds in the magazine.' },
  { id: 'bulletSpeed', stack: 'add', min: 280, gunsmith: true, gunsmithLabel: 'VEL', format: (v) => v.toFixed(0), hint: 'Muzzle velocity. Faster rounds hit harder at range and fly farther before drop-off.' },
  { id: 'pen', stack: 'add', min: 0.4, gunsmith: true, gunsmithLabel: 'PEN', format: (v) => v.toFixed(2), hint: 'Needs over 1.00 to punch through. Headshots and crits each add 0.12. Shoddy only gets there with magnum ammo, a headshot, and a crit together.' },
  { id: 'reload', stack: 'add', min: 0.7, gunsmith: true, gunsmithLabel: 'RLD', format: (v) => `${v.toFixed(2)}s`, hint: 'Seconds to reload an empty mag. The gold band sits just before two-thirds of the bar.' },
  { id: 'shotRange', stack: 'add', min: SHOT_REACH_MIN, max: SHOT_REACH_MAX, gunsmith: true, gunsmithLabel: 'Range', format: (v) => String(Math.round(v)), hint: 'Distance before damage and accuracy start to fall off. Rounds still fly.' },
  { id: 'aimReach', stack: 'add', min: AIM_REACH_MIN, max: AIM_REACH_MAX, gunsmith: true, gunsmithLabel: 'Sight', format: (v) => String(Math.round(v)), hint: 'How far you can hold the reticle. Optics only.' },
  { id: 'baseSpread', stack: 'add', min: 0.2, max: 4.5, gunsmith: true, gunsmithLabel: 'SPRD', format: (v) => `${v.toFixed(2)}°`, hint: 'Starting cone of fire, in degrees. Bloom stacks on top.' },
  { id: 'perfectWidth', stack: 'add', min: 0.04, max: 0.28 },
  { id: 'penDecay', stack: 'add', min: 0 },
  { id: 'bloomPerShot', stack: 'add', min: 0.25 },
  { id: 'bloomRecover', stack: 'add', min: 0 },
  { id: 'aimRate', stack: 'add', min: 2.5 },
  { id: 'weight', stack: 'add', min: 0.5 },
  { id: 'heatBuild', stack: 'add', min: 0 },
  { id: 'heatDump', stack: 'add', min: 0 },
  { id: 'heatBloom', stack: 'add', min: 0 },
  { id: 'critChance', stack: 'add', min: 0, max: 0.9 },
  { id: 'critMult', stack: 'add', min: 1 },
  { id: 'cashMul', stack: 'add', min: 0.2 },
  { id: 'bloomPerShotMul', stack: 'add', min: 0.2 },
  { id: 'fullScreenAim', stack: 'add', min: 0 },
  { id: 'laserSight', stack: 'add', min: 0 },
  { id: 'moveMul', stack: 'add', min: 1 },
];

export const STAT_BY_ID = Object.fromEntries(STATS.map((s) => [s.id, s]));

export function gunsmithStatRows(stats) {
  return STATS.filter((s) => s.gunsmith).map((s) => {
    if (s.id === 'aimReach' && stats.fullScreenAim) return [s.gunsmithLabel, 'Full', s.hint];
    return [s.gunsmithLabel, s.format(stats[s.id]), s.hint];
  });
}

function clampStat(stats, def) {
  let v = stats[def.id];
  if (v == null || Number.isNaN(v)) v = def.min ?? 0;
  if (def.round) v = Math.round(v);
  if (def.min != null) v = Math.max(def.min, v);
  if (def.max != null) v = Math.min(def.max, v);
  stats[def.id] = v;
}

function applyMods(stats, mods) {
  if (!mods) return;
  for (const [k, v] of Object.entries(mods)) {
    const def = STAT_BY_ID[k];
    if (!def) continue;
    if (def.stack === 'mul') {
      stats[k] = (stats[k] ?? 1) * v;
      continue;
    }
    stats[k] = (stats[k] ?? 0) + v;
  }
}

export function slotUnlockedFor(receiverId, slot) {
  const rec = RECEIVERS[receiverId];
  if (!rec) return false;
  return rec.tier >= (SLOT_MIN_TIER[slot] || 1);
}

export function resolveStats(profile) {
  const rec = RECEIVERS[profile.loadout.receiver] || RECEIVERS.t1_stock;
  const stats = { ...rec.base };
  stats.critChance = BASE_CRIT_CHANCE;
  stats.critMult = BASE_CRIT_MULT;
  stats.cashMul = 1;
  stats.bloomPerShotMul = 1;
  stats.moveMul = 1;
  stats.laserSight = 0;
  stats.receiverTier = rec.tier;
  stats.receiverName = rec.name;

  for (const slot of SLOTS) {
    if (slot === 'receiver') continue;
    if (!slotUnlockedFor(rec.id, slot)) continue;
    const id = profile.loadout[slot];
    const part = PARTS[id];
    if (part) applyMods(stats, part.mods);
  }

  for (const def of Object.values(SKILLS)) {
    const rank = profile.skillRanks[def.id] || 0;
    if (!rank) continue;
    applyMods(stats, scaleMods(def.perRank, rank));
  }

  stats.bloomPerShot = Math.max(0.25, stats.bloomPerShot * (stats.bloomPerShotMul || 1));
  stats.bloomCap = BLOOM_CAP_DEG;
  stats.aimRate = Math.max(2.5, stats.aimRate / Math.max(0.75, stats.weight || 1));
  for (const def of STATS) clampStat(stats, def);
  return stats;
}

function scaleMods(perRank, rank) {
  const out = {};
  for (const [k, v] of Object.entries(perRank)) out[k] = v * rank;
  return out;
}

export function equippedLabel(profile) {
  const rec = RECEIVERS[profile.loadout.receiver];
  return rec ? rec.short || rec.name : 'Unknown';
}

/** Degrees of cone before a shot: static accuracy + bloom + heat. */
export function shotSpreadDeg(stats, weapon) {
  return Math.min(stats.bloomCap, stats.baseSpread + weapon.bloom + weapon.heat * stats.heatBloom);
}
