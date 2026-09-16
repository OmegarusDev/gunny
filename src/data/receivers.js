import { AIM_REACH_BASE, SHOT_REACH_BASE } from '../config.js';

export const SLOTS = [
  'receiver',
  'barrel',
  'magazine',
  'springs',
  'optic',
  'stock',
  'muzzle',
  'trigger',
  'gasBlock',
];

/** Springs unlock on T1 so reload is available before optic/stock. */
export const SLOT_MIN_TIER = {
  receiver: 1,
  barrel: 1,
  magazine: 1,
  springs: 1,
  optic: 2,
  stock: 2,
  muzzle: 2,
  trigger: 3,
  gasBlock: 3,
};

/** Combat stats grow by this each receiver rank. Shoddy is rank 0. */
export const RECEIVER_STAT_RATE = 1.5;
export const RECEIVER_COST_BASE = 550;
export const RECEIVER_COST_RATE = 2;

const SHODDY_BASE = {
  damage: 13,
  rof: 0.5,
  magSize: 1,
  reload: 2.55,
  perfectWidth: 0.07,
  bulletSpeed: 820,
  pen: 1.05,
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

/** Linear add per rank on top of Shoddy. Combat (dmg/rof/pen) uses STAT_RATE instead. */
const RECEIVER_PER_RANK = {
  reload: -0.15,
  perfectWidth: 0.01,
  bulletSpeed: 40,
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

export function receiverCost(rank) {
  if (rank <= 0) return 0;
  return Math.round(RECEIVER_COST_BASE * RECEIVER_COST_RATE ** (rank - 1));
}

export function receiverBase(rank) {
  const g = RECEIVER_STAT_RATE ** rank;
  const base = { ...SHODDY_BASE };
  base.damage = roundTo(SHODDY_BASE.damage * g, 1);
  base.rof = SHODDY_BASE.rof * g;
  base.pen = roundTo(SHODDY_BASE.pen * g, 2);
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
    desc: 'Jury-rigged receiver. Barrel, mag, and springs. Heavy, slow, hot.',
  },
  {
    id: 't2_tactical',
    name: 'Tactical Receiver',
    short: 'Tactical',
    desc: 'Opens optic, stock, and muzzle. Better heat path.',
  },
  {
    id: 't3_ordnance',
    name: 'Ordnance Receiver',
    short: 'Ordnance',
    desc: 'Full internals: trigger and gas. High RoF ceiling.',
  },
  {
    id: 't4_advanced',
    name: 'Advanced Receiver',
    short: 'Advanced',
    desc: 'Machined successor. Same rails as Ordnance, hotter ceiling.',
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
