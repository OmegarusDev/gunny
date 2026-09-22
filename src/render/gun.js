import { S } from '../figure.js';
import { mixTone } from '../util/color.js';

function poly(ctx, pts, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
}

function oval(ctx, x, y, rx, ry, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function receiverPoly(tier, recLen) {
  const h = (3.15 + tier * 0.22) * S;
  if (tier <= 1) {
    return [
      { x: -2 * S, y: -h * 0.82 },
      { x: recLen, y: -h * 0.62 },
      { x: recLen, y: h * 0.78 },
      { x: -2.6 * S, y: h * 1.08 },
    ];
  }
  if (tier === 2) {
    return [
      { x: -2.2 * S, y: -h * 0.95 },
      { x: recLen * 0.58, y: -h * 1.02 },
      { x: recLen, y: -h * 0.68 },
      { x: recLen, y: h * 0.72 },
      { x: -2.8 * S, y: h * 1.08 },
    ];
  }
  if (tier === 3) {
    return [
      { x: -2.6 * S, y: -h },
      { x: recLen * 0.42, y: -h * 1.08 },
      { x: recLen, y: -h * 0.65 },
      { x: recLen, y: h * 0.7 },
      { x: recLen * 0.18, y: h * 1.05 },
      { x: -3 * S, y: h * 1.1 },
    ];
  }
  return [
    { x: -3 * S, y: -h * 1.08 },
    { x: recLen * 0.36, y: -h * 1.16 },
    { x: recLen, y: -h * 0.62 },
    { x: recLen, y: h * 0.68 },
    { x: recLen * 0.2, y: h * 1.12 },
    { x: -3.4 * S, y: h * 1.14 },
  ];
}

function drawStock(ctx, len, wood, ink) {
  if (!(len > 0)) return;
  if (len < 2 * S) {
    poly(
      ctx,
      [
        { x: 0.4 * S, y: -2.1 * S },
        { x: -4.8 * S, y: -1.5 * S },
        { x: -4.4 * S, y: 2.6 * S },
        { x: 0, y: 3.1 * S },
      ],
      mixTone(wood, ink, 0.16),
    );
    return;
  }
  const t = Math.min(1, (len - 5 * S) / (30 * S));
  const butt = 3.4 * S + t * 5.2 * S;
  poly(
    ctx,
    [
      { x: 1.2 * S, y: -2.5 * S },
      { x: -len * 0.52, y: -3 * S - t * 1.4 * S },
      { x: -len, y: -butt * 0.12 },
      { x: -len, y: butt },
      { x: -len * 0.4, y: 3.8 * S + t * 1.8 * S },
      { x: 0.2 * S, y: 3.5 * S },
    ],
    mixTone(wood, ink, 0.08 + t * 0.14),
  );
}

function drawForend(ctx, recLen, barrelLen, wood, ink) {
  const start = recLen * 0.7;
  const end = recLen + barrelLen * 0.5;
  poly(
    ctx,
    [
      { x: start, y: 0.95 * S },
      { x: end, y: 0.7 * S },
      { x: end - 1.2 * S, y: 3.5 * S },
      { x: start + 0.8 * S, y: 4.2 * S },
    ],
    mixTone(wood, ink, 0.1),
  );
}

function drawMag(ctx, look, recLen, metal, ink) {
  const wellX = recLen * 0.4;
  const style = look.magStyle;
  const mag = look.mag;
  if (style === 'stick') {
    const h = (5.2 + mag * 0.75) * S;
    const w = 2.35 * S;
    poly(
      ctx,
      [
        { x: wellX - w, y: 2.15 * S },
        { x: wellX + w, y: 2.15 * S },
        { x: wellX + w * 0.82, y: 2.15 * S + h },
        { x: wellX - w * 0.82, y: 2.15 * S + h },
      ],
      mixTone(metal, ink, 0.2),
    );
    return;
  }
  if (style === 'box') {
    const extra = mag - 8;
    const h = (11.2 + extra * 0.38) * S;
    const w = 3.45 * S;
    poly(
      ctx,
      [
        { x: wellX - w, y: 1.9 * S },
        { x: wellX + w, y: 1.9 * S },
        { x: wellX + w * 1.08, y: 1.9 * S + h },
        { x: wellX - w * 0.65, y: 1.9 * S + h + 1.4 * S },
      ],
      mixTone(metal, ink, 0.28),
    );
    return;
  }
  if (style === 'drum') {
    const r = (6.4 + (mag - 20) * 0.09) * S;
    oval(ctx, wellX, 3.2 * S + r * 0.58, r, r * 0.9, mixTone(metal, ink, 0.22));
    oval(ctx, wellX, 3.2 * S + r * 0.58, r * 0.36, r * 0.36, ink);
    return;
  }
  const r = 7.4 * S;
  oval(ctx, wellX, 3.8 * S + r * 0.48, r, r * 0.88, mixTone(metal, ink, 0.25));
  oval(ctx, wellX, 3.8 * S + r * 0.48, r * 0.32, r * 0.32, ink);
  const belt = mag - 40;
  const n = 3 + Math.min(4, Math.floor(belt / 12));
  for (let i = 0; i < n; i++) {
    const bx = wellX + 5.2 * S + i * 3.15 * S;
    const by = 7.6 * S + i * 2.15 * S;
    poly(
      ctx,
      [
        { x: bx, y: by },
        { x: bx + 2.7 * S, y: by + 0.55 * S },
        { x: bx + 2.3 * S, y: by + 3.3 * S },
        { x: bx - 0.35 * S, y: by + 2.7 * S },
      ],
      mixTone(metal, ink, 0.18),
    );
  }
}

/** Cut-paper rifle: receiver, barrel, stock, mag. No pins or trigger. */
export function drawHeldGun(ctx, p, pal) {
  const look = p.gunLook;
  const ang = p.aimAngle || 0;
  const heat = Math.max(0, Math.min(1, p.heat || 0));
  const metal = mixTone(pal.ink, pal.accent, 0.22);
  const wood = pal.accent;
  const ink = pal.ink;
  const recLen = look?.recLen ?? 14 * S;
  const barrelLen = look?.barrelLen ?? 32 * S;
  const stockLen = look?.stockLen ?? 0;
  const tip = recLen + barrelLen;
  const tier = look?.tier || 1;

  ctx.save();
  ctx.translate(p.gun.x, p.gun.y);
  ctx.rotate(ang);

  drawStock(ctx, stockLen, wood, ink);
  poly(ctx, receiverPoly(tier, recLen), mixTone(metal, wood, tier <= 2 ? 0.42 : 0.16));
  poly(
    ctx,
    [
      { x: recLen - 1.2 * S, y: -2.25 * S },
      { x: tip, y: -1.55 * S },
      { x: tip, y: 1.65 * S },
      { x: recLen - 1.2 * S, y: 2.45 * S },
    ],
    mixTone(metal, '#c45a28', heat * 0.55),
  );
  drawForend(ctx, recLen, barrelLen, wood, ink);
  poly(
    ctx,
    [
      { x: recLen * 0.2, y: 2.05 * S },
      { x: recLen * 0.52, y: 2.05 * S },
      { x: recLen * 0.46, y: 8.7 * S },
      { x: recLen * 0.1, y: 8.3 * S },
    ],
    ink,
  );
  if (look) drawMag(ctx, look, recLen, metal, ink);
  poly(
    ctx,
    [
      { x: tip - 2.5 * S, y: -3.15 * S },
      { x: tip - 0.25 * S, y: -3.15 * S },
      { x: tip - 0.25 * S, y: -1.35 * S },
      { x: tip - 2.5 * S, y: -1.35 * S },
    ],
    ink,
  );
  if (heat > 0.04) {
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(tip + 1.2 * S, 0, 0.4 * S, tip + 1.2 * S, 0, (7 + heat * 11) * S);
    glow.addColorStop(0, `rgba(255, 236, 180, ${0.55 + 0.4 * heat})`);
    glow.addColorStop(0.28, `rgba(255, 140, 40, ${0.5 * heat})`);
    glow.addColorStop(0.7, `rgba(255, 70, 16, ${0.28 * heat})`);
    glow.addColorStop(1, 'rgba(255, 40, 0, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(tip + 1.2 * S, 0, (7 + heat * 11) * S, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
