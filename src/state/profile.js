import { RECEIVERS, SLOTS, receiverRequirement } from '../data/receivers.js';
import {
  LEGACY_PART_IDS,
  PARTS,
  STARTER_LOADOUT,
  STARTER_PARTS,
  STARTER_RECEIVERS,
  partRequirement,
} from '../data/attachments.js';
import { emptyRanks, refundRetiredRanks } from '../data/skills.js';

/** Bumped for economy + ladder rebalance (fresh camp). Kits hydrate from v2 saves. */
const KEY = 'gunny.profile.v2';

export function starterKit() {
  const loadout = { ...STARTER_LOADOUT };
  delete loadout.receiver;
  return { owned: [...STARTER_PARTS], loadout };
}

export function ensureKit(profile, recId = profile.loadout?.receiver) {
  if (!profile.kits) profile.kits = {};
  if (!RECEIVERS[recId]) recId = STARTER_LOADOUT.receiver;
  if (!profile.kits[recId]) profile.kits[recId] = starterKit();
  return profile.kits[recId];
}

function remapPartId(id) {
  return LEGACY_PART_IDS[id] || id;
}

function slotLoadoutFrom(src = {}) {
  const loadout = { ...starterKit().loadout };
  if (src.trigger && !src.bolt) loadout.bolt = remapPartId(src.trigger);
  for (const slot of SLOTS) {
    if (slot === 'receiver') continue;
    const id = remapPartId(src[slot]);
    if (PARTS[id] && PARTS[id].slot === slot) loadout[slot] = id;
  }
  return loadout;
}

function sanitizeKit(raw) {
  const kit = starterKit();
  const owned = Array.from(
    new Set([...(raw?.owned || []).map(remapPartId), ...STARTER_PARTS]),
  ).filter((id) => PARTS[id]);
  kit.owned = owned;
  kit.loadout = slotLoadoutFrom(raw?.loadout);
  for (const slot of Object.keys(kit.loadout)) {
    const id = kit.loadout[slot];
    if (!owned.includes(id)) kit.loadout[slot] = STARTER_LOADOUT[slot];
  }
  return kit;
}

export function stashKit(profile) {
  const recId = profile.loadout.receiver;
  if (!RECEIVERS[recId]) return;
  const kit = ensureKit(profile, recId);
  kit.loadout = slotLoadoutFrom(profile.loadout);
}

export function applyKit(profile) {
  const kit = ensureKit(profile);
  for (const slot of SLOTS) {
    if (slot === 'receiver') continue;
    const id = kit.loadout[slot];
    profile.loadout[slot] = PARTS[id] ? id : STARTER_LOADOUT[slot];
  }
}

export function grant(profile, ...ids) {
  for (const id of ids) {
    const mapped = remapPartId(id);
    if (RECEIVERS[mapped]) {
      if (!profile.owned.includes(mapped)) profile.owned.push(mapped);
      ensureKit(profile, mapped);
    } else if (PARTS[mapped]) {
      const owned = ensureKit(profile).owned;
      if (!owned.includes(mapped)) owned.push(mapped);
    }
  }
}

export function defaultProfile() {
  return {
    cash: 0,
    xp: 0,
    unlockedLevel: 0,
    owned: [...STARTER_RECEIVERS],
    loadout: { ...STARTER_LOADOUT },
    kits: { [STARTER_LOADOUT.receiver]: starterKit() },
    skillRanks: emptyRanks(),
  };
}

export function hydrateProfile(parsed = {}) {
  const base = defaultProfile();
  const ownedReceivers = Array.from(
    new Set([...(parsed.owned || []).map(remapPartId), ...STARTER_RECEIVERS]),
  ).filter((id) => RECEIVERS[id]);
  const recId = RECEIVERS[parsed.loadout?.receiver] ? parsed.loadout.receiver : STARTER_LOADOUT.receiver;
  const kits = {};
  const savedKits = parsed.kits && typeof parsed.kits === 'object' ? parsed.kits : null;
  const hasKits = savedKits && Object.keys(savedKits).some((id) => RECEIVERS[id]);
  if (hasKits) {
    for (const id of ownedReceivers) kits[id] = sanitizeKit(savedKits[id]);
  } else {
    const leftover = (parsed.owned || []).map(remapPartId).filter((id) => PARTS[id]);
    kits[recId] = sanitizeKit({
      owned: leftover,
      loadout: parsed.loadout,
    });
    for (const id of ownedReceivers) {
      if (!kits[id]) kits[id] = starterKit();
    }
  }
  const skillRanks = { ...base.skillRanks, ...(parsed.skillRanks || {}) };
  const refund = refundRetiredRanks(skillRanks);
  const next = {
    ...base,
    cash: Math.max(0, Number(parsed.cash) || 0),
    xp: Math.max(0, Number(parsed.xp) || 0) + refund,
    unlockedLevel: Math.max(0, Number(parsed.unlockedLevel) || 0),
    owned: ownedReceivers,
    loadout: { ...STARTER_LOADOUT, receiver: recId },
    kits,
    skillRanks,
  };
  applyKit(next);
  return { profile: next, refund };
}

export function loadProfile() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultProfile();
    const { profile, refund } = hydrateProfile(JSON.parse(raw));
    if (refund > 0) saveProfile(profile);
    return profile;
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
  const mapped = remapPartId(id);
  if (RECEIVERS[mapped]) return profile.owned.includes(mapped);
  if (PARTS[mapped]) return ensureKit(profile).owned.includes(mapped);
  return false;
}

export function itemRequirement(id) {
  return partRequirement(id) || receiverRequirement(id);
}

/** Next ladder step only — cannot skip parts. */
export function canBuy(profile, id, cost) {
  if (owns(profile, id)) return false;
  if (profile.cash < cost) return false;
  const req = itemRequirement(id);
  if (req && !owns(profile, req)) return false;
  return true;
}

export function buyBlockedReason(profile, id) {
  if (owns(profile, id)) return 'Owned';
  const req = itemRequirement(id);
  if (req && !owns(profile, req)) {
    const name = PARTS[req]?.name || RECEIVERS[req]?.name || req;
    return `Need ${name}`;
  }
  return null;
}

export function buyPart(profile, id, cost) {
  if (!canBuy(profile, id, cost)) return false;
  profile.cash -= cost;
  grant(profile, id);
  const part = PARTS[id];
  const slot = part?.slot || (RECEIVERS[id] ? 'receiver' : null);
  if (slot) equipPart(profile, slot, id);
  else saveProfile(profile);
  return true;
}

export function equipPart(profile, slot, id) {
  if (slot === 'receiver') {
    const rec = RECEIVERS[id];
    if (!rec || !owns(profile, id)) return false;
    if (profile.loadout.receiver !== id) {
      stashKit(profile);
      profile.loadout.receiver = id;
      applyKit(profile);
    }
  } else {
    const part = PARTS[id];
    if (!part || part.slot !== slot || !owns(profile, id)) return false;
    profile.loadout[slot] = id;
    ensureKit(profile).loadout[slot] = id;
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
