import { RECEIVERS, SLOTS, receiverRequirement } from '../data/receivers.js';
import {
  PARTS,
  STARTER_LOADOUT,
  STARTER_PARTS,
  STARTER_RECEIVERS,
  partRequirement,
} from '../data/attachments.js';
import { emptyRanks, sanitizeRanks } from '../data/skills.js';

const KEY = 'gunny.profile.v3';

function starterKit() {
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

function slotLoadoutFrom(src = {}) {
  const loadout = { ...starterKit().loadout };
  for (const slot of SLOTS) {
    if (slot === 'receiver') continue;
    const id = src[slot];
    if (PARTS[id] && PARTS[id].slot === slot) loadout[slot] = id;
  }
  return loadout;
}

function sanitizeKit(raw) {
  const kit = starterKit();
  const owned = Array.from(new Set([...(raw?.owned || []), ...STARTER_PARTS])).filter((id) => PARTS[id]);
  kit.owned = owned;
  kit.loadout = slotLoadoutFrom(raw?.loadout);
  for (const slot of Object.keys(kit.loadout)) {
    const id = kit.loadout[slot];
    if (!owned.includes(id)) kit.loadout[slot] = STARTER_LOADOUT[slot];
  }
  return kit;
}

function persistReceiverKit(profile) {
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
    if (RECEIVERS[id]) {
      if (!profile.owned.includes(id)) profile.owned.push(id);
      ensureKit(profile, id);
    } else if (PARTS[id]) {
      const owned = ensureKit(profile).owned;
      if (!owned.includes(id)) owned.push(id);
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

export function hydrateProfile(parsed = {}) {
  const base = defaultProfile();
  const ownedReceivers = fillReceiverLadder(
    Array.from(new Set([...(parsed.owned || []).map(remapReceiverId), ...STARTER_RECEIVERS])).filter(
      (id) => RECEIVERS[id],
    ),
  );
  const rawRec = remapReceiverId(parsed.loadout?.receiver);
  const recId = RECEIVERS[rawRec] ? rawRec : STARTER_LOADOUT.receiver;
  const savedKits = parsed.kits && typeof parsed.kits === 'object' ? parsed.kits : {};
  const kits = {};
  for (const id of ownedReceivers) {
    const raw = savedKits[id] || (id === 't5_advanced' ? savedKits.t4_advanced : null);
    kits[id] = sanitizeKit(raw);
  }
  const next = {
    ...base,
    cash: Math.max(0, Number(parsed.cash) || 0),
    xp: Math.max(0, Number(parsed.xp) || 0),
    unlockedLevel: Math.max(0, Number(parsed.unlockedLevel) || 0),
    owned: ownedReceivers,
    loadout: { ...STARTER_LOADOUT, receiver: recId },
    kits,
    skillRanks: sanitizeRanks(parsed.skillRanks),
  };
  applyKit(next);
  return next;
}

export function loadProfile() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultProfile();
    return hydrateProfile(JSON.parse(raw));
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
  if (RECEIVERS[id]) return profile.owned.includes(id);
  if (PARTS[id]) return ensureKit(profile).owned.includes(id);
  return false;
}

function itemRequirement(id) {
  return partRequirement(id) || receiverRequirement(id);
}

/** Next ladder step only — cannot skip parts. */
function canBuy(profile, id, cost) {
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
      persistReceiverKit(profile);
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
