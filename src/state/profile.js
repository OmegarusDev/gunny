import { RECEIVERS, SLOT_MIN_TIER, receiverRequirement } from '../data/receivers.js';
import { STARTER_LOADOUT, emptySlotRanks, ranksFromLegacyKit, sanitizeSlotRanks, slotCapFor, upgradeCost } from '../data/upgrades.js';
import { emptyRanks, sanitizeRanks, SKILLS, xpInvested } from '../data/skills.js';

const KEY = 'gunny.profile.v5';
const LEGACY_KEYS = ['gunny.profile.v4', 'gunny.profile.v3', 'gunny.profile.v2'];

function starterKit() {
  return { ranks: emptySlotRanks() };
}

export function ensureKit(profile, recId = profile.loadout?.receiver) {
  if (!profile.kits) profile.kits = {};
  if (!RECEIVERS[recId]) recId = STARTER_LOADOUT.receiver;
  if (!profile.kits[recId]) profile.kits[recId] = starterKit();
  profile.kits[recId].ranks = sanitizeSlotRanks(profile.kits[recId].ranks, slotCapFor(recId));
  return profile.kits[recId];
}

export function applyKit(profile) {
  ensureKit(profile);
}

export function grant(profile, ...ids) {
  for (const id of ids) {
    if (!RECEIVERS[id]) continue;
    if (!profile.owned.includes(id)) profile.owned.push(id);
    ensureKit(profile, id);
  }
}

export function defaultProfile() {
  return {
    cash: 0,
    xp: 0,
    unlockedLevel: 0,
    owned: [STARTER_LOADOUT.receiver],
    loadout: { ...STARTER_LOADOUT },
    kits: { [STARTER_LOADOUT.receiver]: starterKit() },
    skillRanks: emptyRanks(),
    xpSpent: 0,
  };
}

function remapReceiverId(id) {
  if (id === 't4_advanced') return 't5_advanced';
  return id;
}

function fillReceiverLadder(ids) {
  const owned = new Set(ids);
  const list = Object.values(RECEIVERS).sort((a, b) => a.rank - b.rank);
  let max = -1;
  for (const rec of list) {
    if (owned.has(rec.id)) max = Math.max(max, rec.rank);
  }
  return list.filter((r) => r.rank <= max).map((r) => r.id);
}

export function hydrateProfile(parsed = {}, { scaleSkills = false } = {}) {
  const base = defaultProfile();
  const ownedReceivers = fillReceiverLadder(
    Array.from(new Set([...(parsed.owned || []).map(remapReceiverId), STARTER_LOADOUT.receiver])).filter(
      (id) => RECEIVERS[id],
    ),
  );
  const rawRec = remapReceiverId(parsed.loadout?.receiver);
  const recId = RECEIVERS[rawRec] ? rawRec : STARTER_LOADOUT.receiver;
  const savedKits = parsed.kits && typeof parsed.kits === 'object' ? parsed.kits : {};
  const kits = {};
  for (const id of ownedReceivers) {
    const raw = savedKits[id] || (id === 't5_advanced' ? savedKits.t4_advanced : null) || {};
    kits[id] = { ranks: sanitizeSlotRanks(ranksFromLegacyKit(raw), slotCapFor(id)) };
  }
  const rawSkills = parsed.skillRanks;
  const oldSanitized = sanitizeRanks(rawSkills);
  const skillRanks = scaleSkills ? scaleLegacySkillRanks(rawSkills) : oldSanitized;
  const xpSpent = scaleSkills
    ? xpInvested(oldSanitized)
    : Number.isFinite(Number(parsed.xpSpent))
      ? Math.max(0, Math.floor(parsed.xpSpent))
      : xpInvested(skillRanks);
  const next = {
    ...base,
    cash: Math.max(0, Number(parsed.cash) || 0),
    xp: Math.max(0, Number(parsed.xp) || 0),
    unlockedLevel: Math.max(0, Number(parsed.unlockedLevel) || 0),
    owned: ownedReceivers,
    loadout: { receiver: recId },
    kits,
    skillRanks,
    xpSpent,
  };
  applyKit(next);
  return next;
}

function scaleLegacySkillRanks(ranks) {
  const next = emptyRanks();
  for (const id of Object.keys(next)) {
    const n = Math.floor(Number(ranks?.[id]) || 0);
    next[id] = Math.max(0, Math.min(SKILLS[id].maxRank, n * 5));
  }
  return next;
}

export function loadProfile() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return hydrateProfile(JSON.parse(raw));
    for (const key of LEGACY_KEYS) {
      const saved = localStorage.getItem(key);
      if (!saved) continue;
      return hydrateProfile(JSON.parse(saved), { scaleSkills: true });
    }
    return defaultProfile();
  } catch {
    return defaultProfile();
  }
}

export function saveProfile(profile) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(profile));
}

export function resetProfile(profile) {
  const fresh = defaultProfile();
  for (const key of Object.keys(profile)) delete profile[key];
  Object.assign(profile, fresh);
  saveProfile(profile);
  return profile;
}

export function owns(profile, id) {
  return !!RECEIVERS[id] && profile.owned.includes(id);
}

export function slotRank(profile, slot, recId = profile.loadout?.receiver) {
  return ensureKit(profile, recId).ranks[slot] || 0;
}

export function buyBlockedReason(profile, id) {
  if (owns(profile, id)) return 'Owned';
  const req = receiverRequirement(id);
  if (req && !owns(profile, req)) return 'Need previous';
  return null;
}

export function buyPart(profile, id, cost) {
  if (!RECEIVERS[id] || owns(profile, id)) return false;
  if (profile.cash < cost) return false;
  const req = receiverRequirement(id);
  if (req && !owns(profile, req)) return false;
  profile.cash -= cost;
  grant(profile, id);
  return equipPart(profile, 'receiver', id);
}

export function upgradeSlot(profile, slot, recId = profile.loadout?.receiver) {
  if (!RECEIVERS[recId] || !owns(profile, recId)) return false;
  if (slot === 'receiver') return false;
  if ((RECEIVERS[recId].tier || 1) < (SLOT_MIN_TIER[slot] || 1)) return false;
  const kit = ensureKit(profile, recId);
  const rank = kit.ranks[slot] || 0;
  if (rank >= slotCapFor(recId)) return false;
  const cost = upgradeCost(slot, rank);
  if (profile.cash < cost) return false;
  profile.cash -= cost;
  kit.ranks[slot] = rank + 1;
  saveProfile(profile);
  return true;
}

export function equipPart(profile, slot, id) {
  if (slot !== 'receiver') return false;
  const rec = RECEIVERS[id];
  if (!rec || !owns(profile, id)) return false;
  if (profile.loadout.receiver !== id) {
    profile.loadout.receiver = id;
    applyKit(profile);
  }
  saveProfile(profile);
  return true;
}

export function addRewards(profile, cash, xp) {
  profile.cash += Math.max(0, Math.floor(cash));
  profile.xp += Math.max(0, Math.floor(xp));
  saveProfile(profile);
}

export function unlockLevel(profile, index) {
  if (index > profile.unlockedLevel) {
    profile.unlockedLevel = index;
    saveProfile(profile);
  }
}
