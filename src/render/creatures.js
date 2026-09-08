import {
  MUZZLE_LEN,
  S,
  mixTone,
  paperPalette,
  poseFromNodes,
  poseLocal,
  posePlayerLocal,
} from './figure.js';

function oval(ctx, x, y, rx, ry, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function joint(ctx, pt, r, fill) {
  oval(ctx, pt.x, pt.y, r, r * 0.86, fill);
}

function poly(ctx, pts, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
}

function cap(ctx, a, b, w, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

function limbPoly(ctx, a, b, half, fill) {
  const nx = b.x - a.x;
  const ny = b.y - a.y;
  const len = Math.hypot(nx, ny) || 1;
  const px = (-ny / len) * half;
  const py = (nx / len) * half;
  poly(
    ctx,
    [
      { x: a.x + px, y: a.y + py },
      { x: a.x - px, y: a.y - py },
      { x: b.x - px, y: b.y - py },
      { x: b.x + px, y: b.y + py },
    ],
    fill,
  );
  joint(ctx, a, half * 1.08, fill);
  joint(ctx, b, half * 1.08, fill);
}

function headPoly(p) {
  const f = p.face;
  return [
    { x: p.head.x - 13 * S, y: p.head.y + 7 * S },
    { x: p.head.x - 7 * S + f, y: p.head.y - 15 * S },
    { x: p.head.x + 12 * S + f, y: p.head.y - 14 * S },
    { x: p.head.x + 14 * S, y: p.head.y + 8 * S },
    { x: p.head.x - 1 * S, y: p.head.y + 15 * S },
  ];
}

function gutPoly(p) {
  const pts = [p.pL, p.pR, p.jR, p.jL];
  if (p.kind !== 'zombie') return pts;
  return [
    p.pL,
    p.pR,
    p.jR,
    { x: p.jR.x - 6 * S, y: p.jR.y + 7 * S },
    { x: (p.jL.x + p.jR.x) * 0.5, y: p.jL.y + 3 * S },
    p.jL,
  ];
}

function ribPoly(p) {
  return [p.jL, p.jR, p.shR, p.shL];
}

function pelvisPoly(p) {
  return [
    p.pL,
    p.pR,
    { x: p.hipBR.x + 5 * S, y: p.hipBR.y + 7 * S },
    { x: p.hipBL.x - 5 * S, y: p.hipBL.y + 7 * S },
  ];
}

function neckPoly(p) {
  const base = { x: (p.shL.x + p.shR.x) * 0.5, y: (p.shL.y + p.shR.y) * 0.5 + 4 * S };
  return [
    { x: base.x - 5 * S, y: base.y },
    { x: base.x + 5 * S, y: base.y },
    { x: p.head.x + 4 * S, y: p.head.y + 10 * S },
    { x: p.head.x - 4 * S, y: p.head.y + 10 * S },
  ];
}

function handPoly(hand, dir) {
  return [
    { x: hand.x + dir * 6.5 * S, y: hand.y },
    { x: hand.x + dir * 1.2 * S, y: hand.y - 3.7 * S },
    { x: hand.x - dir * 3 * S, y: hand.y },
    { x: hand.x + dir * 1.2 * S, y: hand.y + 3.7 * S },
  ];
}

function bootPoly(leg) {
  return [
    leg.heel,
    { x: leg.heel.x, y: leg.heel.y - 8 * S },
    { x: (leg.heel.x + leg.toe.x) * 0.5, y: Math.min(leg.heel.y, leg.toe.y) - 9 * S },
    { x: leg.toe.x + 2 * S, y: leg.toe.y - 3.5 * S },
    leg.toe,
  ];
}

function footShadow(ctx, leg, groundY) {
  const x = (leg.heel.x + leg.toe.x) * 0.5;
  oval(
    ctx,
    x,
    groundY + 4 * S,
    (leg.planted ? 15 : 9) * S,
    3.6 * S,
    leg.planted ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)',
  );
}

function drawRifle(ctx, p, pal) {
  const ang = p.aimAngle || 0;
  const grip = p.armR.hand;
  ctx.save();
  ctx.translate(p.gun.x, p.gun.y);
  ctx.rotate(ang);
  poly(
    ctx,
    [
      { x: -4 * S, y: -3 * S },
      { x: 14 * S, y: -3.2 * S },
      { x: 14 * S, y: 3.4 * S },
      { x: -6 * S, y: 4.2 * S },
    ],
    pal.accent,
  );
  poly(
    ctx,
    [
      { x: 12 * S, y: -2.2 * S },
      { x: MUZZLE_LEN, y: -1.6 * S },
      { x: MUZZLE_LEN, y: 1.8 * S },
      { x: 12 * S, y: 2.6 * S },
    ],
    mixTone(pal.ink, pal.accent, 0.25),
  );
  poly(
    ctx,
    [
      { x: 8 * S, y: 2.4 * S },
      { x: 12 * S, y: 2.4 * S },
      { x: 11 * S, y: 8 * S },
      { x: 7 * S, y: 8 * S },
    ],
    pal.ink,
  );
  ctx.restore();
  joint(ctx, grip, 3.6 * S, pal.skin);
}

export function drawCutPaper(ctx, p, pal, opts = {}) {
  const cloth = pal.cloth;
  const gut = mixTone(pal.cloth, pal.ink, 0.16);
  const hips = mixTone(pal.cloth, pal.ink, 0.3);
  const skin = pal.skin;
  const accent = pal.accent;
  const ink = pal.ink;
  const kind = p.kind;
  const front = p.locDir;
  const skipHead = opts.skipHead;

  if (kind === 'vampire') {
    poly(
      ctx,
      [
        { x: p.shR.x + 2 * S, y: p.shR.y - 4 * S },
        { x: p.rib.x + 30 * S, y: p.pelvis.y + 30 * S },
        { x: p.pelvis.x - 14 * S, y: p.pelvis.y + 28 * S },
        { x: p.jL.x - 2 * S, y: p.jL.y },
      ],
      accent,
    );
  }

  limbPoly(ctx, p.armR.shoulder, p.armR.elbow, 4.1 * S, skin);
  limbPoly(ctx, p.armR.elbow, p.armR.hand, 3.4 * S, skin);
  poly(ctx, handPoly(p.armR.hand, -front), skin);
  joint(ctx, p.armR.hand, 3.6 * S, skin);
  limbPoly(ctx, p.r.hip, p.r.knee, 5 * S, mixTone(cloth, ink, 0.22));
  limbPoly(ctx, p.r.knee, p.r.ankle, 4.2 * S, mixTone(cloth, ink, 0.22));
  poly(ctx, bootPoly(p.r), ink);

  poly(ctx, pelvisPoly(p), hips);
  poly(ctx, gutPoly(p), gut);
  poly(ctx, ribPoly(p), cloth);
  oval(ctx, p.pelvis.x, (p.pL.y + p.pR.y) * 0.5, 12 * S, 7 * S, mixTone(hips, gut, 0.5));
  oval(ctx, p.junction.x, p.junction.y, 13 * S, 7.5 * S, mixTone(gut, cloth, 0.45));
  joint(ctx, p.r.hip, 6.2 * S, mixTone(cloth, ink, 0.22));
  joint(ctx, p.l.hip, 6.6 * S, hips);
  joint(ctx, p.armR.shoulder, 5.4 * S, mixTone(cloth, skin, 0.35));
  joint(ctx, p.armL.shoulder, 5.6 * S, mixTone(cloth, skin, 0.28));

  if (kind === 'mummy') {
    poly(
      ctx,
      [
        { x: p.jL.x - 2 * S, y: p.jL.y - 3 * S },
        { x: p.jR.x + 2 * S, y: p.jR.y - 6 * S },
        { x: p.jR.x + 2 * S, y: p.jR.y },
        { x: p.jL.x - 2 * S, y: p.jL.y + 3 * S },
      ],
      accent,
    );
    poly(
      ctx,
      [
        { x: p.pL.x, y: p.pL.y - 2 * S },
        { x: p.pR.x, y: p.pR.y - 5 * S },
        { x: p.pR.x, y: p.pR.y + 1 * S },
        { x: p.pL.x, y: p.pL.y + 4 * S },
      ],
      accent,
    );
  }
  if (kind === 'gunner') {
    poly(
      ctx,
      [
        { x: p.shL.x + 4 * S, y: p.shL.y + 2 * S },
        { x: p.shR.x - 2 * S, y: p.shR.y },
        { x: p.rib.x + 2 * S, y: p.rib.y + 6 * S },
      ],
      accent,
    );
  }
  if (kind === 'vampire') {
    poly(
      ctx,
      [
        { x: p.shL.x + 2 * S, y: p.shL.y + 2 * S },
        { x: p.shR.x - 2 * S, y: p.shR.y + 2 * S },
        { x: p.head.x, y: p.head.y + 10 * S },
      ],
      pal.skin,
    );
  }

  limbPoly(ctx, p.l.hip, p.l.knee, 5.5 * S, hips);
  limbPoly(ctx, p.l.knee, p.l.ankle, 4.6 * S, hips);
  poly(ctx, bootPoly(p.l), ink);
  joint(ctx, p.l.ankle, 4.8 * S, hips);
  joint(ctx, p.r.ankle, 4.4 * S, mixTone(cloth, ink, 0.22));

  limbPoly(ctx, p.armL.shoulder, p.armL.elbow, 4.4 * S, skin);
  limbPoly(ctx, p.armL.elbow, p.armL.hand, 3.7 * S, skin);
  poly(ctx, handPoly(p.armL.hand, front), skin);
  joint(ctx, p.armL.hand, 3.8 * S, skin);
  joint(ctx, p.l.hip, 6.6 * S, hips);
  joint(ctx, p.r.hip, 6.2 * S, mixTone(cloth, ink, 0.22));
  joint(ctx, p.armL.shoulder, 5.6 * S, mixTone(cloth, skin, 0.28));
  joint(ctx, p.armR.shoulder, 5.4 * S, mixTone(cloth, skin, 0.35));
  if (kind === 'drowned') {
    cap(ctx, p.armL.hand, { x: p.armL.hand.x - 1 * S, y: p.armL.hand.y + 16 * S }, 2 * S, skin);
  }

  if (!skipHead) {
    poly(ctx, neckPoly(p), skin);
    poly(ctx, headPoly(p), skin);
    joint(ctx, { x: p.head.x, y: p.head.y + 10 * S }, 5.6 * S, skin);
    if (kind === 'zombie') {
      poly(
        ctx,
        [
          { x: p.head.x - 5 * S, y: p.head.y - 13 * S },
          { x: p.head.x + 2 * S, y: p.head.y - 21 * S },
          { x: p.head.x + 7 * S, y: p.head.y - 12 * S },
        ],
        mixTone(skin, ink, 0.25),
      );
    }
  }
  if (kind === 'gunner') drawRifle(ctx, p, pal);
  if (kind === 'gunner') {
    poly(ctx, handPoly(p.armL.hand, front), skin);
    joint(ctx, p.armL.hand, 3.8 * S, skin);
    poly(ctx, handPoly(p.armR.hand, -front), skin);
    joint(ctx, p.armR.hand, 3.6 * S, skin);
  }
}

export function drawSurvivor(ctx, player, sx) {
  const local = posePlayerLocal(player);
  local.aimAngle = player.aimAngle || 0;
  const pal = paperPalette('gunner');
  ctx.save();
  ctx.translate(sx, player.y);
  footShadow(ctx, local.l, 0);
  footShadow(ctx, local.r, 0);
  drawCutPaper(ctx, local, pal);
  ctx.restore();
}

export function drawCreature(ctx, enemy, w2s) {
  const origin = w2s(enemy.worldX, enemy.y);
  const local = poseLocal({
    kind: enemy.kind || 'zombie',
    seed: enemy.id || 1,
    t: -enemy.worldX * 0.016,
    crawl: !!enemy.crawling,
  });
  const pal = paperPalette(enemy.kind || 'zombie');
  ctx.save();
  ctx.translate(origin.x, origin.y);
  footShadow(ctx, local.l, 0);
  footShadow(ctx, local.r, 0);
  drawCutPaper(ctx, local, pal, { skipHead: !!enemy.severedHead && !enemy.alive });
  ctx.restore();
}

export function drawRagdollBody(ctx, rag, w2s) {
  const mapped = rag.nodes.map((n) => {
    const p = w2s(n.x, n.y);
    return { ...n, x: p.x, y: p.y };
  });
  const pose = poseFromNodes(mapped, rag.kind || 'zombie');
  const pal = paperPalette(rag.kind || 'zombie');
  drawCutPaper(ctx, pose, pal, { skipHead: !!rag.severedHead });
}

export function drawFrozenCorpse(ctx, corpse, w2s) {
  if (!corpse.nodes) return;
  drawRagdollBody(ctx, corpse, w2s);
}
