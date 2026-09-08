export const SKILLS = {
  recoil: {
    id: 'recoil',
    name: 'Recoil Mitigation',
    desc: 'Reduces bloom expansion per shot.',
    maxRank: 8,
    baseCost: 35,
    perRank: { bloomPerShotMul: -0.055 },
  },
  reload: {
    id: 'reload',
    name: 'Precision Reloading',
    desc: 'Faster reloads and a wider perfect active-reload window.',
    maxRank: 8,
    baseCost: 40,
    perRank: { reload: -0.07, perfectWidth: 0.012 },
  },
  elevation: {
    id: 'elevation',
    name: 'Agile Elevation Tracking',
    desc: 'Faster aim settle across slope changes.',
    maxRank: 8,
    baseCost: 35,
    perRank: { aimRate: 0.5 },
  },
  scavenger: {
    id: 'scavenger',
    name: 'Scavenger Focus',
    desc: 'More cash from kills. Softens long grinds.',
    maxRank: 8,
    baseCost: 30,
    perRank: { cashMul: 0.07 },
  },
  critChance: {
    id: 'critChance',
    name: 'Crit Chance',
    desc: 'Independent RNG crit chance. Not a headshot.',
    maxRank: 10,
    baseCost: 45,
    perRank: { critChance: 0.03 },
  },
  critMult: {
    id: 'critMult',
    name: 'Crit Multiplier',
    desc: 'Increases crit damage multiplier.',
    maxRank: 8,
    baseCost: 50,
    perRank: { critMult: 0.07 },
  },
};

/** Mild curve so mid ranks stay grindable, not a wall. */
export function skillCost(def, nextRank) {
  return Math.floor(def.baseCost * (1 + nextRank * 0.55));
}

export function emptyRanks() {
  const ranks = {};
  for (const id of Object.keys(SKILLS)) ranks[id] = 0;
  return ranks;
}

export function xpInvested(ranks) {
  let spent = 0;
  for (const def of Object.values(SKILLS)) {
    const rank = ranks?.[def.id] || 0;
    for (let r = 0; r < rank; r++) spent += skillCost(def, r);
  }
  return spent;
}

export function gunnerLevel(profile) {
  const total = Math.max(0, Math.floor(profile.xp) + xpInvested(profile.skillRanks));
  return 1 + Math.floor(total / 90);
}
