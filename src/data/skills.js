export const SKILLS = {
  recoil: {
    id: 'recoil',
    name: 'Recoil Mitigation',
    short: 'Recoil',
    desc: 'Reduces bloom expansion per shot.',
    maxRank: 8,
    baseCost: 35,
    perRank: { bloomPerShotMul: -0.055 },
  },
  reload: {
    id: 'reload',
    name: 'Precision Reloading',
    short: 'Reload',
    desc: 'Faster reloads and a wider perfect active-reload window.',
    maxRank: 8,
    baseCost: 40,
    perRank: { reload: -0.07, perfectWidth: 0.012 },
  },
  marksman: {
    id: 'marksman',
    name: 'Marksmanship',
    short: 'Marksman',
    desc: 'Tighter first-shot cone and faster aim settle.',
    maxRank: 8,
    baseCost: 40,
    perRank: { baseSpread: -0.12, aimRate: 0.35 },
  },
  scavenger: {
    id: 'scavenger',
    name: 'Scavenger Focus',
    short: 'Scavenger',
    desc: 'More cash from kills. Softens long grinds.',
    maxRank: 8,
    baseCost: 30,
    perRank: { cashMul: 0.07 },
  },
  critChance: {
    id: 'critChance',
    name: 'Crit Chance',
    short: 'Crit %',
    desc: 'Independent RNG crit chance. Not a headshot.',
    maxRank: 10,
    baseCost: 45,
    perRank: { critChance: 0.03 },
  },
  critMult: {
    id: 'critMult',
    name: 'Crit Multiplier',
    short: 'Crit ×',
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

/** Old skill trees — XP is refunded on load so retired ranks are not lost. */
export const RETIRED_SKILLS = {
  elevation: { id: 'elevation', maxRank: 8, baseCost: 35 },
};

export function refundRetiredRanks(ranks) {
  if (!ranks) return 0;
  let xp = 0;
  for (const [id, def] of Object.entries(RETIRED_SKILLS)) {
    const rank = ranks[id] || 0;
    for (let r = 0; r < rank; r++) xp += skillCost(def, r);
    delete ranks[id];
  }
  for (const id of Object.keys(ranks)) {
    if (!SKILLS[id]) delete ranks[id];
  }
  return xp;
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
