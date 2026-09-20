export const SKILLS = {
  recoil: {
    id: 'recoil',
    name: 'Recoil Mitigation',
    short: 'Recoil',
    desc: 'Reduces bloom expansion per shot.',
    maxRank: 20,
    baseCost: 40,
    perRank: { bloomPerShotMul: -0.055 },
  },
  reload: {
    id: 'reload',
    name: 'Precision Reloading',
    short: 'Reload',
    desc: 'Faster reloads and a wider perfect active-reload window.',
    maxRank: 20,
    baseCost: 40,
    perRank: { reload: -0.07, perfectWidth: 0.012 },
  },
  marksman: {
    id: 'marksman',
    name: 'Marksmanship',
    short: 'Marksman',
    desc: 'Tighter first-shot cone and faster aim settle.',
    maxRank: 20,
    baseCost: 40,
    perRank: { baseSpread: -0.12, aimRate: 0.35 },
  },
  scavenger: {
    id: 'scavenger',
    name: 'Scavenger Focus',
    short: 'Scavenger',
    desc: 'More cash from kills. Softens long grinds.',
    maxRank: 20,
    baseCost: 40,
    perRank: { cashMul: 0.07 },
  },
  critChance: {
    id: 'critChance',
    name: 'Crit Chance',
    short: 'Crit %',
    desc: 'Independent RNG crit chance. Not a headshot. Adds pen on a crit.',
    maxRank: 20,
    baseCost: 40,
    perRank: { critChance: 0.03 },
  },
  critMult: {
    id: 'critMult',
    name: 'Crit Multiplier',
    short: 'Crit ×',
    desc: 'Increases crit damage multiplier. Crits also add a flat pen bonus.',
    maxRank: 20,
    baseCost: 40,
    perRank: { critMult: 0.07 },
  },
  speed: {
    id: 'speed',
    name: 'Road Speed',
    short: 'Speed',
    desc: 'Walk the road a little faster. Metres tick sooner. Enemies still close.',
    maxRank: 20,
    baseCost: 40,
    perRank: { moveMul: 0.01 },
  },
  firing: {
    id: 'firing',
    name: 'Firing Cadence',
    short: 'Firing',
    desc: 'A little more cyclic rate. Bolt and trigger still do the heavy lifting.',
    maxRank: 20,
    baseCost: 40,
    perRank: { rof: 0.012 },
  },
};

export const GUNNER_XP = 100;

/** First rank is 40 XP for every skill, then +20 XP each. Always a round number. */
export function skillCost(def, nextRank) {
  return def.baseCost + 20 * Math.max(0, nextRank);
}

export function emptyRanks() {
  const ranks = {};
  for (const id of Object.keys(SKILLS)) ranks[id] = 0;
  return ranks;
}

export function sanitizeRanks(ranks) {
  const next = emptyRanks();
  for (const id of Object.keys(next)) {
    const n = Math.floor(Number(ranks?.[id]) || 0);
    next[id] = Math.max(0, Math.min(SKILLS[id].maxRank, n));
  }
  return next;
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
  return 1 + Math.floor(total / GUNNER_XP);
}
