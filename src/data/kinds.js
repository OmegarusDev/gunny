/** Foe kinds: gait hint + paper palette. Biomes pick a roster of these ids. */

export const KINDS = {
  zombie: {
    id: 'zombie',
    hunch: 0.08,
    palette: {
      skin: '#8a9a62',
      cloth: '#4a3a32',
      rot: '#5a6a40',
      bone: '#cfc3a4',
      gum: '#7a3030',
      accent: '#3a342c',
      pant: '#3a342c',
      eye: '#c8d45a',
      ink: '#16140e',
    },
  },
  drowned: {
    id: 'drowned',
    hunch: 0.08,
    palette: {
      skin: '#6a7a68',
      cloth: '#24342c',
      rot: '#3a4a38',
      bone: '#a8b090',
      gum: '#4a3030',
      accent: '#3a4a40',
      pant: '#1e2820',
      eye: '#c8d4a0',
      ink: '#0c100e',
    },
  },
  vampire: {
    id: 'vampire',
    hunch: 0.02,
    palette: {
      skin: '#f0e4e0',
      hair: '#140c0c',
      cloth: '#1a1214',
      cape: '#5a1424',
      lining: '#3a0810',
      shirt: '#efe6dc',
      accent: '#5a1424',
      lip: '#8a2830',
      eye: '#c44536',
      ink: '#080406',
    },
  },
  mummy: {
    id: 'mummy',
    hunch: 0.08,
    palette: {
      skin: '#efe4c4',
      wrap: '#d4c08a',
      wrapHi: '#efe4c4',
      gap: '#5a4030',
      cloth: '#c4b07a',
      accent: '#5a4030',
      gold: '#e0b84a',
      eye: '#1a100c',
      ink: '#2a1c10',
    },
  },
  ghoul: {
    id: 'ghoul',
    hunch: 0.16,
    palette: {
      skin: '#e8dcc8',
      cloth: '#6a4030',
      rot: '#c4b8a4',
      bone: '#f0e8d8',
      gum: '#6a3030',
      accent: '#a05030',
      pant: '#4a3028',
      eye: '#2a1810',
      ink: '#1c1410',
    },
  },
};

export function palette(kind) {
  return KINDS[kind]?.palette || KINDS.zombie.palette;
}

export function pickRosterKind(roster, rng) {
  const list = roster?.length ? roster : ['zombie'];
  if (list.length === 1) return list[0];
  return list[Math.floor(rng() * list.length) % list.length];
}
