function fade(t) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function hash(n) {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

export function valueNoise1D(x, seed = 0) {
  const i = Math.floor(x);
  const f = fade(x - i);
  const a = hash(i + seed);
  const b = hash(i + 1 + seed);
  return lerp(a, b, f) * 2 - 1;
}
