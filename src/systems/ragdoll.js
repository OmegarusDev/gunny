import { GRAVITY, HIT_IMPULSE, RAGDOLL_FREEZE_SPEED, MAX_FROZEN } from '../config.js';
import { poseEnemy, ragdollLinks, ragdollNodesFromPose } from '../figure.js';
import { ZONE_NODE } from './impulse.js';

export function spawnRagdoll(enemy, hit, rng = Math.random) {
  const pose = poseEnemy(enemy);
  const nodes = ragdollNodesFromPose(pose);
  const links = ragdollLinks(nodes);
  const nx = hit.nx || 0;
  const ny = hit.ny || 0;
  const energy = hit.energy || 1;
  const kick = energy * HIT_IMPULSE.ragdollKick;
  const hitId = ZONE_NODE[hit.zone] || 'rib';
  const hitN = nodes.find((n) => n.id === hitId) || nodes.find((n) => n.id === 'rib');

  for (const n of nodes) {
    const dist = Math.hypot(n.x - hitN.x, n.y - hitN.y);
    const falloff = Math.min(1, 52 / (dist + 14));
    const m = n.mass || 1;
    n.x += nx * kick * falloff / m + (rng() - 0.5) * 1.5;
    n.y += ny * kick * falloff / m - 1.6 * falloff;
  }
  if (hitN) {
    const m = hitN.mass || 1;
    hitN.x += nx * kick * 0.55 / m;
    hitN.y += ny * kick * 0.55 / m;
    const px = -ny;
    const py = nx;
    hitN.x += px * kick * 0.4 / m;
    hitN.y += py * kick * 0.4 / m;
  }

  if (enemy.severedHead) {
    const head = nodes.find((n) => n.id === 'head');
    if (head) {
      const m = head.mass || 1;
      head.x += nx * kick * 0.8 / m;
      head.y -= 8;
    }
    const neck = links.find((l) => {
      const a = nodes[l.a];
      const b = nodes[l.b];
      return a.id === 'head' || b.id === 'head';
    });
    if (neck) neck.len += 8;
  }

  return {
    nodes,
    links,
    frozen: false,
    age: 0,
    friction: 0.9,
    kind: enemy.kind || 'zombie',
    severedHead: !!enemy.severedHead,
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
    }
    for (let k = 0; k < 6; k++) {
      for (const link of rag.links) {
        const a = rag.nodes[link.a];
        const b = rag.nodes[link.b];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.0001;
        const invA = 1 / (a.mass || 1);
        const invB = 1 / (b.mass || 1);
        const inv = invA + invB;
        const corr = (d - link.len) / d;
        a.x += dx * corr * (invA / inv);
        a.y += dy * corr * (invA / inv);
        b.x -= dx * corr * (invB / inv);
        b.y -= dy * corr * (invB / inv);
      }
    }
    for (const n of rag.nodes) {
      const ground = run.terrain.height(n.x);
      if (n.y > ground) {
        const vx = n.x - n.ox;
        n.y = ground;
        n.oy = n.y;
        n.ox = n.x - vx * 0.7;
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
        kind: rag.kind,
        severedHead: rag.severedHead,
        nodes: rag.nodes.map((n) => ({ id: n.id, x: n.x, y: n.y })),
      });
      if (run.frozenCorpses.length > MAX_FROZEN) run.frozenCorpses.shift();
    }
  }
  run.ragdolls = run.ragdolls.filter((r) => !r.frozen && r.age < 6);
}
