import { RECEIVERS, receiverRequirement } from '../data/receivers.js';
import { PARTS, STARTER_LOADOUT, STARTER_OWNED, partRequirement } from '../data/attachments.js';
import { emptyRanks } from '../data/skills.js';

/** Bumped for economy + ladder rebalance (fresh camp). */
const KEY = 'gunny.profile.v2';

export function defaultProfile() {
  return {
    cash: 0,
    xp: 0,
    unlockedLevel: 0,
    owned: [...STARTER_OWNED],
    loadout: { ...STARTER_LOADOUT },
    skillRanks: emptyRanks(),
  };
}

export function loadProfile() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultProfile();
    const parsed = JSON.parse(raw);
    const base = defaultProfile();
    const loadout = { ...base.loadout, ...(parsed.loadout || {}) };
    const owned = Array.from(new Set([...(parsed.owned || []), ...STARTER_OWNED])).filter(
      (id) => PARTS[id] || RECEIVERS[id],
    );
    for (const slot of Object.keys(base.loadout)) {
      const id = loadout[slot];
      if (slot === 'receiver') {
        if (!RECEIVERS[id] || !owned.includes(id)) loadout[slot] = base.loadout[slot];
      } else if (!PARTS[id] || !owned.includes(id)) {
        loadout[slot] = base.loadout[slot];
      }
    }
    return {
      ...base,
      ...parsed,
      owned,
      loadout,
      skillRanks: { ...base.skillRanks, ...(parsed.skillRanks || {}) },
      cash: Math.max(0, Number(parsed.cash) || 0),
      xp: Math.max(0, Number(parsed.xp) || 0),
    };
  } catch {
    return defaultProfile();
  }
}

export function saveProfile(profile) {
  localStorage.setItem(KEY, JSON.stringify(profile));
}

export function owns(profile, id) {
  return profile.owned.includes(id);
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
  profile.owned.push(id);
  saveProfile(profile);
  return true;
}

export function equipPart(profile, slot, id) {
  if (slot === 'receiver') {
    const rec = RECEIVERS[id];
    if (!rec || !owns(profile, id)) return false;
    profile.loadout.receiver = id;
  } else {
    const part = PARTS[id];
    if (!part || part.slot !== slot || !owns(profile, id)) return false;
    profile.loadout[slot] = id;
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
