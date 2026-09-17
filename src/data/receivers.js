import { AIM_REACH_BASE, SHOT_REACH_BASE } from '../config.js';

export const SLOTS = [
  'receiver',
  'magazine',
  'bolt',
  'ammo',
  'barrel',
  'springs',
  'grip',
  'optic',
  'stock',
  'trigger',
  'muzzle',
  'gasBlock',
  'laser',
];

/** Shoddy: mag, bolt, ammo. Later guns open two slots, Advanced opens the last three. */
export const SLOT_MIN_TIER = {
  receiver: 1,
  magazine: 1,
  bolt: 1,
  ammo: 1,
  barrel: 2,
  springs: 2,
  grip: 3,
  optic: 3,
  stock: 4,
  trigger: 4,
  muzzle: 5,
  gasBlock: 5,
  laser: 5,
};

/** Damage and RoF grow by this each receiver rank. Shoddy is rank 0. Pen is special-cased. */
export const RECEIVER_STAT_RATE = 1.5;
export const RECEIVER_COST_BASE = 500;
/** Militia ~30m, then +1h / +2h / +4h. Round hundreds; leftover kit fills the long tail. */
export const RECEIVER_COSTS = [0, 500, 2000, 4000, 8000];
/** Militia (rank 1) pen. Later ranks still 1.5× from here so they can punch through. */
export const MILITIA_PEN = 0.9;

const SHODDY_BASE = {
  damage: 15,
  rof: 40 / 60,
  magSize: 1,
  reload: 3,
  perfectWidth: 0.1,
  bulletSpeed: 1600,
  pen: 0.5,
  penDecay: 0.0009,
  bloomPerShot: 1.85,
  bloomRecover: 5.2,
  aimRate: 7.2,
  aimReach: AIM_REACH_BASE,
  shotRange: SHOT_REACH_BASE,
  baseSpread: 2.35,
  heatBuild: 0.22,
  heatDump: 0.16,
  heatBloom: 4.5,
  weight: 1.15,
};

/** Linear add per rank on top of Shoddy. Damage and RoF use STAT_RATE instead. */
const RECEIVER_PER_RANK = {
  reload: -0.15,
  perfectWidth: 0.01,
  bulletSpeed: 80,
  penDecay: -0.0001,
  bloomPerShot: -0.2,
  bloomRecover: 0.9,
  aimRate: 0.9,
  shotRange: 24,
  baseSpread: -0.28,
  heatBuild: -0.04,
  heatDump: 0.06,
  heatBloom: -0.85,
  weight: -0.1,
};

function roundTo(v, d) {
  const p = 10 ** d;
  return Math.round(v * p) / p;
}

function receiverCost(rank) {
  if (rank <= 0) return 0;
  if (rank < RECEIVER_COSTS.length) return RECEIVER_COSTS[rank];
  return Math.round(RECEIVER_COSTS[RECEIVER_COSTS.length - 1] * 1.5 ** (rank - (RECEIVER_COSTS.length - 1)));
}

function receiverBase(rank) {
  const g = RECEIVER_STAT_RATE ** rank;
  const base = { ...SHODDY_BASE };
  base.damage = roundTo(SHODDY_BASE.damage * g, 1);
  base.rof = SHODDY_BASE.rof * g;
  base.pen = rank <= 0 ? SHODDY_BASE.pen : roundTo(MILITIA_PEN * RECEIVER_STAT_RATE ** (rank - 1), 2);
  for (const [k, v] of Object.entries(RECEIVER_PER_RANK)) {
    if (k === 'shotRange') {
      base[k] = SHODDY_BASE[k] + v * rank;
      continue;
    }
    const digits = k === 'penDecay' ? 4 : 2;
    base[k] = roundTo(SHODDY_BASE[k] + v * rank, digits);
  }
  base.magSize = 1;
  base.aimReach = AIM_REACH_BASE;
  return base;
}

const META = [
  {
    id: 't1_stock',
    name: 'Shoddy Receiver',
    short: 'Shoddy',
    desc: 'Jury-rigged receiver. Mag, bolt, and ammo. Heavy, slow, hot.',
  },
  {
    id: 't2_tactical',
    name: 'Militia Receiver',
    short: 'Militia',
    desc: 'Militia-grade. Opens barrel and springs.',
  },
  {
    id: 't3_ordnance',
    name: 'Ordnance Receiver',
    short: 'Ordnance',
    desc: 'Opens grip and optic. A cleaner hold and a longer sight.',
  },
  {
    id: 't4_duty',
    name: 'Duty Receiver',
    short: 'Duty',
    desc: 'Opens stock and trigger. Planted fire.',
  },
  {
    id: 't5_advanced',
    name: 'Advanced Receiver',
    short: 'Advanced',
    desc: 'Opens muzzle, gas, and a laser. Hottest ceiling.',
  },
];

export const RECEIVERS = Object.fromEntries(
  META.map((meta, rank) => [
    meta.id,
    {
      ...meta,
      tier: rank + 1,
      rank,
      cost: receiverCost(rank),
      ...(rank > 0 ? { requires: META[rank - 1].id } : {}),
      base: receiverBase(rank),
    },
  ]),
);

export function receiverRequirement(id) {
  return RECEIVERS[id]?.requires || null;
}
