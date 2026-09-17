/** Gun parts. Each slot is a ladder: buy only the next rank (`requires` previous id). */

/** Box → drum (+5) → belt. mag_2 costs 100 ≈ 10 kills. Belts pay ammo with reload time. */
const MAG_BOX = [1, 2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 35];
const MAG_DRUM = [40, 45, 50, 55, 60, 65, 70, 75];
const MAG_BELT = [80, 90, 100, 110, 120];

export const PART_COST_RATE = 1.7;
export const BOLT_COST_RATE = 1.9;
export const BARREL_COST_BASE = 140;
export const OPTIC_COST_BASE = 200;
export const STOCK_COST_BASE = 160;
export const MUZZLE_COST_BASE = 160;
export const BOLT_COST_BASE = 250;
export const GAS_COST_BASE = 320;
export const SPRING_COST_BASE = 120;
export const AMMO_COST_BASE = 300;
export const GRIP_COST_BASE = 140;
export const TRIGGER_COST_BASE = 180;
export const LASER_COST_BASE = 220;
export const AMMO_DAMAGE_PER_RANK = 2.2;
export const AMMO_PEN_PER_RANK = 0.09;
export const BOLT_ROF_PER_RANK = 0.1;
export const TRIGGER_ROF_PER_RANK = 0.05;
export const GRIP_SPREAD_STEP = -0.16;
export const LASER_SPREAD_STEP = -0.18;
export const MUZZLE_RECOIL_STEP = -0.14;
export const MUZZLE_SPREAD_STEP = -0.12;

export function ladderCost(baseCost, costRate, rank) {
  if (rank <= 0) return 0;
  return Math.round(baseCost * costRate ** (rank - 1));
}

function roundTo(v, d = 3) {
  const p = 10 ** d;
  return Math.round(v * p) / p;
}

function scaleMods(perRank, rank) {
  const out = {};
  for (const [k, v] of Object.entries(perRank || {})) out[k] = roundTo(v * rank);
  return out;
}

function rankedSlot({ slot, starter, rungs, baseCost, costRate, perRank }) {
  const out = {
    [starter.id]: {
      id: starter.id,
      slot,
      rank: 0,
      name: starter.name,
      short: starter.short,
      cost: 0,
      desc: starter.desc,
      mods: starter.mods || {},
    },
  };
  rungs.forEach((rung, i) => {
    const rank = i + 1;
    const prev = i === 0 ? starter.id : rungs[i - 1].id;
    out[rung.id] = {
      id: rung.id,
      slot,
      rank,
      requires: prev,
      name: rung.name,
      short: rung.short,
      cost: ladderCost(baseCost, costRate, rank),
      desc: rung.desc,
      mods: { ...scaleMods(perRank, rank), ...(rung.mods || {}) },
    };
  });
  return out;
}

function muzzleMods(recoil, spread) {
  return {
    bloomPerShot: roundTo(MUZZLE_RECOIL_STEP * recoil, 2),
    baseSpread: roundTo(MUZZLE_SPREAD_STEP * spread, 2),
  };
}

function magCost(size) {
  if (size <= 1) return 0;
  const n = size - 1;
  return Math.round(85 * n + 15 * n ** 1.2);
}

function magKind(size) {
  if (MAG_BELT.includes(size)) return 'belt';
  if (MAG_DRUM.includes(size)) return 'drum';
  return 'box';
}

function magName(size, kind) {
  if (size === 1) return '1rd Single';
  if (kind === 'belt') return `${size}rd Belt`;
  if (kind === 'drum') return `${size}rd Drum`;
  if (size <= 3) return `${size}rd Clip`;
  return `${size}rd Box`;
}

function magDesc(size, kind) {
  if (size === 1) return 'One shot. Then you reload.';
  if (size === 2) return 'A second round. Worth the grind.';
  if (kind === 'drum' && size === 40) return 'Leaves boxes behind. Capacity climbs by fives.';
  if (kind === 'drum' && size === 75) return 'Top drum. Next step is linked belt feed.';
  if (kind === 'belt' && size === 80) return 'Belt feed. Huge ammo, punishing reload.';
  if (kind === 'belt' && size === 120) return 'Max belt. Rarely dry — when you are, you wait.';
  if (kind === 'belt') return 'Belt feed. More linked rounds, longer mag work.';
  if (kind === 'drum') return 'Drum mag. Ammo only — reload speed is springs/training.';
  return 'Box mag. Ammo only — reload speed is springs/training.';
}

function beltReload(size) {
  // Big reload tax; grows with belt depth (base reload ~2.5s).
  return Number((0.85 + ((size - 80) / 40) * 1.15).toFixed(2));
}

function buildMagParts() {
  const sizes = [...MAG_BOX, ...MAG_DRUM, ...MAG_BELT];
  const out = {};
  sizes.forEach((size, rank) => {
    const kind = magKind(size);
    const id = `mag_${size}`;
    const prev = rank === 0 ? null : `mag_${sizes[rank - 1]}`;
    const mods = { magSize: size - 1 };
    if (kind === 'belt') mods.reload = beltReload(size);
    out[id] = {
      id,
      slot: 'magazine',
      rank,
      kind,
      ...(prev ? { requires: prev } : {}),
      name: magName(size, kind),
      short: String(size),
      cost: magCost(size),
      desc: magDesc(size, kind),
      mods,
    };
  });
  return out;
}

export const PARTS = {
  barrel_stub: {
    id: 'barrel_stub',
    slot: 'barrel',
    rank: 0,
    name: 'Stub Barrel',
    short: 'Stub',
    cost: 0,
    desc: 'Short range. Snappy, imprecise.',
    mods: { damage: 0.4, bulletSpeed: -90, bloomPerShot: 0.35, aimRate: 0.4, baseSpread: 0.35, pen: 0.05 },
  },
  barrel_carbine: {
    id: 'barrel_carbine',
    slot: 'barrel',
    rank: 1,
    requires: 'barrel_stub',
    name: 'Carbine Barrel',
    short: 'Carbine',
    cost: ladderCost(BARREL_COST_BASE, PART_COST_RATE, 1),
    desc: 'A bit more range and a cleaner cone.',
    mods: { damage: 1, bulletSpeed: 40, bloomPerShot: -0.15, pen: 0.08, baseSpread: -0.2, shotRange: 48 },
  },
  barrel_rifle: {
    id: 'barrel_rifle',
    slot: 'barrel',
    rank: 2,
    requires: 'barrel_carbine',
    name: 'Rifle Barrel',
    short: 'Rifle',
    cost: ladderCost(BARREL_COST_BASE, PART_COST_RATE, 2),
    desc: 'Longer effective range and punch.',
    mods: { damage: 1.8, bulletSpeed: 140, bloomPerShot: -0.28, pen: 0.22, aimRate: -0.6, weight: 0.08, baseSpread: -0.4, shotRange: 96 },
  },
  barrel_long: {
    id: 'barrel_long',
    slot: 'barrel',
    rank: 3,
    requires: 'barrel_rifle',
    name: 'Long Barrel',
    short: 'Long',
    cost: ladderCost(BARREL_COST_BASE, PART_COST_RATE, 3),
    desc: 'Best on-screen range. Slow settle on slopes.',
    mods: { damage: 2.8, bulletSpeed: 240, bloomPerShot: -0.4, pen: 0.38, aimRate: -1.2, weight: 0.14, baseSpread: -0.65, shotRange: 150 },
  },

  ...buildMagParts(),

  ...rankedSlot({
    slot: 'ammo',
    baseCost: AMMO_COST_BASE,
    costRate: PART_COST_RATE,
    perRank: { damage: AMMO_DAMAGE_PER_RANK, bloomPerShot: 0.05, pen: AMMO_PEN_PER_RANK },
    starter: {
      id: 'ammo_factory',
      name: 'Factory Load',
      short: 'Factory',
      desc: 'Soft point. What the Shoddy ships with.',
    },
    rungs: [
      {
        id: 'ammo_hot',
        name: 'Hot Load',
        short: 'Hot',
        desc: 'More powder. Hits harder and bites a little deeper.',
      },
      {
        id: 'ammo_plusp',
        name: '+P Load',
        short: '+P',
        desc: 'Overpressure. Still shy of a pass-through on Shoddy.',
      },
      {
        id: 'ammo_magnum',
        name: 'Magnum Load',
        short: 'Magnum',
        desc: 'Hottest charge. On Shoddy, only a headshot and a crit together punch through.',
      },
    ],
  }),

  optic_none: {
    id: 'optic_none',
    slot: 'optic',
    rank: 0,
    name: 'Iron Sights',
    short: 'Iron',
    cost: 0,
    desc: 'Close sight picture. Zombies have to come onto the road.',
    mods: {},
  },
  optic_dot: {
    id: 'optic_dot',
    slot: 'optic',
    rank: 1,
    requires: 'optic_none',
    name: 'Red Dot',
    short: 'Dot',
    cost: ladderCost(OPTIC_COST_BASE, PART_COST_RATE, 1),
    desc: 'Tighter cone and a farther hold. Still short of mid-field. Does not add gun range.',
    mods: { bloomPerShot: -0.28, aimRate: 0.8, aimReach: 141, baseSpread: -0.25, critChance: 0.015 },
  },
  optic_acog: {
    id: 'optic_acog',
    slot: 'optic',
    rank: 2,
    requires: 'optic_dot',
    name: 'ACOG',
    short: 'ACOG',
    cost: ladderCost(OPTIC_COST_BASE, PART_COST_RATE, 2),
    desc: 'Holds into the right half of the screen with a cleaner first shot.',
    mods: { bloomPerShot: -0.4, aimRate: -0.3, bloomRecover: 0.6, aimReach: 294, baseSpread: -0.45, critChance: 0.028 },
  },
  optic_lpvo: {
    id: 'optic_lpvo',
    slot: 'optic',
    rank: 3,
    requires: 'optic_acog',
    name: 'LPVO',
    short: 'LPVO',
    cost: ladderCost(OPTIC_COST_BASE, PART_COST_RATE, 3),
    desc: 'Hold anywhere on screen. Barrel still sets how hard the round hits out there.',
    mods: { bloomPerShot: -0.55, aimRate: 0.4, bloomRecover: 0.9, weight: 0.06, fullScreenAim: 1, baseSpread: -0.7, critChance: 0.042 },
  },

  stock_none: {
    id: 'stock_none',
    slot: 'stock',
    rank: 0,
    name: 'No Stock',
    short: 'None',
    cost: 0,
    desc: 'Muzzle jump lives here.',
    mods: { bloomRecover: -1.4, aimRate: -0.8, weight: -0.08, baseSpread: 0.25 },
  },
  stock_wire: {
    id: 'stock_wire',
    slot: 'stock',
    rank: 1,
    requires: 'stock_none',
    name: 'Wire Stock',
    short: 'Wire',
    cost: ladderCost(STOCK_COST_BASE, PART_COST_RATE, 1),
    desc: 'Light brace.',
    mods: { bloomRecover: 0.8, aimRate: 0.5, baseSpread: -0.1 },
  },
  stock_combat: {
    id: 'stock_combat',
    slot: 'stock',
    rank: 2,
    requires: 'stock_wire',
    name: 'Combat Stock',
    short: 'Combat',
    cost: ladderCost(STOCK_COST_BASE, PART_COST_RATE, 2),
    desc: 'Bloom recovery and slope settle.',
    mods: { bloomRecover: 1.8, aimRate: 1.1, bloomPerShot: -0.12, baseSpread: -0.25 },
  },
  stock_precision: {
    id: 'stock_precision',
    slot: 'stock',
    rank: 3,
    requires: 'stock_combat',
    name: 'Precision Stock',
    short: 'Precision',
    cost: ladderCost(STOCK_COST_BASE, PART_COST_RATE, 3),
    desc: 'Best recovery. Heavier.',
    mods: { bloomRecover: 3.0, aimRate: 1.6, bloomPerShot: -0.22, weight: 0.1, baseSpread: -0.4 },
  },

  ...rankedSlot({
    slot: 'muzzle',
    baseCost: MUZZLE_COST_BASE,
    costRate: PART_COST_RATE,
    starter: {
      id: 'muzzle_none',
      name: 'Bare Muzzle',
      short: 'Bare',
      desc: 'No device.',
    },
    rungs: [
      {
        id: 'muzzle_comp',
        name: 'Compensator',
        short: 'Comp',
        desc: 'Cuts recoil and tightens the cone a little.',
        mods: muzzleMods(1, 1),
      },
      {
        id: 'muzzle_brake',
        name: 'Muzzle Brake',
        short: 'Brake',
        desc: 'Strong recoil dump. Spread help stays modest.',
        mods: muzzleMods(2, 1),
      },
      {
        id: 'muzzle_ported',
        name: 'Ported Muzzle',
        short: 'Ported',
        desc: 'Ports dump recoil and clean the cone.',
        mods: muzzleMods(2, 2),
      },
      {
        id: 'muzzle_hybrid',
        name: 'Hybrid Brake',
        short: 'Hybrid',
        desc: 'Best recoil control, with a tight cone.',
        mods: muzzleMods(3, 2),
      },
    ],
  }),

  ...rankedSlot({
    slot: 'bolt',
    baseCost: BOLT_COST_BASE,
    costRate: BOLT_COST_RATE,
    perRank: { rof: BOLT_ROF_PER_RANK, bloomPerShot: 0.12, heatBuild: 0.04 },
    starter: {
      id: 'bolt_factory',
      name: 'Factory Bolt',
      short: 'Factory',
      desc: 'Heavy, slow cycle. What the Shoddy ships with.',
    },
    rungs: [
      {
        id: 'bolt_polished',
        name: 'Polished Bolt',
        short: 'Polished',
        desc: 'Smoother raceways. Faster cycle, a bit more bounce.',
      },
      {
        id: 'bolt_light',
        name: 'Lightened Bolt',
        short: 'Light',
        desc: 'Metal cut away. Snappy, bloom hungry.',
      },
      {
        id: 'bolt_fluted',
        name: 'Fluted Bolt',
        short: 'Fluted',
        desc: 'Fastest cycle the action will take. Heat soars.',
      },
    ],
  }),

  ...rankedSlot({
    slot: 'gasBlock',
    baseCost: GAS_COST_BASE,
    costRate: PART_COST_RATE,
    perRank: { heatDump: 0.07, heatBuild: -0.02, bloomRecover: 0.2 },
    starter: {
      id: 'gas_factory',
      name: 'Factory Gas',
      short: 'Factory',
      desc: 'Stock cycling.',
    },
    rungs: [
      {
        id: 'gas_adjust',
        name: 'Adjustable Gas',
        short: 'Adjust',
        desc: 'Dumps heat faster.',
      },
      {
        id: 'gas_over',
        name: 'Overgassed',
        short: 'Over',
        desc: 'Faster cycle, more heat and bloom.',
        mods: { rof: 0.12, heatBuild: 0.1, bloomPerShot: 0.15 },
      },
      {
        id: 'gas_piston',
        name: 'Piston Drive',
        short: 'Piston',
        desc: 'Faster cycle, cooler impulse. Heavier.',
        mods: { rof: 0.18, weight: 0.08, heatBuild: -0.05, bloomRecover: 0.15 },
      },
    ],
  }),

  ...rankedSlot({
    slot: 'springs',
    baseCost: SPRING_COST_BASE,
    costRate: PART_COST_RATE,
    perRank: { reload: -0.22 },
    starter: {
      id: 'spring_factory',
      name: 'Factory Spring',
      short: 'Factory',
      desc: 'Stock return. Slow inserts.',
    },
    rungs: [
      {
        id: 'spring_tuned',
        name: 'Tuned Spring',
        short: 'Tuned',
        desc: 'Noticeably faster mag work.',
      },
      {
        id: 'spring_light',
        name: 'Reduced Power',
        short: 'Light',
        desc: 'Quick inserts under pressure.',
      },
      {
        id: 'spring_race',
        name: 'Race Spring',
        short: 'Race',
        desc: 'Fastest cycle the action will take.',
      },
    ],
  }),

  ...rankedSlot({
    slot: 'grip',
    baseCost: GRIP_COST_BASE,
    costRate: PART_COST_RATE,
    perRank: { baseSpread: GRIP_SPREAD_STEP },
    starter: {
      id: 'grip_none',
      name: 'Smooth Grip',
      short: 'Smooth',
      desc: 'Bare wood. The cone lives here.',
    },
    rungs: [
      {
        id: 'grip_groove',
        name: 'Grooved Grip',
        short: 'Groove',
        desc: 'Cuts a little wander off the first shot.',
      },
      {
        id: 'grip_tactical',
        name: 'Tactical Grip',
        short: 'Tactical',
        desc: 'Firmer hold. Tighter cone.',
      },
      {
        id: 'grip_ergo',
        name: 'Ergo Grip',
        short: 'Ergo',
        desc: 'Best purchase. The cone settles.',
      },
    ],
  }),

  ...rankedSlot({
    slot: 'trigger',
    baseCost: TRIGGER_COST_BASE,
    costRate: PART_COST_RATE,
    perRank: { rof: TRIGGER_ROF_PER_RANK },
    starter: {
      id: 'trigger_factory',
      name: 'Factory Trigger',
      short: 'Factory',
      desc: 'Heavy break. What Ordnance ships with.',
    },
    rungs: [
      {
        id: 'trigger_match',
        name: 'Match Trigger',
        short: 'Match',
        desc: 'A lighter break. A bit more cyclic rate.',
      },
      {
        id: 'trigger_two',
        name: 'Two-Stage',
        short: 'Two-Stage',
        desc: 'Crisp wall. Faster follow-up.',
      },
      {
        id: 'trigger_hair',
        name: 'Hair Trigger',
        short: 'Hair',
        desc: 'Fastest break the action will take.',
      },
    ],
  }),

  ...rankedSlot({
    slot: 'laser',
    baseCost: LASER_COST_BASE,
    costRate: PART_COST_RATE,
    perRank: { baseSpread: LASER_SPREAD_STEP },
    starter: {
      id: 'laser_none',
      name: 'No Laser',
      short: 'None',
      desc: 'Hold by feel.',
    },
    rungs: [
      {
        id: 'laser_peq',
        name: 'PEQ Light',
        short: 'PEQ',
        desc: 'A visible beam while you hold. Tighter cone.',
        mods: { laserSight: 1 },
      },
      {
        id: 'laser_vis',
        name: 'Visible Laser',
        short: 'Visible',
        desc: 'Brighter beam. Cleaner first shot.',
        mods: { laserSight: 1 },
      },
      {
        id: 'laser_ir',
        name: 'IR Laser',
        short: 'IR',
        desc: 'Tightest beam. Best hold on the cone.',
        mods: { laserSight: 1 },
      },
    ],
  }),
};

export const STARTER_RECEIVERS = ['t1_stock'];

export const STARTER_PARTS = [
  'mag_1',
  'bolt_factory',
  'ammo_factory',
  'barrel_stub',
  'spring_factory',
  'grip_none',
  'optic_none',
  'stock_none',
  'trigger_factory',
  'muzzle_none',
  'gas_factory',
  'laser_none',
];

export const STARTER_OWNED = [...STARTER_RECEIVERS, ...STARTER_PARTS];

export const STARTER_LOADOUT = {
  receiver: 't1_stock',
  magazine: 'mag_1',
  bolt: 'bolt_factory',
  ammo: 'ammo_factory',
  barrel: 'barrel_stub',
  springs: 'spring_factory',
  grip: 'grip_none',
  optic: 'optic_none',
  stock: 'stock_none',
  trigger: 'trigger_factory',
  muzzle: 'muzzle_none',
  gasBlock: 'gas_factory',
  laser: 'laser_none',
};

export const CATALOG_WINDOW = 4;

export function partsForSlot(slot) {
  return Object.values(PARTS)
    .filter((p) => p.slot === slot)
    .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
}

export function catalogWindow(items, { focusId, start = 0, size = CATALOG_WINDOW, keepStart = false } = {}) {
  if (!items.length) return { items: [], start: 0, total: 0 };
  if (items.length <= size) return { items, start: 0, total: items.length };
  let s = Number.isFinite(start) ? start : 0;
  s = Math.max(0, Math.min(s, items.length - size));
  if (!keepStart) {
    const focus = items.findIndex((i) => i.id === focusId);
    if (focus >= 0) {
      if (focus < s) s = focus;
      if (focus >= s + size) s = focus - size + 1;
    }
    s = Math.max(0, Math.min(s, items.length - size));
  }
  return { items: items.slice(s, s + size), start: s, total: items.length };
}

/** Four chips, chunked to the next purchasable rung. No skip-ahead, no pager. */
export function catalogProgressWindow(items, { nextId, size = CATALOG_WINDOW } = {}) {
  if (!items.length) return { items: [], start: 0, total: 0 };
  if (items.length <= size) return { items, start: 0, total: items.length };
  let focus = items.findIndex((i) => i.id === nextId);
  if (focus < 0) focus = items.length - 1;
  const start = Math.min(Math.floor(focus / size) * size, items.length - size);
  return { items: items.slice(start, start + size), start, total: items.length };
}

export function partRequirement(id) {
  return PARTS[id]?.requires || null;
}
