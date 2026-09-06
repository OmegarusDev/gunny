export const SKILLS = {
  recoil: {
    id: 'recoil',
    name: 'Recoil Mitigation',
    desc: 'Reduces bloom expansion per shot.',
    maxRank: 8,
    baseCost: 40,
    perRank: { bloomPerShotMul: -0.06 },
  },
  reload: {
    id: 'reload',
    name: 'Precision Reloading',
    desc: 'Widens the perfect active-reload window.',
    maxRank: 8,
    baseCost: 45,
    perRank: { perfectWidth: 0.012 },
  },
  elevation: {
    id: 'elevation',
    name: 'Agile Elevation Tracking',
    desc: 'Faster aim settle across slope changes.',
    maxRank: 8,
    baseCost: 40,
    perRank: { aimRate: 0.55 },
  },
  scavenger: {
    id: 'scavenger',
    name: 'Scavenger Focus',
    desc: 'More cash from distance and limb hits.',
    maxRank: 8,
    baseCost: 35,
    perRank: { cashMul: 0.08 },
  },
  critChance: {
    id: 'critChance',
    name: 'Crit Chance',
    desc: 'Independent RNG crit chance. Not a headshot.',
    maxRank: 10,
    baseCost: 55,
    perRank: { critChance: 0.035 },
  },
  critMult: {
    id: 'critMult',
    name: 'Crit Multiplier',
    desc: 'Increases crit damage multiplier.',
    maxRank: 8,
    baseCost: 60,
    perRank: { critMult: 0.08 },
  },
};

export function skillCost(def, nextRank) {
  return Math.floor(def.baseCost * (1 + nextRank * 0.65));
}

export function emptyRanks() {
  const ranks = {};
  for (const id of Object.keys(SKILLS)) ranks[id] = 0;
  return ranks;
}
