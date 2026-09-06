import { GRAVITY, RAGDOLL_FREEZE_SPEED, MAX_FROZEN } from '../config.js';
import { limbCircles } from '../entities/enemy.js';

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function spawnRagdoll(enemy, ix, iy, terrain) {
  const c = limbCircles(enemy);
  const nodes = [
    { id: 'head', x: c.head.x, y: c.head.y, ox: c.head.x, oy: c.head.y },
    { id: 'upper', x: c.upper.x, y: c.upper.y, ox: c.upper.x, oy: c.upper.y },
    { id: 'lower', x: c.lower.x, y: c.lower.y, ox: c.lower.x, oy: c.lower.y },
    { id: 'lLeg', x: c.lLeg.x, y: c.lLeg.y, ox: c.lLeg.x, oy: c.lLeg.y },
    { id: 'rLeg', x: c.rLeg.x, y: c.rLeg.y, ox: c.rLeg.x, oy: c.rLeg.y },
  ];
  const links = [
    [0, 1],
    [1, 2],
    [2, 3],
    [2, 4],
  ].map(([a, b]) => ({ a, b, len: dist(nodes[a], nodes[b]) }));

  for (const n of nodes) {
    n.x += ix * 0.04 + (Math.random() - 0.5) * 4;
    n.y += iy * 0.04 - 2;
  }
  if (enemy.severedHead) {
    nodes[0].x += ix * 0.08;
    nodes[0].y -= 10;
    links[0].len += 8;
  }

  return {
    nodes,
    links,
    frozen: false,
    age: 0,
    friction: 0.88,
    kind: enemy.kind || 'zombie',
  };
}

export function stepRagdolls(run, dt) {
  for (const rag of run.ragdolls) {
    if (rag.frozen) continue;
    rag.age += dt;
    const g = GRAVITY * dt * dt;
    for (const n of rag.nodes) {
      const vx = n.x - n.ox;
      const vy = n.y - n.oy;
      n.ox = n.x;
      n.oy = n.y;
      n.x += vx * rag.friction;
      n.y += vy * rag.friction + g;
      const ground = run.terrain.height(n.x);
      if (n.y > ground) {
        n.y = ground;
        n.oy = n.y + vy * 0.25;
      }
    }
    for (let k = 0; k < 3; k++) {
      for (const link of rag.links) {
        const a = rag.nodes[link.a];
        const b = rag.nodes[link.b];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.0001;
        const diff = (d - link.len) / d / 2;
        a.x += dx * diff;
        a.y += dy * diff;
        b.x -= dx * diff;
        b.y -= dy * diff;
      }
    }
    let maxV = 0;
    let grounded = 0;
    for (const n of rag.nodes) {
      const v = Math.hypot(n.x - n.ox, n.y - n.oy);
      if (v > maxV) maxV = v;
      if (n.y >= run.terrain.height(n.x) - 1.2) grounded += 1;
    }
    if (grounded >= 3 && maxV < RAGDOLL_FREEZE_SPEED && rag.age > 0.25) {
      rag.frozen = true;
      run.frozenCorpses.push({
        points: rag.nodes.map((n) => ({ x: n.x, y: n.y })),
      });
      if (run.frozenCorpses.length > MAX_FROZEN) run.frozenCorpses.shift();
    }
  }
  run.ragdolls = run.ragdolls.filter((r) => !r.frozen && r.age < 6);
}
