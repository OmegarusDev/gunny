import { RECEIVERS } from '../data/receivers.js';
import { PARTS, STARTER_LOADOUT, STARTER_OWNED } from '../data/attachments.js';
import { emptyRanks } from '../data/skills.js';

const KEY = 'gunny.profile.v1';

export function defaultProfile() {
  return {
    cash: 90,
    xp: 40,
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
    let owned = Array.from(new Set([...(parsed.owned || []), ...STARTER_OWNED]));
    let migrated = false;
    const upgradedMag = ['mag_10', 'mag_20', 'mag_drum'].includes(loadout.magazine);
    if (loadout.magazine === 'mag_6' && !upgradedMag) {
      loadout.magazine = 'mag_1';
      owned = owned.filter((id) => id !== 'mag_6');
      migrated = true;
    }
    const profile = {
      ...base,
      ...parsed,
      owned,
      loadout,
      skillRanks: { ...base.skillRanks, ...(parsed.skillRanks || {}) },
    };
    if (migrated) saveProfile(profile);
    return profile;
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

export function buyPart(profile, id, cost) {
  if (owns(profile, id)) return false;
  if (profile.cash < cost) return false;
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
