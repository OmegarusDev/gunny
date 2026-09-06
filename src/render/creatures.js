import { BODY_SCALE } from '../config.js';
import { palette } from '../data/biomes.js';
import { limbCircles } from '../entities/enemy.js';

export function drawSurvivor(ctx, player, sx) {
  const s = BODY_SCALE;
  const stride = Math.sin(-player.worldX * 0.14);
  ctx.save();
  ctx.translate(sx, player.y);
  ctx.scale(s, s);
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#2c3540';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-4, -8);
  ctx.lineTo(-13 - stride * 6, 2);
  ctx.moveTo(5, -8);
  ctx.lineTo(10 - stride * 4, 2);
  ctx.stroke();
  ctx.fillStyle = '#3a4552';
  ctx.fillRect(-8, -12, 16, 10);
  ctx.fillStyle = '#5a3a28';
  ctx.fillRect(-10, -36 + 2, 20, 20);
  ctx.fillStyle = '#c44536';
  ctx.fillRect(-10, -36 + 18, 20, 3);
  ctx.fillStyle = '#e0b892';
  ctx.beginPath();
  ctx.arc(-3, -36 - 6, 6.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2a2018';
  ctx.beginPath();
  ctx.arc(-4, -36 - 8, 5.5, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(7, -26);
  ctx.rotate(player.aimAngle);
  ctx.strokeStyle = '#6b4424';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-4, 0);
  ctx.lineTo(18, 0);
  ctx.stroke();
  ctx.strokeStyle = '#c8c4bc';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(16, 0);
  ctx.lineTo(34, 0);
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

export function drawCreature(ctx, enemy, w2s) {
  const s = BODY_SCALE;
  const c = limbCircles(enemy);
  const kind = enemy.kind || 'zombie';
  const pal = palette(kind);
  const head = w2s(c.head.x, c.head.y);
  const upper = w2s(c.upper.x, c.upper.y);
  const lower = w2s(c.lower.x, c.lower.y);
  const lLeg = w2s(c.lLeg.x, c.lLeg.y);
  const rLeg = w2s(c.rLeg.x, c.rLeg.y);

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = pal.cloth || pal.wrap || '#444';
  ctx.lineWidth = 6 * s;
  ctx.beginPath();
  ctx.moveTo(upper.x, upper.y);
  ctx.lineTo(lower.x, lower.y);
  ctx.lineTo(lLeg.x, lLeg.y);
  ctx.moveTo(lower.x, lower.y);
  ctx.lineTo(rLeg.x, rLeg.y);
  ctx.stroke();

  if (kind === 'vampire' && !enemy.crawling) {
    ctx.fillStyle = pal.cape;
    ctx.beginPath();
    ctx.moveTo(upper.x + 2 * s, upper.y - 6 * s);
    ctx.lineTo(upper.x + 28 * s, lower.y + 10 * s);
    ctx.lineTo(upper.x + 8 * s, lower.y + 16 * s);
    ctx.lineTo(upper.x - 4 * s, lower.y + 6 * s);
    ctx.closePath();
    ctx.fill();
  }

  if (!enemy.crawling) {
    ctx.strokeStyle = pal.skin;
    ctx.lineWidth = 3.5 * s;
    ctx.beginPath();
    if (kind === 'zombie') {
      ctx.moveTo(upper.x, upper.y);
      ctx.lineTo(upper.x - 20 * s, upper.y + 2 * s);
      ctx.moveTo(upper.x, upper.y + 4 * s);
      ctx.lineTo(upper.x - 14 * s, upper.y + 10 * s);
    } else if (kind === 'mummy') {
      ctx.moveTo(upper.x - 4 * s, upper.y);
      ctx.lineTo(upper.x - 16 * s, upper.y + 8 * s);
      ctx.moveTo(upper.x + 4 * s, upper.y);
      ctx.lineTo(upper.x + 12 * s, upper.y + 10 * s);
    } else {
      ctx.moveTo(upper.x, upper.y);
      ctx.lineTo(upper.x - 12 * s, upper.y + 12 * s);
    }
    ctx.stroke();
  }

  ctx.fillStyle = pal.cloth || pal.wrap;
  ctx.beginPath();
  ctx.arc(upper.x, upper.y, c.upper.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pal.rot || pal.gap || pal.cloth;
  ctx.beginPath();
  ctx.arc(lower.x, lower.y, c.lower.r * 0.9, 0, Math.PI * 2);
  ctx.fill();

  if (kind === 'mummy') {
    ctx.strokeStyle = pal.gap;
    ctx.lineWidth = 1.2 * s;
    for (let i = -7; i <= 7; i += 3) {
      ctx.beginPath();
      ctx.moveTo(upper.x - 9 * s, upper.y + i * s);
      ctx.lineTo(upper.x + 9 * s, upper.y + (i + 1) * s);
      ctx.stroke();
    }
    ctx.fillStyle = pal.accent;
    ctx.fillRect(upper.x - 8 * s, upper.y - c.upper.r - 1 * s, 16 * s, 3 * s);
  }

  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.arc(head.x + (kind === 'zombie' ? -2 * s : 0), head.y, c.head.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = pal.eye;
  ctx.beginPath();
  ctx.arc(head.x - 2 * s, head.y, 1.5 * s, 0, Math.PI * 2);
  ctx.arc(head.x + 2.4 * s, head.y, 1.5 * s, 0, Math.PI * 2);
  ctx.fill();

  if (kind === 'vampire') {
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.arc(head.x, head.y - 2 * s, c.head.r * 0.9, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pal.eye;
    ctx.beginPath();
    ctx.arc(head.x - 2 * s, head.y, 1.6 * s, 0, Math.PI * 2);
    ctx.arc(head.x + 2.5 * s, head.y, 1.6 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f4f0ea';
    ctx.beginPath();
    ctx.moveTo(head.x - 1.5 * s, head.y + 3 * s);
    ctx.lineTo(head.x - 0.4 * s, head.y + 7 * s);
    ctx.lineTo(head.x + 0.4 * s, head.y + 3 * s);
    ctx.moveTo(head.x + 1.2 * s, head.y + 3 * s);
    ctx.lineTo(head.x + 2.2 * s, head.y + 7 * s);
    ctx.lineTo(head.x + 3 * s, head.y + 3 * s);
    ctx.fill();
  }
  if (kind === 'zombie') {
    ctx.fillStyle = pal.accent;
    ctx.beginPath();
    ctx.arc(head.x - 3 * s, head.y + 2 * s, 1.6 * s, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawRagdollBody(ctx, rag, w2s) {
  const s = BODY_SCALE;
  const pal = palette(rag.kind || 'zombie');
  ctx.strokeStyle = pal.cloth || pal.wrap || '#666';
  ctx.lineWidth = 3 * s;
  ctx.beginPath();
  for (const link of rag.links) {
    const a = rag.nodes[link.a];
    const b = rag.nodes[link.b];
    const pa = w2s(a.x, a.y);
    const pb = w2s(b.x, b.y);
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
  }
  ctx.stroke();
  for (const n of rag.nodes) {
    const p = w2s(n.x, n.y);
    ctx.fillStyle = n.id === 'head' ? pal.skin : pal.cloth || pal.wrap;
    ctx.beginPath();
    ctx.arc(p.x, p.y, (n.id === 'head' ? 5 : 4) * s, 0, Math.PI * 2);
    ctx.fill();
  }
}
