export const MAX_SMOKE = 72;

export function emitBarrelSmoke(run, x, y, ang, rng, kind = 'idle') {
  if (!run.smoke) run.smoke = [];
  const shot = kind === 'shot';
  const n = shot ? 7 : 1;
  const back = ang + Math.PI;
  for (let i = 0; i < n; i++) {
    const drift = back + (rng() - 0.5) * (shot ? 0.85 : 0.4);
    const spd = (shot ? 22 : 8) + rng() * (shot ? 42 : 14);
    const along = rng() * (shot ? 12 : 5);
    run.smoke.push({
      x: x + Math.cos(back) * along + (rng() - 0.5) * 5,
      y: y + Math.sin(back) * along + (rng() - 0.5) * 4,
      vx: Math.cos(drift) * spd + (rng() - 0.5) * 10,
      vy: Math.sin(drift) * spd - 12 - rng() * 20,
      life: (shot ? 0.85 : 1.05) + rng() * 0.55,
      max: 1.6,
      r: (shot ? 5.5 : 7) + rng() * 7,
      rot: rng() * Math.PI,
      spin: (rng() - 0.5) * 1.4,
      warm: shot ? 0.45 + rng() * 0.4 : 0.2 + rng() * 0.25,
    });
  }
  if (run.smoke.length > MAX_SMOKE) run.smoke.splice(0, run.smoke.length - MAX_SMOKE);
}

export function stepSmoke(run, dt) {
  if (!run.smoke?.length) return;
  for (const s of run.smoke) {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.vx *= Math.exp(-dt * 1.25);
    s.vy -= 18 * dt;
    s.r += 16 * dt;
    s.rot += (s.spin || 0) * dt;
    s.life -= dt;
  }
  run.smoke = run.smoke.filter((s) => s.life > 0);
}
