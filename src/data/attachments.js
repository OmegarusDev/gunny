/** Gun parts. Each slot is a ladder: buy only the next rank (`requires` previous id). */

/** Box → drum (+5) → belt. mag_2 costs 100 ≈ 10 kills. Belts pay ammo with reload time. */
const MAG_BOX = [1, 2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 35];
const MAG_DRUM = [40, 45, 50, 55, 60, 65, 70, 75];
const MAG_BELT = [80, 90, 100, 110, 120];

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
    cost: 0,
    desc: 'Short, snappy, imprecise.',
    mods: { bulletSpeed: -90, bloomPerShot: 0.35, pen: -0.08, aimRate: 0.4 },
  },
  barrel_carbine: {
    id: 'barrel_carbine',
    slot: 'barrel',
    rank: 1,
    requires: 'barrel_stub',
    name: 'Carbine Barrel',
    cost: 140,
    desc: 'Balanced velocity and control.',
    mods: { bulletSpeed: 40, bloomPerShot: -0.15, pen: 0.08 },
  },
  barrel_rifle: {
    id: 'barrel_rifle',
    slot: 'barrel',
    rank: 2,
    requires: 'barrel_carbine',
    name: 'Rifle Barrel',
    cost: 280,
    desc: 'Higher velocity and penetration.',
    mods: { bulletSpeed: 140, bloomPerShot: -0.28, pen: 0.22, aimRate: -0.6, weight: 0.08 },
  },
  barrel_long: {
    id: 'barrel_long',
    slot: 'barrel',
    rank: 3,
    requires: 'barrel_rifle',
    name: 'Long Barrel',
    cost: 480,
    desc: 'Max velocity. Slow settle on slopes.',
    mods: { bulletSpeed: 240, bloomPerShot: -0.4, pen: 0.38, aimRate: -1.2, weight: 0.14 },
  },

  ...buildMagParts(),

  optic_none: {
    id: 'optic_none',
    slot: 'optic',
    rank: 0,
    name: 'Iron Sights',
    cost: 0,
    desc: 'No optic.',
    mods: {},
  },
  optic_dot: {
    id: 'optic_dot',
    slot: 'optic',
    rank: 1,
    requires: 'optic_none',
    name: 'Red Dot',
    cost: 200,
    desc: 'Cuts bloom growth.',
    mods: { bloomPerShot: -0.28, aimRate: 0.8 },
  },
  optic_acog: {
    id: 'optic_acog',
    slot: 'optic',
    rank: 2,
    requires: 'optic_dot',
    name: 'ACOG',
    cost: 380,
    desc: 'Tracking and bloom control.',
    mods: { bloomPerShot: -0.4, aimRate: -0.3, bloomRecover: 0.6 },
  },
  optic_lpvo: {
    id: 'optic_lpvo',
    slot: 'optic',
    rank: 3,
    requires: 'optic_acog',
    name: 'LPVO',
    cost: 640,
    desc: 'Excellent bloom control.',
    mods: { bloomPerShot: -0.55, aimRate: 0.4, bloomRecover: 0.9, weight: 0.06 },
  },

  stock_none: {
    id: 'stock_none',
    slot: 'stock',
    rank: 0,
    name: 'No Stock',
    cost: 0,
    desc: 'Muzzle jump lives here.',
    mods: { bloomRecover: -1.4, aimRate: -0.8, weight: -0.08 },
  },
  stock_wire: {
    id: 'stock_wire',
    slot: 'stock',
    rank: 1,
    requires: 'stock_none',
    name: 'Wire Stock',
    cost: 160,
    desc: 'Light brace.',
    mods: { bloomRecover: 0.8, aimRate: 0.5 },
  },
  stock_combat: {
    id: 'stock_combat',
    slot: 'stock',
    rank: 2,
    requires: 'stock_wire',
    name: 'Combat Stock',
    cost: 320,
    desc: 'Bloom recovery and slope settle.',
    mods: { bloomRecover: 1.8, aimRate: 1.1, bloomPerShot: -0.12 },
  },
  stock_precision: {
    id: 'stock_precision',
    slot: 'stock',
    rank: 3,
    requires: 'stock_combat',
    name: 'Precision Stock',
    cost: 520,
    desc: 'Best recovery. Heavier.',
    mods: { bloomRecover: 3.0, aimRate: 1.6, bloomPerShot: -0.22, weight: 0.1 },
  },

  muzzle_none: {
    id: 'muzzle_none',
    slot: 'muzzle',
    rank: 0,
    name: 'Bare Muzzle',
    cost: 0,
    desc: 'No device.',
    mods: {},
  },
  muzzle_flash: {
    id: 'muzzle_flash',
    slot: 'muzzle',
    rank: 1,
    requires: 'muzzle_none',
    name: 'Flash Hider',
    cost: 140,
    desc: 'Mild bloom cut.',
    mods: { bloomPerShot: -0.12 },
  },
  muzzle_comp: {
    id: 'muzzle_comp',
    slot: 'muzzle',
    rank: 2,
    requires: 'muzzle_flash',
    name: 'Compensator',
    cost: 300,
    desc: 'Strong bloom control, extra heat.',
    mods: { bloomPerShot: -0.42, heatBuild: 0.04 },
  },
  muzzle_can: {
    id: 'muzzle_can',
    slot: 'muzzle',
    rank: 3,
    requires: 'muzzle_comp',
    name: 'Suppressor',
    cost: 480,
    desc: 'Quieter muzzle, lower velocity.',
    mods: { bloomPerShot: -0.22, bulletSpeed: -80, pen: -0.06, heatDump: 0.04 },
  },

  trigger_milspec: {
    id: 'trigger_milspec',
    slot: 'trigger',
    rank: 0,
    name: 'Milspec Trigger',
    cost: 0,
    desc: 'Factory pull.',
    mods: {},
  },
  trigger_match: {
    id: 'trigger_match',
    slot: 'trigger',
    rank: 1,
    requires: 'trigger_milspec',
    name: 'Match Trigger',
    cost: 360,
    desc: 'Higher RoF, cleaner break.',
    mods: { rof: 0.9 },
  },
  trigger_binary: {
    id: 'trigger_binary',
    slot: 'trigger',
    rank: 2,
    requires: 'trigger_match',
    name: 'Binary Trigger',
    cost: 720,
    desc: 'RoF ceiling. Bloom hungry.',
    mods: { rof: 2.4, bloomPerShot: 0.2, heatBuild: 0.06 },
  },

  gas_factory: {
    id: 'gas_factory',
    slot: 'gasBlock',
    rank: 0,
    name: 'Factory Gas',
    cost: 0,
    desc: 'Stock cycling.',
    mods: {},
  },
  gas_adjust: {
    id: 'gas_adjust',
    slot: 'gasBlock',
    rank: 1,
    requires: 'gas_factory',
    name: 'Adjustable Gas',
    cost: 320,
    desc: 'Dumps heat faster.',
    mods: { heatDump: 0.12, heatBuild: -0.04, bloomRecover: 0.4 },
  },
  gas_over: {
    id: 'gas_over',
    slot: 'gasBlock',
    rank: 2,
    requires: 'gas_adjust',
    name: 'Overgassed',
    cost: 480,
    desc: 'Faster cycle, more heat and bloom.',
    mods: { rof: 1.1, heatBuild: 0.08, bloomPerShot: 0.15 },
  },

  // Springs = reload speed ladder (available on T1). Perfect window is a gunner skill.
  spring_factory: {
    id: 'spring_factory',
    slot: 'springs',
    rank: 0,
    name: 'Factory Spring',
    cost: 0,
    desc: 'Stock return. Slow inserts.',
    mods: {},
  },
  spring_tuned: {
    id: 'spring_tuned',
    slot: 'springs',
    rank: 1,
    requires: 'spring_factory',
    name: 'Tuned Spring',
    cost: 120,
    desc: 'Noticeably faster mag work.',
    mods: { reload: -0.22 },
  },
  spring_light: {
    id: 'spring_light',
    slot: 'springs',
    rank: 2,
    requires: 'spring_tuned',
    name: 'Reduced Power',
    cost: 240,
    desc: 'Quick inserts under pressure.',
    mods: { reload: -0.42 },
  },
  spring_race: {
    id: 'spring_race',
    slot: 'springs',
    rank: 3,
    requires: 'spring_light',
    name: 'Race Spring',
    cost: 420,
    desc: 'Fastest cycle the action will take.',
    mods: { reload: -0.65 },
  },
};

export const STARTER_OWNED = [
  't1_stock',
  'barrel_stub',
  'mag_1',
  'optic_none',
  'stock_none',
  'muzzle_none',
  'trigger_milspec',
  'gas_factory',
  'spring_factory',
];

export const STARTER_LOADOUT = {
  receiver: 't1_stock',
  barrel: 'barrel_stub',
  magazine: 'mag_1',
  optic: 'optic_none',
  stock: 'stock_none',
  muzzle: 'muzzle_none',
  trigger: 'trigger_milspec',
  gasBlock: 'gas_factory',
  springs: 'spring_factory',
};

export function partsForSlot(slot) {
  return Object.values(PARTS)
    .filter((p) => p.slot === slot)
    .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
}

export function partRequirement(id) {
  return PARTS[id]?.requires || null;
}
