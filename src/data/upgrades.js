import { SLOTS } from './receivers.js';

/** Silent cap. The button reads Upgrade or MAX — never n/100. */
export const SLOT_MAX = 100;
/** ~6% more cash per level. Early buys stay a session; 100 is a long sink. */
export const SLOT_COST_RATE = 1.06;

export const SLOT_UPGRADES = {
  magazine: {
    id: 'magazine',
    name: 'Magazine',
    short: 'Mag',
    desc: 'One more round per upgrade. Big mags take longer to seat.',
    baseCost: 100,
    perRank: { magSize: 1 },
  },
  bolt: {
    id: 'bolt',
    name: 'Bolt',
    short: 'Bolt',
    desc: 'Faster cycle. A bit more bloom and heat.',
    baseCost: 80,
    perRank: { rof: 0.006, bloomPerShot: 0.006, heatBuild: 0.002 },
  },
  ammo: {
    id: 'ammo',
    name: 'Ammo',
    short: 'Ammo',
    desc: 'Heavier charge. More damage and a little pen.',
    baseCost: 100,
    perRank: { damage: 0.09, bloomPerShot: 0.002, pen: 0.0045 },
  },
  barrel: {
    id: 'barrel',
    name: 'Barrel',
    short: 'Barrel',
    desc: 'Reach, punch, and a cleaner cone. Does not extend the sight picture.',
    baseCost: 120,
    perRank: { damage: 0.04, bulletSpeed: 4, bloomPerShot: -0.006, pen: 0.006, baseSpread: -0.01, shotRange: 2.2 },
  },
  springs: {
    id: 'springs',
    name: 'Spring',
    short: 'Spring',
    desc: 'Faster mag work.',
    baseCost: 100,
    perRank: { reload: -0.008 },
  },
  grip: {
    id: 'grip',
    name: 'Grip',
    short: 'Grip',
    desc: 'Tighter first-shot cone.',
    baseCost: 150,
    perRank: { baseSpread: -0.006 },
  },
  optic: {
    id: 'optic',
    name: 'Optic',
    short: 'Optic',
    desc: 'Hold farther. High ranks fill the screen.',
    baseCost: 180,
    perRank: { bloomPerShot: -0.01, aimReach: 6, baseSpread: -0.008, critChance: 0.0008 },
    thresholds: [{ at: 50, mods: { fullScreenAim: 1 } }],
  },
  stock: {
    id: 'stock',
    name: 'Stock',
    short: 'Stock',
    desc: 'Bloom recovery and slope settle.',
    baseCost: 200,
    perRank: { bloomRecover: 0.04, aimRate: 0.022, bloomPerShot: -0.004, baseSpread: -0.006 },
  },
  trigger: {
    id: 'trigger',
    name: 'Trigger',
    short: 'Trigger',
    desc: 'A lighter break. A bit more cyclic rate.',
    baseCost: 200,
    perRank: { rof: 0.003 },
  },
  muzzle: {
    id: 'muzzle',
    name: 'Muzzle',
    short: 'Muzzle',
    desc: 'Dumps recoil and tightens the cone. Compensator, not a suppressor.',
    baseCost: 250,
    perRank: { bloomPerShot: -0.006, baseSpread: -0.005 },
  },
  gasBlock: {
    id: 'gasBlock',
    name: 'Gas',
    short: 'Gas',
    desc: 'Dumps heat and adds a little cycle.',
    baseCost: 250,
    perRank: { heatDump: 0.003, heatBuild: -0.001, bloomRecover: 0.008, rof: 0.002 },
  },
  laser: {
    id: 'laser',
    name: 'Laser',
    short: 'Laser',
    desc: 'A visible beam while you hold. Tighter cone.',
    baseCost: 220,
    perRank: { baseSpread: -0.007 },
    thresholds: [{ at: 1, mods: { laserSight: 1 } }],
  },
};

export function emptySlotRanks() {
  const ranks = {};
  for (const slot of SLOTS) {
    if (slot === 'receiver') continue;
    ranks[slot] = 0;
  }
  return ranks;
}

export function sanitizeSlotRanks(raw = {}) {
  const next = emptySlotRanks();
  for (const slot of Object.keys(next)) {
    const n = Math.floor(Number(raw[slot]) || 0);
    next[slot] = Math.max(0, Math.min(SLOT_MAX, n));
  }
  return next;
}

/** Cost to buy the next rank. `level` is the rank you have now. Never repeats a price. */
export function upgradeCost(slot, level) {
  const def = SLOT_UPGRADES[slot];
  if (!def || level >= SLOT_MAX) return 0;
  const n = Math.max(0, Math.floor(Number(level) || 0));
  let cost = 0;
  for (let i = 0; i <= n; i++) {
    let next = Math.round((def.baseCost * SLOT_COST_RATE ** i) / 10) * 10;
    if (next <= cost) next = cost + 10;
    cost = next;
  }
  return cost;
}

export function slotMods(slot, level) {
  const def = SLOT_UPGRADES[slot];
  const rank = Math.max(0, Math.min(SLOT_MAX, Math.floor(Number(level) || 0)));
  if (!def || rank <= 0) return {};
  const out = {};
  for (const [k, v] of Object.entries(def.perRank || {})) out[k] = v * rank;
  for (const step of def.thresholds || []) {
    if (rank >= step.at) {
      for (const [k, v] of Object.entries(step.mods || {})) out[k] = (out[k] || 0) + v;
    }
  }
  return out;
}

/** Old named rungs → a rank on the 0–100 track. Mag uses the size in the id. */
const LEGACY_LEVEL = {
  bolt_polished: ['bolt', 20],
  bolt_light: ['bolt', 40],
  bolt_fluted: ['bolt', 60],
  ammo_hot: ['ammo', 20],
  ammo_plusp: ['ammo', 40],
  ammo_magnum: ['ammo', 60],
  barrel_carbine: ['barrel', 20],
  barrel_rifle: ['barrel', 40],
  barrel_long: ['barrel', 60],
  spring_tuned: ['springs', 20],
  spring_light: ['springs', 40],
  spring_race: ['springs', 60],
  grip_groove: ['grip', 20],
  grip_tactical: ['grip', 40],
  grip_ergo: ['grip', 60],
  optic_dot: ['optic', 20],
  optic_acog: ['optic', 40],
  optic_lpvo: ['optic', 50],
  stock_wire: ['stock', 20],
  stock_combat: ['stock', 40],
  stock_precision: ['stock', 60],
  trigger_match: ['trigger', 20],
  trigger_two: ['trigger', 40],
  trigger_hair: ['trigger', 60],
  muzzle_comp: ['muzzle', 20],
  muzzle_brake: ['muzzle', 40],
  muzzle_ported: ['muzzle', 60],
  muzzle_hybrid: ['muzzle', 80],
  gas_adjust: ['gasBlock', 20],
  gas_over: ['gasBlock', 40],
  gas_piston: ['gasBlock', 60],
  laser_peq: ['laser', 20],
  laser_vis: ['laser', 40],
  laser_ir: ['laser', 60],
};

export function ranksFromLegacyKit(raw = {}) {
  const ranks = emptySlotRanks();
  const bump = (id) => {
    const mag = /^mag_(\d+)$/.exec(id || '');
    if (mag) {
      ranks.magazine = Math.max(ranks.magazine, Math.min(SLOT_MAX, Math.max(0, Number(mag[1]) - 1)));
      return;
    }
    const hit = LEGACY_LEVEL[id];
    if (hit) ranks[hit[0]] = Math.max(ranks[hit[0]], hit[1]);
  };
  for (const id of raw.owned || []) bump(id);
  for (const id of Object.values(raw.loadout || {})) bump(id);
  if (raw.ranks) Object.assign(ranks, sanitizeSlotRanks({ ...ranks, ...raw.ranks }));
  return ranks;
}

export const STARTER_LOADOUT = { receiver: 't1_stock' };
