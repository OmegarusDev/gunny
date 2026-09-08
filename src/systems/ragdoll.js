import { GRAVITY, RAGDOLL_FREEZE_SPEED, MAX_FROZEN } from '../config.js';
import { poseEnemy, ragdollLinks, ragdollNodesFromPose } from '../figure.js';

export function spawnRagdoll(enemy, ix, iy) {
  const pose = poseEnemy(enemy);
  const nodes = ragdollNodesFromPose(pose);
  const links = ragdollLinks(nodes);

  for (const n of nodes) {
    n.x += ix * 0.04 + (Math.random() - 0.5) * 4;
    n.y += iy * 0.04 - 2;
    n.ox = n.x;
    n.oy = n.y;
  }
  if (enemy.severedHead) {
    const head = nodes.find((n) => n.id === 'head');
    if (head) {
      head.x += ix * 0.08;
      head.y -= 10;
      head.ox = head.x;
      head.oy = head.y;
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
    friction: 0.88,
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
        kind: rag.kind,
        severedHead: rag.severedHead,
        nodes: rag.nodes.map((n) => ({ id: n.id, x: n.x, y: n.y })),
      });
      if (run.frozenCorpses.length > MAX_FROZEN) run.frozenCorpses.shift();
    }
  }
  run.ragdolls = run.ragdolls.filter((r) => !r.frozen && r.age < 6);
}
