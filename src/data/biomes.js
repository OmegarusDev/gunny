export const BIOMES = [
  {
    id: 'forest',
    kind: 'zombie',
    place: 'Forest Road',
    foe: 'Zombies',
    blurb: 'A two-rut country lane. The trees close in. Don’t look back.',
    sky: ['#2a3a58', '#e08a48', '#8a4a32'],
    hillFar: '#2c4634',
    hillNear: '#1a2e22',
    canopy: ['#2f6a3a', '#245830', '#3a7a44', '#1e4a28'],
    trunk: '#4a3020',
    road: '#8a6a4c',
    rut: '#5a4434',
    soil: '#2a1c12',
    grass: '#3d6a34',
    verge: '#4a7a3c',
    sun: '#ffd078',
    mist: 'rgba(90, 40, 28, 0.16)',
    accent: '#c44536',
    hud: '#f3e6d0',
    card: '#3d6b45',
  },
  {
    id: 'fen',
    kind: 'drowned',
    place: 'Fen Causeway',
    foe: 'Drowned',
    blurb: 'A peat track over black water. The reeds remember every crossing.',
    sky: ['#3a4a4c', '#7a8a64', '#4a3e2c'],
    hillFar: '#3a4a3c',
    hillNear: '#24342c',
    canopy: ['#3a5a40', '#2a4a34', '#4a6a44', '#1e3828'],
    trunk: '#2a2218',
    road: '#3a3228',
    rut: '#1a1c18',
    soil: '#161410',
    grass: '#2e4a34',
    verge: '#243c30',
    sun: '#c8c090',
    mist: 'rgba(40, 70, 52, 0.38)',
    accent: '#6a8a4a',
    hud: '#d8e0c8',
    card: '#3d5a45',
  },
  {
    id: 'transylvania',
    kind: 'vampire',
    place: 'Transylvanian Lane',
    foe: 'Vampires',
    blurb: 'A moonlit cart-track between black pines. The night has teeth.',
    sky: ['#080910', '#16101c', '#2a1820'],
    hillFar: '#0c1016',
    hillNear: '#12161c',
    canopy: ['#152018', '#0e1612', '#1c2a1c', '#101810'],
    trunk: '#1a1410',
    road: '#4a4238',
    rut: '#2a241c',
    soil: '#16130f',
    grass: '#1e2a1c',
    verge: '#243224',
    sun: '#f0e6c8',
    mist: 'rgba(28, 12, 32, 0.4)',
    accent: '#8b1e2d',
    hud: '#e8dcc8',
    card: '#6b2b3a',
  },
  {
    id: 'desert',
    kind: 'mummy',
    place: 'Desert Wadi',
    foe: 'Mummies',
    blurb: 'Heat-shimmer and linen. Something older than the sand wants out.',
    sky: ['#4a88c4', '#f6d48a', '#e8b060'],
    hillFar: '#e0c088',
    hillNear: '#c9a66a',
    canopy: ['#3d6b45', '#2f5538', '#5a7a40'],
    trunk: '#5a4030',
    road: '#d4b07a',
    rut: '#b08a52',
    soil: '#c9a56a',
    grass: '#d2b078',
    verge: '#c4a060',
    sun: '#fff4c4',
    mist: 'rgba(255, 210, 140, 0.2)',
    accent: '#c47a2a',
    hud: '#fff6e4',
    card: '#c9a227',
  },
  {
    id: 'quarry',
    kind: 'ghoul',
    place: 'Bone Quarry',
    foe: 'Ghouls',
    blurb: 'Chalk walls and rusted rails. Something pale still digs.',
    sky: ['#6a7480', '#c8b8a0', '#a07850'],
    hillFar: '#c4b8a4',
    hillNear: '#a89880',
    canopy: ['#b8a888', '#9a8a70', '#c4b49c', '#8a7a62'],
    trunk: '#6a4030',
    road: '#b8a888',
    rut: '#8a7a62',
    soil: '#d4c8b0',
    grass: '#c4b490',
    verge: '#9a8a70',
    sun: '#fff4d8',
    mist: 'rgba(220, 210, 190, 0.22)',
    accent: '#a05030',
    hud: '#f4ead8',
    card: '#a87848',
  },
];

export function biomeFor(levelIndex) {
  const i = ((levelIndex % BIOMES.length) + BIOMES.length) % BIOMES.length;
  return BIOMES[i];
}

export function biomeFromSeed(seed) {
  return BIOMES[(seed >>> 0) % BIOMES.length];
}

export function palette(kind) {
  if (kind === 'mummy') {
    return {
      skin: '#efe4c4',
      wrap: '#d4c08a',
      wrapHi: '#efe4c4',
      gap: '#5a4030',
      cloth: '#c4b07a',
      accent: '#5a4030',
      gold: '#e0b84a',
      eye: '#1a100c',
      ink: '#2a1c10',
    };
  }
  if (kind === 'vampire') {
    return {
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
    };
  }
  if (kind === 'drowned') {
    return {
      skin: '#6a7a68',
      cloth: '#24342c',
      rot: '#3a4a38',
      bone: '#a8b090',
      gum: '#4a3030',
      accent: '#3a4a40',
      pant: '#1e2820',
      eye: '#c8d4a0',
      ink: '#0c100e',
    };
  }
  if (kind === 'ghoul') {
    return {
      skin: '#e8dcc8',
      cloth: '#6a4030',
      rot: '#c4b8a4',
      bone: '#f0e8d8',
      gum: '#6a3030',
      accent: '#a05030',
      pant: '#4a3028',
      eye: '#2a1810',
      ink: '#1c1410',
    };
  }
  return {
    skin: '#8a9a62',
    cloth: '#4a3a32',
    rot: '#5a6a40',
    bone: '#cfc3a4',
    gum: '#7a3030',
    accent: '#3a342c',
    pant: '#3a342c',
    eye: '#c8d45a',
    ink: '#16140e',
  };
}
