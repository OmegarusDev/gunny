import { AIM_REACH_MAX, AIM_REACH_MIN, BLOOM_CAP_DEG, BASE_CRIT_CHANCE, BASE_CRIT_MULT } from '../config.js';
import { RECEIVERS, SLOT_MIN_TIER, SLOTS } from '../data/receivers.js';
import { PARTS } from '../data/attachments.js';
import { SKILLS } from '../data/skills.js';

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
  stats.magSize = Math.max(1, Math.round(stats.magSize));
  stats.rof = Math.max(1.5, stats.rof);
  stats.reload = Math.max(0.7, stats.reload);
  stats.perfectWidth = Math.max(0.04, Math.min(0.28, stats.perfectWidth));
  stats.aimRate = Math.max(2.5, stats.aimRate / Math.max(0.75, stats.weight || 1));
  stats.aimReach = Math.max(AIM_REACH_MIN, Math.min(AIM_REACH_MAX, stats.aimReach || AIM_REACH_MIN));
  stats.baseSpread = Math.max(0.2, Math.min(4.5, stats.baseSpread ?? 2.35));
  stats.bulletSpeed = Math.max(280, stats.bulletSpeed);
  stats.pen = Math.max(0.4, stats.pen);
  stats.damage = Math.max(6, stats.damage);
  return stats;
}

function scaleMods(perRank, rank) {
  const out = {};
  for (const [k, v] of Object.entries(perRank)) out[k] = v * rank;
  return out;
}

export function equippedLabel(profile) {
  const rec = RECEIVERS[profile.loadout.receiver];
  return rec ? rec.name : 'Unknown';
}

/** Degrees of cone before a shot: static accuracy + bloom + heat. */
export function shotSpreadDeg(stats, weapon) {
  return Math.min(stats.bloomCap, stats.baseSpread + weapon.bloom + weapon.heat * stats.heatBloom);
}
