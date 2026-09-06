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
      skin: '#e8d9b0',
      wrap: '#d4c08a',
      gap: '#5a4030',
      cloth: '#c4b07a',
      accent: '#c9a227',
      eye: '#2a1810',
    };
  }
  if (kind === 'vampire') {
    return {
      skin: '#f0e4e0',
      hair: '#140c0c',
      cloth: '#1a1214',
      cape: '#5a1424',
      accent: '#8b1e2d',
      eye: '#c44536',
    };
  }
  return {
    skin: '#8a9a62',
    cloth: '#4a3a32',
    rot: '#5a6a40',
    accent: '#6a3028',
    eye: '#1a140c',
  };
}
