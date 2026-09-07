import { BODY_SCALE } from '../config.js';
import { palette } from '../data/biomes.js';
import { limbCircles } from '../entities/enemy.js';
import { contactShadow, shadeHex, volumeEllipse } from './fx.js';

function oval(ctx, x, y, rx, ry, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function poly(ctx, pts, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fill();
}

function capsule(ctx, x1, y1, x2, y2, w, hex) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = shadeHex(hex, -0.32);
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.strokeStyle = hex;
  ctx.lineWidth = w * 0.78;
  ctx.beginPath();
  ctx.moveTo(x1 + w * 0.06, y1 - w * 0.08);
  ctx.lineTo(x2 + w * 0.06, y2 - w * 0.08);
  ctx.stroke();
  ctx.strokeStyle = shadeHex(hex, 0.22);
  ctx.lineWidth = Math.max(0.9, w * 0.28);
  ctx.beginPath();
  ctx.moveTo(x1 + w * 0.16, y1 - w * 0.16);
  ctx.lineTo(x2 + w * 0.16, y2 - w * 0.16);
  ctx.stroke();
}

function headLight(ctx, x, y, rx, ry, hex) {
  oval(ctx, x - rx * 0.12, y + ry * 0.08, rx, ry, shadeHex(hex, -0.28));
  oval(ctx, x, y, rx * 0.94, ry * 0.92, hex);
  oval(ctx, x + rx * 0.28, y - ry * 0.28, rx * 0.42, ry * 0.34, shadeHex(hex, 0.24));
}

function boot(ctx, x, y, dir, hex) {
  oval(ctx, x + dir * 1.6, y + 1.15, 5.8, 2.15, shadeHex(hex, -0.35));
  oval(ctx, x + dir * 2.2, y + 0.55, 5.2, 1.85, hex);
  oval(ctx, x + dir * 4.4, y + 0.15, 2.8, 1.25, shadeHex(hex, 0.12));
  ctx.fillStyle = '#121416';
  ctx.fillRect(x - 2.2, y + 1.55, 5.4, 1.05);
}

function mitt(ctx, x, y, skin, s = 1, dir = 1) {
  oval(ctx, x, y, 2.45 * s, 2.2 * s, shadeHex(skin, -0.15));
  oval(ctx, x + 0.55 * s * dir, y - 0.55 * s, 1.55 * s, 1.35 * s, shadeHex(skin, 0.12));
  ctx.strokeStyle = shadeHex(skin, -0.08);
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.05 * s;
  ctx.beginPath();
  ctx.moveTo(x + 1.4 * s * dir, y - 0.5 * s);
  ctx.lineTo(x + 3.2 * s * dir, y - 1.15 * s);
  ctx.moveTo(x + 1.55 * s * dir, y + 0.15 * s);
  ctx.lineTo(x + 3.45 * s * dir, y + 0.05 * s);
  ctx.moveTo(x + 1.25 * s * dir, y + 0.9 * s);
  ctx.lineTo(x + 2.9 * s * dir, y + 1.35 * s);
  ctx.stroke();
}

function claw(ctx, x, y, skin, s, dir = -1) {
  oval(ctx, x, y, 2.3 * s, 2.1 * s, shadeHex(skin, -0.1));
  ctx.strokeStyle = shadeHex(skin, 0.05);
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.05 * s;
  ctx.beginPath();
  ctx.moveTo(x + 0.8 * s * dir, y - 0.8 * s);
  ctx.lineTo(x + 4.6 * s * dir, y - 2.2 * s);
  ctx.moveTo(x + 1.1 * s * dir, y);
  ctx.lineTo(x + 5.4 * s * dir, y - 0.2 * s);
  ctx.moveTo(x + 0.8 * s * dir, y + 0.9 * s);
  ctx.lineTo(x + 4.2 * s * dir, y + 1.8 * s);
  ctx.stroke();
  ctx.strokeStyle = '#d8d0c4';
  ctx.lineWidth = 0.55 * s;
  ctx.beginPath();
  ctx.moveTo(x + 3.4 * s * dir, y - 1.7 * s);
  ctx.lineTo(x + 5.1 * s * dir, y - 2.4 * s);
  ctx.moveTo(x + 3.8 * s * dir, y - 0.15 * s);
  ctx.lineTo(x + 5.8 * s * dir, y - 0.25 * s);
  ctx.stroke();
}

function eyeAlive(ctx, x, y, rx, ry, iris) {
  oval(ctx, x, y, rx, ry, '#f3ead8');
  oval(ctx, x + rx * 0.12, y + ry * 0.1, rx * 0.52, ry * 0.58, iris);
  oval(ctx, x + rx * 0.08, y + ry * 0.14, rx * 0.22, ry * 0.24, '#1a120c');
  oval(ctx, x + rx * 0.22, y - ry * 0.22, rx * 0.18, ry * 0.16, '#fff');
}

export function drawSurvivor(ctx, player, sx) {
  const walk = Math.sin(-player.worldX * 0.14);
  const walkB = Math.cos(-player.worldX * 0.14);
  ctx.save();
  ctx.translate(sx, player.y);
  ctx.scale(BODY_SCALE, BODY_SCALE);
  ctx.lineJoin = 'round';
  contactShadow(ctx, 0.5, 2.6, 15, 3.8, 0.36);

  const backX = -8.5 - walk * 7.2;
  const frontX = 6.4 - walk * 4.2;
  boot(ctx, backX, 0.2, -1, '#1c222a');
  capsule(ctx, -3.2, -12.2, backX - 1, -1.2, 5.6, '#2a3340');
  boot(ctx, frontX, 0.15, 1, '#252c36');
  capsule(ctx, 2.8, -12.4, frontX + 1.2, -1.1, 5.7, '#3a4654');
  oval(ctx, -0.4, -13.2, 7.8, 4.8, '#2c3542');
  oval(ctx, 2.2, -13.6, 3.4, 2.4, '#4a5666');

  capsule(ctx, -6.5, -27, -9.5 + walkB, -16, 3.6, '#e0b892');
  mitt(ctx, -10.2 + walkB * 0.6, -15.2, '#e0b892', 0.92, -1);

  poly(
    ctx,
    [
      [-11.5, -14],
      [-13, -24],
      [-11.2, -34.5],
      [-3, -37],
      [6.5, -36],
      [11.2, -32],
      [12.2, -22],
      [10.4, -13.6],
    ],
    '#6b3d28',
  );
  poly(
    ctx,
    [
      [-12.2, -24],
      [-11.2, -34],
      [-4, -36],
      [-2, -16],
      [-8, -14.5],
    ],
    '#4a2818',
  );
  poly(
    ctx,
    [
      [1.5, -35.5],
      [6.5, -36],
      [11, -32],
      [12, -22],
      [10, -14.2],
      [4.2, -14.8],
    ],
    '#8a5234',
  );
  poly(ctx, [
    [6.2, -33],
    [9.4, -31],
    [10.6, -20],
    [8.2, -19],
  ], '#c08a62');
  poly(ctx, [
    [-4.5, -36.5],
    [-7.2, -40],
    [-1.2, -39.2],
    [1.6, -36],
    [-1.4, -35.2],
  ], '#5a3220');
  poly(ctx, [
    [1.2, -35.8],
    [4.8, -40.2],
    [8.4, -37.6],
    [7.2, -34.4],
  ], '#7a4a30');
  ctx.fillStyle = '#c44536';
  ctx.beginPath();
  ctx.moveTo(-8.4, -19.4);
  ctx.quadraticCurveTo(0, -16.6, 9.2, -18.4);
  ctx.lineTo(9, -16.2);
  ctx.quadraticCurveTo(0, -14.6, -8.2, -17.2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2a1c12';
  ctx.fillRect(-8.6, -16.2, 17.4, 2.1);
  oval(ctx, -1.2, -15.1, 1.05, 1.05, '#c9a227');
  ctx.strokeStyle = '#3a2418';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(3.4, -30);
  ctx.lineTo(4.6, -18);
  ctx.stroke();
  oval(ctx, 7.6, -24.5, 1.6, 2.1, '#5a3220');
  oval(ctx, 7.6, -24.5, 0.7, 0.9, '#2a1810');

  oval(ctx, -1.4, -37.6, 2.4, 2.8, '#c9a07a');
  headLight(ctx, -2.2, -43.2, 7.1, 7.5, '#e2b894');
  oval(ctx, -7.6, -42.4, 2.1, 2.6, '#c9a07a');
  oval(ctx, -7.4, -42.6, 1.15, 1.5, '#e2b894');
  poly(
    ctx,
    [
      [-9.6, -43],
      [-8, -49.2],
      [-2.2, -51.4],
      [4.4, -49.6],
      [6.2, -45.5],
      [4.8, -43.8],
      [-3, -46.6],
      [-8.8, -44.2],
    ],
    '#2a2118',
  );
  poly(ctx, [
    [-8.2, -46],
    [-4.2, -50.4],
    [1.6, -49.2],
    [-1.4, -45.8],
  ], '#3a2c20');
  oval(ctx, 1.6, -47.2, 2.4, 1.5, '#1a140e');
  ctx.fillStyle = '#2c2218';
  ctx.beginPath();
  ctx.moveTo(-1.2, -47.4);
  ctx.quadraticCurveTo(4.2, -46.2, 5.4, -43.4);
  ctx.lineTo(3.6, -43);
  ctx.quadraticCurveTo(2.2, -45.4, -0.6, -45.8);
  ctx.fill();
  eyeAlive(ctx, 2.55, -43.05, 1.55, 1.7, '#3a5a48');
  poly(ctx, [
    [3.5, -41.2],
    [6.1, -40.15],
    [3.6, -39.55],
  ], '#c9a07a');
  ctx.strokeStyle = '#b08868';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(2.2, -39.4);
  ctx.quadraticCurveTo(4.4, -38.6, 2.6, -38.4);
  ctx.stroke();
  oval(ctx, 0.2, -40.6, 1.7, 1.1, 'rgba(90,40,28,0.16)');

  ctx.save();
  ctx.translate(7.1, -26.2);
  ctx.rotate(player.aimAngle);
  mitt(ctx, 1.4, 2.6, '#e0b892', 0.95, 1);
  poly(
    ctx,
    [
      [-12.5, -2.6],
      [-3.2, -3.1],
      [2.4, 0.6],
      [1.6, 4.4],
      [-4.2, 5.2],
      [-13.2, 2.8],
    ],
    '#6a4228',
  );
  poly(ctx, [
    [-11.4, -1.6],
    [-4, -1.9],
    [-3.2, 1.4],
    [-11.6, 1.6],
  ], '#8a5a34');
  oval(ctx, -8.4, 1.1, 3.4, 2.4, '#4a2e1c');
  ctx.fillStyle = '#2e261c';
  ctx.fillRect(-1.2, -2.7, 13.2, 5.4);
  ctx.fillStyle = '#4a4034';
  ctx.fillRect(-0.4, -2.1, 11.6, 1.5);
  ctx.fillStyle = '#1a1612';
  ctx.fillRect(6.6, 2.4, 3.4, 5.2);
  ctx.fillStyle = '#3a3228';
  ctx.fillRect(6.9, 2.6, 2.8, 1.1);
  ctx.fillStyle = '#b8b4ac';
  ctx.fillRect(11.4, -1.55, 23.2, 2.7);
  ctx.fillStyle = '#f0ece4';
  ctx.fillRect(11.4, -1.7, 23.2, 0.7);
  ctx.fillStyle = '#6a6660';
  ctx.fillRect(14.2, -2.35, 8.4, 0.7);
  ctx.fillRect(33.2, -2.55, 2.6, 4.6);
  ctx.fillStyle = '#d8d4cc';
  ctx.fillRect(8.6, -3.35, 1.6, 1.7);
  mitt(ctx, 15.4, 3.15, '#e0b892', 0.9, 1);
  ctx.restore();

  oval(ctx, 6.1, -24.2 + walkB * 0.35, 2.15, 2.15, '#e0b892');
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
  const gait = Math.sin(-enemy.worldX * 0.11);
  const id = enemy.id || 1;

  contactShadow(
    ctx,
    (lLeg.x + rLeg.x) * 0.5,
    Math.max(lLeg.y, rLeg.y) + 3.8 * s,
    17 * s,
    4.8 * s,
    0.32,
  );
  if (enemy.crawling) {
    drawCrawl(ctx, pal, kind, head, upper, lower, lLeg, rLeg, s);
    return;
  }
  if (kind === 'vampire') drawVampire(ctx, pal, head, upper, lower, lLeg, rLeg, s, gait);
  else if (kind === 'mummy') drawMummy(ctx, pal, head, upper, lower, lLeg, rLeg, s, gait, id);
  else drawZombie(ctx, pal, head, upper, lower, lLeg, rLeg, s, gait, id);
}

function drawCrawl(ctx, pal, kind, head, upper, lower, lLeg, rLeg, s) {
  const cloth = pal.cloth || pal.wrap;
  capsule(ctx, upper.x, upper.y, lower.x, lower.y, 7.2 * s, cloth);
  capsule(ctx, lower.x, lower.y, lLeg.x, lLeg.y, 5.4 * s, cloth);
  capsule(ctx, lower.x, lower.y, rLeg.x, rLeg.y, 5.4 * s, cloth);
  headLight(ctx, upper.x, upper.y, 9 * s, 5.8 * s, cloth);
  headLight(ctx, lower.x, lower.y, 8 * s, 5.2 * s, cloth);
  headLight(ctx, head.x, head.y, 6.4 * s, 5.5 * s, pal.skin);
  oval(ctx, head.x - 1.6 * s, head.y, 1.4 * s, 1.4 * s, pal.eye);
  if (kind === 'zombie') oval(ctx, head.x - 1.5 * s, head.y - 0.35 * s, 0.4 * s, 0.4 * s, '#f2f0c8');
}

function torsoSack(ctx, upper, lower, s, hex, inset = 0) {
  ctx.beginPath();
  ctx.moveTo(upper.x - (11 - inset) * s, upper.y - 3 * s);
  ctx.quadraticCurveTo(upper.x - 14 * s, (upper.y + lower.y) * 0.5, lower.x - 10 * s, lower.y + 7 * s);
  ctx.quadraticCurveTo(lower.x, lower.y + 10 * s, lower.x + 9 * s, lower.y + 6 * s);
  ctx.quadraticCurveTo(upper.x + 13 * s, (upper.y + lower.y) * 0.5, upper.x + 10 * s, upper.y - 2 * s);
  ctx.quadraticCurveTo(upper.x, upper.y - 8 * s, upper.x - (11 - inset) * s, upper.y - 3 * s);
  ctx.fillStyle = hex;
  ctx.fill();
}

function drawZombie(ctx, pal, head, upper, lower, lLeg, rLeg, s, gait, id) {
  const limp = (id % 3) - 1;
  capsule(ctx, lower.x - 2.2 * s, lower.y + 2 * s, lLeg.x, lLeg.y, 6.5 * s, pal.pant || '#3a342c');
  capsule(ctx, lower.x + 2.4 * s, lower.y + 2 * s, rLeg.x, rLeg.y, 6.5 * s, shadeHex(pal.pant || '#3a342c', -0.12));
  oval(ctx, lLeg.x - 0.6 * s, lLeg.y + 3.1 * s, 4.4 * s, 2.1 * s, '#2a241c');
  oval(ctx, rLeg.x + 0.8 * s, rLeg.y + 3.1 * s, 4.4 * s, 2.1 * s, '#241e18');
  oval(ctx, rLeg.x + 2.8 * s, rLeg.y + 2.6 * s, 2.2 * s, 1.2 * s, pal.skin);

  torsoSack(ctx, upper, lower, s, shadeHex(pal.cloth, -0.18));
  torsoSack(ctx, upper, lower, s, pal.cloth, 3);
  poly(
    ctx,
    [
      [upper.x + 2 * s, upper.y - 2 * s],
      [upper.x + 10 * s, upper.y - 1 * s],
      [lower.x + 9 * s, lower.y + 6 * s],
      [lower.x + 2 * s, lower.y + 3 * s],
    ],
    shadeHex(pal.cloth, 0.16),
  );
  ctx.fillStyle = pal.rot;
  ctx.beginPath();
  ctx.moveTo(lower.x - 5.5 * s, lower.y - 1 * s);
  ctx.quadraticCurveTo(lower.x, lower.y + 2 * s, lower.x + 5 * s, lower.y);
  ctx.lineTo(lower.x + 4.2 * s, lower.y + 8.4 * s);
  ctx.quadraticCurveTo(lower.x, lower.y + 10 * s, lower.x - 4.6 * s, lower.y + 8.2 * s);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = pal.bone;
  ctx.lineWidth = 0.85 * s;
  ctx.beginPath();
  ctx.moveTo(lower.x - 3.2 * s, lower.y + 1.5 * s);
  ctx.lineTo(lower.x - 2.6 * s, lower.y + 7 * s);
  ctx.moveTo(lower.x, lower.y + 1.2 * s);
  ctx.lineTo(lower.x + 0.4 * s, lower.y + 7.2 * s);
  ctx.moveTo(lower.x + 3 * s, lower.y + 1.4 * s);
  ctx.lineTo(lower.x + 3.4 * s, lower.y + 6.8 * s);
  ctx.stroke();

  const reach = 21 * s + limp * 3.2 * s;
  const hy = upper.y + 2.4 * s + gait * 2.2 * s;
  capsule(ctx, upper.x - 2 * s, upper.y + 1 * s, upper.x - reach, hy, 4.3 * s, pal.skin);
  claw(ctx, upper.x - reach, hy, pal.skin, s, -1);
  capsule(ctx, upper.x + 2 * s, upper.y + 3 * s, upper.x - 11 * s, upper.y + 13 * s, 3.7 * s, pal.skin);
  claw(ctx, upper.x - 11 * s, upper.y + 13 * s, pal.skin, s * 0.9, -1);

  capsule(ctx, upper.x - 1 * s, upper.y - 6 * s, head.x - 1 * s, head.y + 5 * s, 3.4 * s, pal.skin);
  headLight(ctx, head.x, head.y, 7.5 * s, 7.9 * s, pal.skin);
  oval(ctx, head.x - 5.2 * s, head.y + 0.6 * s, 2.1 * s, 2.4 * s, shadeHex(pal.skin, -0.12));
  poly(
    ctx,
    [
      [head.x - 6.4 * s, head.y - 2 * s],
      [head.x - 5.2 * s, head.y - 7.6 * s],
      [head.x + 1.4 * s, head.y - 8.6 * s],
      [head.x + 6.2 * s, head.y - 5.2 * s],
      [head.x + 4.4 * s, head.y - 3.4 * s],
      [head.x - 2 * s, head.y - 5.4 * s],
    ],
    '#5a4a32',
  );
  oval(ctx, head.x - 2.8 * s, head.y - 0.5 * s, 2.3 * s, 2.5 * s, '#2a2414');
  oval(ctx, head.x + 2.7 * s, head.y + 0.5 * s, 1.9 * s, 2.1 * s, '#2a2414');
  oval(ctx, head.x - 2.6 * s, head.y - 0.35 * s, 1.55 * s, 1.7 * s, pal.eye);
  oval(ctx, head.x + 2.85 * s, head.y + 0.55 * s, 1.15 * s, 1.25 * s, pal.eye);
  oval(ctx, head.x - 2.15 * s, head.y - 0.85 * s, 0.5 * s, 0.5 * s, '#f4f0c0');
  oval(ctx, head.x + 3.15 * s, head.y + 0.2 * s, 0.35 * s, 0.35 * s, '#f4f0c0');
  poly(
    ctx,
    [
      [head.x - 1.6 * s, head.y + 2.4 * s],
      [head.x + 3.2 * s, head.y + 3.2 * s],
      [head.x + 2.4 * s, head.y + 5.6 * s],
      [head.x - 2.4 * s, head.y + 5.1 * s],
    ],
    pal.gum,
  );
  ctx.strokeStyle = pal.bone;
  ctx.lineWidth = 0.7 * s;
  ctx.beginPath();
  ctx.moveTo(head.x - 1.1 * s, head.y + 3.3 * s);
  ctx.lineTo(head.x - 0.6 * s, head.y + 5.4 * s);
  ctx.moveTo(head.x + 0.6 * s, head.y + 3.5 * s);
  ctx.lineTo(head.x + 0.9 * s, head.y + 5.6 * s);
  ctx.moveTo(head.x + 2.1 * s, head.y + 3.7 * s);
  ctx.lineTo(head.x + 2.3 * s, head.y + 5.5 * s);
  ctx.stroke();
  ctx.fillStyle = pal.accent;
  ctx.beginPath();
  ctx.ellipse(head.x + 0.2 * s, head.y + 6.2 * s, 3.6 * s, 1.7 * s, 0.12, 0, Math.PI);
  ctx.fill();
  oval(ctx, head.x - 4.8 * s, head.y + 2.4 * s, 1.9 * s, 1.5 * s, '#4a3028');
}

function wrapStroke(ctx, x1, y1, x2, y2, w, hex) {
  ctx.strokeStyle = hex;
  ctx.lineCap = 'round';
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function drawMummy(ctx, pal, head, upper, lower, lLeg, rLeg, s, gait, id) {
  const drift = ((id % 5) - 2) * 0.35 * s;
  ctx.strokeStyle = pal.wrap;
  ctx.lineWidth = 1.5 * s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(lower.x + 6 * s, lower.y + 4 * s);
  ctx.quadraticCurveTo(lower.x + 18 * s, lower.y + 12 * s, lower.x + 20 * s + gait * 4 * s, lower.y + 20 * s);
  ctx.stroke();
  ctx.strokeStyle = pal.wrapHi;
  ctx.lineWidth = 0.7 * s;
  ctx.stroke();
  ctx.strokeStyle = pal.wrap;
  ctx.lineWidth = 1.35 * s;
  ctx.beginPath();
  ctx.moveTo(upper.x + 8 * s, upper.y);
  ctx.quadraticCurveTo(upper.x + 22 * s, upper.y + 10 * s, upper.x + 15 * s, lower.y + 16 * s);
  ctx.stroke();

  capsule(ctx, lower.x - 2 * s, lower.y, lLeg.x, lLeg.y, 6.2 * s, pal.wrap);
  capsule(ctx, lower.x + 2 * s, lower.y, rLeg.x, rLeg.y, 6.2 * s, pal.wrap);
  oval(ctx, lLeg.x, lLeg.y + 3 * s, 3.8 * s, 1.8 * s, pal.gap);
  oval(ctx, rLeg.x, rLeg.y + 3 * s, 3.8 * s, 1.8 * s, pal.gap);

  torsoSack(ctx, upper, lower, s, pal.wrap);
  for (let i = -8; i <= 11; i += 2.6) {
    const y = upper.y + i * s;
    wrapStroke(ctx, upper.x - 9.5 * s, y + drift, upper.x + 9.8 * s, y + 1.3 * s + drift, 1.35 * s, pal.gap);
    wrapStroke(ctx, upper.x - 8.6 * s, y + 0.45 * s + drift, upper.x + 8.8 * s, y + 1.55 * s + drift, 0.7 * s, pal.wrapHi);
  }
  ctx.fillStyle = pal.gold || pal.accent;
  ctx.beginPath();
  ctx.moveTo(upper.x - 8.6 * s, upper.y - 6.4 * s);
  ctx.quadraticCurveTo(upper.x, upper.y - 2.2 * s, upper.x + 8.6 * s, upper.y - 6.2 * s);
  ctx.lineTo(upper.x + 7.4 * s, upper.y - 9.2 * s);
  ctx.quadraticCurveTo(upper.x, upper.y - 6.6 * s, upper.x - 7.4 * s, upper.y - 9.4 * s);
  ctx.closePath();
  ctx.fill();
  oval(ctx, upper.x, upper.y - 10.4 * s, 2.2 * s, 2.2 * s, pal.gold || pal.accent);
  oval(ctx, upper.x, upper.y - 10.4 * s, 0.9 * s, 0.9 * s, '#6a4010');

  const armDrop = 8.4 * s + gait * 2 * s;
  capsule(ctx, upper.x - 4 * s, upper.y, upper.x - 16.5 * s, upper.y + armDrop, 3.9 * s, pal.wrap);
  capsule(ctx, upper.x + 4 * s, upper.y, upper.x + 6.5 * s, upper.y + 14.5 * s, 3.6 * s, pal.wrap);
  mitt(ctx, upper.x - 16.5 * s, upper.y + armDrop, pal.skin, s * 0.85, -1);
  mitt(ctx, upper.x + 6.5 * s, upper.y + 14.5 * s, pal.skin, s * 0.8, 1);

  capsule(ctx, upper.x, upper.y - 7 * s, head.x, head.y + 5.4 * s, 3.2 * s, pal.wrap);
  headLight(ctx, head.x, head.y, 7.3 * s, 7.7 * s, pal.skin);
  wrapStroke(ctx, head.x - 6.4 * s, head.y - 1.2 * s, head.x + 6.6 * s, head.y - 0.2 * s, 1.25 * s, pal.gap);
  wrapStroke(ctx, head.x - 6.2 * s, head.y - 0.7 * s, head.x + 6.2 * s, head.y + 0.25 * s, 0.55 * s, pal.wrapHi);
  wrapStroke(ctx, head.x - 5.6 * s, head.y + 2.8 * s, head.x + 5.8 * s, head.y + 3.8 * s, 1.2 * s, pal.gap);
  oval(ctx, head.x - 2.5 * s, head.y - 0.5 * s, 1.85 * s, 2.05 * s, '#1a1008');
  oval(ctx, head.x + 2.6 * s, head.y - 0.15 * s, 1.85 * s, 2.05 * s, '#1a1008');
  oval(ctx, head.x - 2.5 * s, head.y - 0.5 * s, 0.7 * s, 0.85 * s, '#6a5010');
  oval(ctx, head.x + 2.6 * s, head.y - 0.15 * s, 0.7 * s, 0.85 * s, '#6a5010');
  oval(ctx, head.x - 2.2 * s, head.y - 0.9 * s, 0.35 * s, 0.35 * s, '#e8d070');
  oval(ctx, head.x + 2.9 * s, head.y - 0.55 * s, 0.35 * s, 0.35 * s, '#e8d070');
}

function drawVampire(ctx, pal, head, upper, lower, lLeg, rLeg, s, gait) {
  ctx.fillStyle = pal.cape;
  ctx.beginPath();
  ctx.moveTo(upper.x + 1 * s, upper.y - 10 * s);
  ctx.quadraticCurveTo(upper.x + 18 * s + gait * 2 * s, upper.y + 2 * s, upper.x + 28 * s + gait * 3 * s, lower.y + 12 * s);
  ctx.quadraticCurveTo(upper.x + 16 * s, lower.y + 22 * s, upper.x - 4 * s, lower.y + 10 * s);
  ctx.quadraticCurveTo(upper.x - 2 * s, upper.y + 4 * s, upper.x + 1 * s, upper.y - 10 * s);
  ctx.fill();
  ctx.fillStyle = pal.lining || '#3a0c16';
  ctx.beginPath();
  ctx.moveTo(upper.x + 3 * s, upper.y - 4 * s);
  ctx.quadraticCurveTo(upper.x + 16 * s, lower.y + 2 * s, upper.x + 20 * s, lower.y + 10 * s);
  ctx.quadraticCurveTo(upper.x + 10 * s, lower.y + 14 * s, upper.x + 2 * s, lower.y + 4 * s);
  ctx.fill();

  capsule(ctx, lower.x - 2.2 * s, lower.y, lLeg.x, lLeg.y, 5.7 * s, '#141018');
  capsule(ctx, lower.x + 2.2 * s, lower.y, rLeg.x, rLeg.y, 5.7 * s, '#141018');
  oval(ctx, lLeg.x + 0.6 * s, lLeg.y + 3.1 * s, 4.2 * s, 1.7 * s, '#0e0c10');
  oval(ctx, rLeg.x + 0.6 * s, rLeg.y + 3.1 * s, 4.2 * s, 1.7 * s, '#0e0c10');
  oval(ctx, lLeg.x + 3.2 * s, lLeg.y + 2.6 * s, 1.8 * s, 0.8 * s, '#2a1820');
  oval(ctx, rLeg.x + 3.2 * s, rLeg.y + 2.6 * s, 1.8 * s, 0.8 * s, '#2a1820');

  torsoSack(ctx, upper, lower, s, pal.cloth);
  poly(
    ctx,
    [
      [upper.x + 1 * s, upper.y - 5 * s],
      [upper.x + 11 * s, upper.y - 4 * s],
      [lower.x + 9 * s, lower.y + 7 * s],
      [lower.x + 1 * s, lower.y + 4 * s],
    ],
    shadeHex(pal.cloth, 0.18),
  );
  poly(
    ctx,
    [
      [upper.x - 2.4 * s, upper.y - 4.5 * s],
      [upper.x + 3.2 * s, upper.y - 3.8 * s],
      [upper.x + 1.4 * s, lower.y + 2.4 * s],
      [upper.x - 3.2 * s, lower.y + 2.4 * s],
    ],
    pal.shirt || '#efe6dc',
  );
  oval(ctx, upper.x - 0.4 * s, upper.y - 1.2 * s, 0.7 * s, 0.7 * s, pal.accent);
  oval(ctx, upper.x - 0.2 * s, upper.y + 2.4 * s, 0.7 * s, 0.7 * s, pal.accent);

  poly(
    ctx,
    [
      [upper.x - 7 * s, upper.y - 8 * s],
      [head.x - 8 * s, head.y + 2 * s],
      [head.x - 3 * s, head.y + 4 * s],
      [upper.x - 1 * s, upper.y - 6 * s],
    ],
    pal.cloth,
  );
  poly(
    ctx,
    [
      [upper.x + 6 * s, upper.y - 7.5 * s],
      [head.x + 8.2 * s, head.y + 1.6 * s],
      [head.x + 3 * s, head.y + 4 * s],
      [upper.x + 1.4 * s, upper.y - 6 * s],
    ],
    pal.cloth,
  );

  capsule(ctx, upper.x - 3 * s, upper.y, upper.x - 15 * s, upper.y + 11.5 * s, 3.8 * s, pal.cloth);
  mitt(ctx, upper.x - 15 * s, upper.y + 11.5 * s, pal.skin, s * 0.85, -1);

  capsule(ctx, upper.x, upper.y - 8 * s, head.x, head.y + 5.6 * s, 3.1 * s, pal.skin);
  headLight(ctx, head.x, head.y, 6.9 * s, 7.7 * s, pal.skin);
  poly(
    ctx,
    [
      [head.x, head.y - 8.8 * s],
      [head.x - 7.6 * s, head.y - 1.4 * s],
      [head.x - 5.2 * s, head.y - 5.6 * s],
      [head.x, head.y - 3.4 * s],
      [head.x + 5.2 * s, head.y - 5.6 * s],
      [head.x + 7.4 * s, head.y - 1.4 * s],
    ],
    pal.hair,
  );
  oval(ctx, head.x - 2.35 * s, head.y - 0.05 * s, 1.85 * s, 1.45 * s, '#3a1014');
  oval(ctx, head.x + 2.55 * s, head.y - 0.05 * s, 1.85 * s, 1.45 * s, '#3a1014');
  oval(ctx, head.x - 2.35 * s, head.y, 1.55 * s, 1.15 * s, pal.eye);
  oval(ctx, head.x + 2.55 * s, head.y, 1.55 * s, 1.15 * s, pal.eye);
  oval(ctx, head.x - 1.95 * s, head.y - 0.35 * s, 0.45 * s, 0.4 * s, '#ffd0d0');
  oval(ctx, head.x + 2.95 * s, head.y - 0.35 * s, 0.45 * s, 0.4 * s, '#ffd0d0');
  ctx.fillStyle = pal.lip || '#8a2830';
  ctx.beginPath();
  ctx.ellipse(head.x + 0.3 * s, head.y + 3.5 * s, 2.4 * s, 1.15 * s, 0.08, 0, Math.PI);
  ctx.fill();
  poly(ctx, [
    [head.x - 1.45 * s, head.y + 3.2 * s],
    [head.x - 0.55 * s, head.y + 5.8 * s],
    [head.x + 0.25 * s, head.y + 3.2 * s],
  ], '#f7f2ec');
  poly(ctx, [
    [head.x + 1.15 * s, head.y + 3.2 * s],
    [head.x + 2.15 * s, head.y + 5.8 * s],
    [head.x + 2.95 * s, head.y + 3.2 * s],
  ], '#f7f2ec');
}

export function drawRagdollBody(ctx, rag, w2s) {
  const s = BODY_SCALE;
  const pal = palette(rag.kind || 'zombie');
  ctx.lineCap = 'round';
  ctx.strokeStyle = shadeHex(pal.cloth || pal.wrap || '#666', -0.2);
  ctx.lineWidth = 4.6 * s;
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
  ctx.strokeStyle = pal.cloth || pal.wrap || '#666';
  ctx.lineWidth = 3.2 * s;
  ctx.stroke();
  for (const n of rag.nodes) {
    const p = w2s(n.x, n.y);
    if (n.id === 'head') volumeEllipse(ctx, p.x, p.y, 6 * s, 6.6 * s, pal.skin);
    else {
      oval(ctx, p.x, p.y, 4.4 * s, 4.4 * s, pal.cloth || pal.wrap);
      oval(ctx, p.x + 1.1 * s, p.y - 1.1 * s, 1.6 * s, 1.5 * s, shadeHex(pal.cloth || pal.wrap, 0.18));
    }
  }
}
