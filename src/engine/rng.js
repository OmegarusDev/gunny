export function sfc32(a, b, c, d) {
  return function rng() {
    a |= 0;
    b |= 0;
    c |= 0;
    d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

export function seedFromUint32(n) {
  const x = n >>> 0;
  return sfc32(x, x ^ 0x9e3779b9, x ^ 0x243f6a88, x ^ 0xb7e15162);
}

export function seedForLevel(levelIndex) {
  const n = (Math.imul(levelIndex + 1, 2654435761) ^ 0xcafe1234) >>> 0;
  return { seed: n, rng: seedFromUint32(n) };
}

export function randomSeed() {
  const n = (Math.random() * 0xffffffff) >>> 0;
  return { seed: n, rng: seedFromUint32(n) };
}

export function randRange(rng, a, b) {
  return a + rng() * (b - a);
}
