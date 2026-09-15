import { AIM_REACH_MAX, AIM_REACH_MIN, SHOT_REACH_MAX, SHOT_REACH_MIN, BLOOM_CAP_DEG, BASE_CRIT_CHANCE, BASE_CRIT_MULT } from '../config.js';
import { RECEIVERS, SLOT_MIN_TIER, SLOTS } from '../data/receivers.js';
import { PARTS } from '../data/attachments.js';
import { SKILLS } from '../data/skills.js';

/** Clamp + gunsmith display. Unknown part keys still stack via applyMods. */
export const STATS = [
  { id: 'damage', min: 6, gunsmith: true, gunsmithLabel: 'DMG', format: (v) => v.toFixed(1) },
  { id: 'rof', min: 1.5, gunsmith: true, gunsmithLabel: 'ROF', format: (v) => v.toFixed(1) },
  { id: 'magSize', min: 1, round: true, gunsmith: true, gunsmithLabel: 'MAG', format: (v) => String(v) },
  { id: 'bulletSpeed', min: 280, gunsmith: true, gunsmithLabel: 'VEL', format: (v) => v.toFixed(0) },
  { id: 'pen', min: 0.4, gunsmith: true, gunsmithLabel: 'PEN', format: (v) => v.toFixed(2) },
  { id: 'reload', min: 0.7, gunsmith: true, gunsmithLabel: 'Reload', format: (v) => `${v.toFixed(2)}s` },
  { id: 'shotRange', min: SHOT_REACH_MIN, max: SHOT_REACH_MAX, gunsmith: true, gunsmithLabel: 'Range', format: (v) => String(Math.round(v)) },
  { id: 'aimReach', min: AIM_REACH_MIN, max: AIM_REACH_MAX, gunsmith: true, gunsmithLabel: 'Sight', format: (v) => String(Math.round(v)) },
  { id: 'baseSpread', min: 0.2, max: 4.5, gunsmith: true, gunsmithLabel: 'Spread', format: (v) => `${v.toFixed(2)}°` },
  { id: 'perfectWidth', min: 0.04, max: 0.28 },
];

export function gunsmithStatRows(stats) {
  return STATS.filter((s) => s.gunsmith).map((s) => [s.gunsmithLabel, s.format(stats[s.id])]);
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
    if (k.endsWith('Mul')) {
      stats[k] = (stats[k] ?? 1) + v;
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
