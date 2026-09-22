import { RECEIVERS, SLOT_MIN_TIER } from './receivers.js';
import { STARTER_LOADOUT } from './upgrades.js';

/** Keep in lockstep with `figure.S`. Paper units for the held gun. */
const S = 1.42;

export const MAG_STICK_MAX = 7;
export const MAG_BOX_MAX = 19;
export const MAG_DRUM_MAX = 39;

export function magStyleFor(rank) {
  const n = Math.max(0, Math.floor(Number(rank) || 0));
  if (n <= MAG_STICK_MAX) return 'stick';
  if (n <= MAG_BOX_MAX) return 'box';
  if (n <= MAG_DRUM_MAX) return 'drum';
  return 'belt';
}

function recOf(id) {
  return RECEIVERS[id] || RECEIVERS[STARTER_LOADOUT.receiver];
}

export function stubGunLook(recId = STARTER_LOADOUT.receiver) {
  const rec = recOf(recId);
  const tier = rec.tier || 1;
  return finishLook({ recId: rec.id, tier, mag: 0, barrel: 0, stock: 0, magSize: 1 });
}

function finishLook(raw) {
  const tier = raw.tier || 1;
  const mag = Math.max(0, raw.mag || 0);
  const barrel = Math.max(0, raw.barrel || 0);
  const stockRank = tier >= (SLOT_MIN_TIER.stock || 4) ? Math.max(0, raw.stock || 0) : 0;
  const recLen = (11 + tier * 1.6) * S;
  const barrelLen = (32 + (tier - 1) * 2.4 + barrel * 0.14) * S;
  const stockLen = stockRank > 0 ? (5 + stockRank * 0.3) * S : 0;
  return {
    recId: raw.recId,
    tier,
    mag,
    barrel,
    stock: stockRank,
    magSize: Math.max(1, raw.magSize || mag + 1),
    magStyle: magStyleFor(mag),
    recLen,
    barrelLen,
    stockLen,
    muzzleLen: recLen + barrelLen,
    forend: recLen + barrelLen * 0.42,
  };
}

export function gunLookFrom(profile) {
  const recId = profile?.loadout?.receiver || STARTER_LOADOUT.receiver;
  const rec = recOf(recId);
  const kit = profile?.kits?.[rec.id];
  const ranks = kit?.ranks || {};
  const mag = Math.max(0, Math.floor(Number(ranks.magazine) || 0));
  return finishLook({
    recId: rec.id,
    tier: rec.tier || 1,
    mag,
    barrel: Math.max(0, Math.floor(Number(ranks.barrel) || 0)),
    stock: Math.max(0, Math.floor(Number(ranks.stock) || 0)),
    magSize: mag + 1,
  });
}
