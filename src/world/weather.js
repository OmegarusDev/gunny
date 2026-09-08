import { randRange } from '../engine/rng.js';

export function createWeather(rng) {
  const ang = randRange(rng, -0.35, 0.35);
  const mag = randRange(rng, 8, 28);
  return {
    windX: Math.cos(ang) * mag,
    windY: Math.sin(ang) * mag * 0.35,
  };
}
