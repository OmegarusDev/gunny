export function spawnGibs(x, y, ix, iy, count = 10) {
  const gibs = [];
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = 80 + Math.random() * 280;
    const verts = [];
    const s = 3 + Math.random() * 6;
    const n = 3 + Math.floor(Math.random() * 3);
    for (let v = 0; v < n; v++) {
      const a = (v / n) * Math.PI * 2;
      verts.push({ x: Math.cos(a) * s, y: Math.sin(a) * s * 0.7 });
    }
    gibs.push({
      x,
      y,
      vx: Math.cos(ang) * spd + ix * 40,
      vy: Math.sin(ang) * spd - 80 + iy * 40,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 8,
      verts,
      life: 0.9 + Math.random() * 0.6,
    });
  }
  return gibs;
}

export function spawnBurst(x, y, count = 12) {
  const parts = [];
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = 40 + Math.random() * 180;
    parts.push({
      x,
      y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      life: 0.28 + Math.random() * 0.2,
      max: 0.48,
      r: 1.5 + Math.random() * 2,
    });
  }
  return parts;
}

export function stepGibs(run, dt) {
  const g = 980;
  for (const gib of run.gibs) {
    gib.vy += g * dt;
    gib.x += gib.vx * dt;
    gib.y += gib.vy * dt;
    gib.rot += gib.vr * dt;
    gib.life -= dt;
    const ground = run.terrain.height(gib.x);
    if (gib.y > ground) {
      gib.y = ground;
      gib.vy *= -0.2;
      gib.vx *= 0.7;
    }
  }
  run.gibs = run.gibs.filter((g) => g.life > 0);

  for (const p of run.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 220 * dt;
    p.life -= dt;
  }
  run.particles = run.particles.filter((p) => p.life > 0);

  for (const c of run.callouts) {
    c.y -= 28 * dt;
    c.life -= dt;
  }
  run.callouts = run.callouts.filter((c) => c.life > 0);

  for (const im of run.impacts) im.life -= dt;
  run.impacts = run.impacts.filter((i) => i.life > 0);
}
