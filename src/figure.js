import { palette } from './data/biomes.js';

export { mixTone } from './util/color.js';

export const S = 1;
export const MUZZLE_LEN = 48 * S;

const THIGH = 48 * S;
const SHIN = 46 * S;
const ARM_U = 28 * S;
const ARM_L = 25 * S;
const FOOT_LEN = 21 * S;
const ANKLE_H = 7 * S;
const STRIDE = 25 * S;
const LIFT = 13 * S;
const PELVIS_H = 18 * S;
const GUT_H = 25 * S;
const RIB_H = 39 * S;
const KNEE_BEND = 0.26;

const GUNNER_PAL = {
  cloth: '#3d3228',
  skin: '#e2b894',
  accent: '#8a6a48',
  ink: '#161210',
};

export function paperPalette(kind) {
  if (kind === 'gunner') return { ...GUNNER_PAL };
  const pal = palette(kind);
  return {
    cloth: pal.cloth,
    skin: pal.skin,
    accent: pal.accent || pal.gold || pal.cape || '#8a6a48',
    ink: pal.ink || '#161210',
  };
}

function u01(seed, n) {
  let x = Math.imul(seed ^ Math.imul(n + 1, 0x9e3779b9), 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  return ((x >>> 0) % 10000) / 10000;
}

function between(seed, n, a, b) {
  return a + u01(seed, n) * (b - a);
}

function gaitFromSeed(kind, seed) {
  if (kind === 'gunner') {
    return {
      cadence: 1.55,
      stride: 18 * S,
      lift: 8 * S,
      phase0: 0,
      limp: 0,
      hunch: 0.04,
      chestFlex: 0.016,
      bob: 0.7 * S,
      arm: 0.25,
      rStride: 1,
    };
  }
  const hunch0 = kind === 'ghoul' ? 0.16 : kind === 'vampire' ? 0.02 : 0.08;
  return {
    cadence: between(seed, 1, 1.85, 2.25),
    stride: between(seed, 2, STRIDE * 0.88, STRIDE * 1.12),
    lift: between(seed, 3, LIFT * 0.85, LIFT * 1.15),
    phase0: between(seed, 4, 0, 0.9),
    limp: between(seed, 5, 0, 0.08),
    hunch: hunch0 + between(seed, 6, -0.03, 0.04),
    chestFlex: between(seed, 7, 0.014, 0.028),
    bob: between(seed, 8, 0.5, 1.1) * S,
    arm: between(seed, 9, 0.55, 1.15),
    rStride: between(seed, 10, 0.9, 1),
  };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function along(origin, ang, dist) {
  return { x: origin.x + Math.sin(ang) * dist, y: origin.y - Math.cos(ang) * dist };
}

function across(origin, ang, dist) {
  return { x: origin.x + Math.cos(ang) * dist, y: origin.y + Math.sin(ang) * dist };
}

function mix(a, b, t) {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}

function ikPair(origin, target, a, b) {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  let d = Math.hypot(dx, dy);
  const max = a + b - 1 * S;
  if (d < 1) d = 1;
  if (d >= max) {
    const t = a / (a + b);
    const mid = { x: origin.x + dx * t, y: origin.y + dy * t };
    return [mid, mid];
  }
  const alongD = (a * a - b * b + d * d) / (2 * d);
  const rise = Math.sqrt(Math.max(0, a * a - alongD * alongD));
  const ux = dx / d;
  const uy = dy / d;
  return [
    { x: origin.x + ux * alongD - uy * rise, y: origin.y + uy * alongD + ux * rise },
    { x: origin.x + ux * alongD + uy * rise, y: origin.y + uy * alongD - ux * rise },
  ];
}

function ikKnee(hip, ankle, preferX) {
  const [p, q] = ikPair(hip, ankle, THIGH, SHIN);
  const bent = Math.abs(p.x - preferX) < Math.abs(q.x - preferX) ? p : q;
  const t = THIGH / (THIGH + SHIN);
  const straight = { x: hip.x + (ankle.x - hip.x) * t, y: hip.y + (ankle.y - hip.y) * t };
  return mix(straight, bent, KNEE_BEND);
}

function ikElbow(shoulder, hand, preferBackX) {
  const [p, q] = ikPair(shoulder, hand, ARM_U, ARM_L);
  const bent = Math.abs(p.x - preferBackX) < Math.abs(q.x - preferBackX) ? p : q;
  const t = ARM_U / (ARM_U + ARM_L);
  const straight = {
    x: shoulder.x + (hand.x - shoulder.x) * t,
    y: shoulder.y + (hand.y - shoulder.y) * t,
  };
  return mix(straight, bent, 0.42);
}

function stepAt(phase, locDir, stride, lift) {
  const p = ((phase % 1) + 1) % 1;
  const stance = 0.58;
  if (p < stance) {
    const u = p / stance;
    let pitch = 0;
    if (u < 0.16) pitch = lerp(0.32, 0, u / 0.16);
    else if (u > 0.76) pitch = lerp(0, -0.38, (u - 0.76) / 0.24);
    return { x: lerp(locDir * stride, -locDir * stride, u), planted: true, u, pitch, lift: 0 };
  }
  const u = (p - stance) / (1 - stance);
  const swing = u * u * (3 - 2 * u);
  const pitch = u < 0.45 ? lerp(-0.28, 0.12, u / 0.45) : lerp(0.12, 0.36, (u - 0.45) / 0.55);
  return {
    x: lerp(-locDir * stride, locDir * stride, swing),
    planted: false,
    u,
    pitch,
    lift: Math.sin(u * Math.PI) * lift,
  };
}

function placeFoot(midX, step, locDir) {
  const g = 0;
  const alongD = locDir;
  if (step.planted) {
    if (step.pitch >= 0) {
      const heel = { x: midX - alongD * FOOT_LEN * 0.36, y: g };
      const toe = { x: midX + alongD * FOOT_LEN * 0.64, y: g - Math.sin(step.pitch) * FOOT_LEN * 0.85 };
      const ankle = { x: lerp(heel.x, toe.x, 0.38), y: g - ANKLE_H * Math.cos(step.pitch) };
      return { heel, toe, ankle };
    }
    const toe = { x: midX + alongD * FOOT_LEN * 0.64, y: g };
    const heel = { x: midX - alongD * FOOT_LEN * 0.36, y: g - Math.sin(-step.pitch) * FOOT_LEN * 0.85 };
    const ankle = { x: lerp(heel.x, toe.x, 0.42), y: g - ANKLE_H * Math.cos(-step.pitch) };
    return { heel, toe, ankle };
  }
  const ankle = { x: midX, y: g - ANKLE_H - step.lift };
  return {
    heel: { x: ankle.x - alongD * FOOT_LEN * 0.34, y: ankle.y + ANKLE_H * 0.55 },
    toe: { x: ankle.x + alongD * FOOT_LEN * 0.66, y: ankle.y + ANKLE_H * 0.25 + step.pitch * 8 * S },
    ankle,
  };
}

function addPt(p, ox, oy) {
  return { x: p.x + ox, y: p.y + oy };
}

function offsetLeg(leg, ox, oy) {
  return {
    hip: addPt(leg.hip, ox, oy),
    knee: addPt(leg.knee, ox, oy),
    ankle: addPt(leg.ankle, ox, oy),
    heel: addPt(leg.heel, ox, oy),
    toe: addPt(leg.toe, ox, oy),
    planted: leg.planted,
  };
}

function offsetArm(arm, ox, oy) {
  return {
    shoulder: addPt(arm.shoulder, ox, oy),
    elbow: addPt(arm.elbow, ox, oy),
    hand: addPt(arm.hand, ox, oy),
  };
}

export function offsetPose(p, ox, oy) {
  return {
    ...p,
    pelvis: addPt(p.pelvis, ox, oy),
    gut: addPt(p.gut, ox, oy),
    rib: addPt(p.rib, ox, oy),
    junction: addPt(p.junction, ox, oy),
    head: addPt(p.head, ox, oy),
    gun: addPt(p.gun, ox, oy),
    jL: addPt(p.jL, ox, oy),
    jR: addPt(p.jR, ox, oy),
    pL: addPt(p.pL, ox, oy),
    pR: addPt(p.pR, ox, oy),
    shL: addPt(p.shL, ox, oy),
    shR: addPt(p.shR, ox, oy),
    hipBL: addPt(p.hipBL, ox, oy),
    hipBR: addPt(p.hipBR, ox, oy),
    l: offsetLeg(p.l, ox, oy),
    r: offsetLeg(p.r, ox, oy),
    armL: offsetArm(p.armL, ox, oy),
    armR: offsetArm(p.armR, ox, oy),
  };
}

export function poseLocal({ kind = 'zombie', t = 0, seed = 1, crawl = false, aimAngle = 0 }) {
  const chase = kind !== 'gunner';
  const locDir = -1;
  const face = kind === 'gunner' ? 1 : -1;
  const g = gaitFromSeed(kind, seed);
  const phase = t * g.cadence + g.phase0;
  const ls = stepAt(phase, locDir, crawl ? g.stride * 0.35 : g.stride, crawl ? g.lift * 0.25 : g.lift);
  const rs = stepAt(phase + 0.5 + g.limp, locDir, (crawl ? g.stride * 0.35 : g.stride) * g.rStride, crawl ? g.lift * 0.25 : g.lift);
  const cycle = Math.sin(phase * Math.PI * 2);
  const bob = Math.abs(Math.sin(phase * Math.PI)) * g.bob;
  const hipY = crawl ? -18 * S + bob * 0.35 : -(THIGH + SHIN) + 7 * S + bob;
  const hipX = cycle * (crawl ? 1.4 * S : 0.7 * S);
  const pelvisAng = crawl ? 1.05 : cycle * 0.01;
  const gutAng = pelvisAng + g.hunch * 0.12 + (crawl ? 0.18 : 0);
  const ribAng = gutAng + g.hunch + cycle * g.chestFlex + (crawl ? 0.22 : 0);
  const pelvis = { x: hipX, y: hipY };
  const gut = along(pelvis, gutAng, PELVIS_H * 0.55 + GUT_H * 0.5);
  const junction = along(gut, gutAng, GUT_H * 0.5);
  const rib = along(junction, ribAng, RIB_H * 0.5);
  const head0 = along(rib, ribAng, RIB_H * 0.5 + 18 * S);
  const joinAng = (gutAng + ribAng) * 0.5;
  const jL = across(junction, joinAng, -14 * S);
  const jR = across(junction, joinAng, 14 * S);
  const pL = across(along(pelvis, pelvisAng, PELVIS_H * 0.45), pelvisAng, -15 * S);
  const pR = across(along(pelvis, pelvisAng, PELVIS_H * 0.45), pelvisAng, 15 * S);
  const ribTop = along(junction, ribAng, RIB_H);
  const shL = across(ribTop, ribAng, -17 * S);
  const shR = across(ribTop, ribAng, 17 * S);
  const hipBL = across(pelvis, pelvisAng, -8 * S);
  const hipBR = across(pelvis, pelvisAng, 8 * S);
  hipBL.y += 2 * S;
  hipBR.y += 2 * S;
  const lf = placeFoot(hipX + ls.x, ls, locDir);
  const rf = placeFoot(hipX + rs.x, rs, locDir);
  const prefer = hipX + locDir * 10 * S;

  let armL;
  let armR;
  const gun = { x: rib.x + 10 * S, y: rib.y + 10 * S };
  if (!chase) {
    const ca = Math.cos(aimAngle);
    const sa = Math.sin(aimAngle);
    const grip = { x: gun.x + ca * 4 * S, y: gun.y + sa * 4 * S };
    const forend = { x: gun.x + ca * 16 * S, y: gun.y + sa * 16 * S };
    armR = { shoulder: shR, elbow: ikElbow(shR, grip, shR.x + 6 * S), hand: grip };
    armL = { shoulder: shL, elbow: ikElbow(shL, forend, shL.x - 2 * S), hand: forend };
  } else if (crawl) {
    const frontHand = { x: shL.x + locDir * 28 * S, y: 2 * S };
    const rearHand = { x: pelvis.x - locDir * 6 * S, y: pelvis.y + 4 * S };
    armL = {
      shoulder: shL,
      elbow: { x: shL.x + locDir * 14 * S, y: shL.y + 10 * S },
      hand: frontHand,
    };
    armR = {
      shoulder: shR,
      elbow: { x: shR.x - locDir * 6 * S, y: shR.y + 12 * S },
      hand: rearHand,
    };
  } else {
    const frontHand = {
      x: shL.x + locDir * (21 + cycle * 2 * g.arm) * S,
      y: shL.y + 20 * S + (kind === 'drowned' ? -2 * S : 0),
    };
    const rearHand = { x: pelvis.x - locDir * 5 * S, y: pelvis.y - 8 * S };
    armL = {
      shoulder: shL,
      elbow: { x: shL.x + locDir * 9 * S, y: shL.y + 14 * S },
      hand: frontHand,
    };
    armR = {
      shoulder: shR,
      elbow: { x: shR.x - locDir * 9 * S, y: shR.y + 13 * S },
      hand: rearHand,
    };
  }

  return {
    pelvis,
    gut,
    rib,
    junction,
    head: { x: head0.x + face * (kind === 'vampire' ? 4 : 2) * S, y: head0.y },
    gun,
    jL,
    jR,
    pL,
    pR,
    shL,
    shR,
    hipBL,
    hipBR,
    l: {
      hip: hipBL,
      knee: ikKnee(hipBL, lf.ankle, prefer),
      ankle: lf.ankle,
      heel: lf.heel,
      toe: lf.toe,
      planted: ls.planted,
    },
    r: {
      hip: hipBR,
      knee: ikKnee(hipBR, rf.ankle, prefer),
      ankle: rf.ankle,
      heel: rf.heel,
      toe: rf.toe,
      planted: rs.planted,
    },
    armL,
    armR,
    face,
    locDir,
    kind,
    crawl,
  };
}

export function enemyTime(worldX) {
  return -worldX * 0.016;
}

export function poseEnemy(enemy) {
  return offsetPose(
    poseLocal({
      kind: enemy.kind || 'zombie',
      seed: enemy.id || 1,
      t: enemyTime(enemy.worldX),
      crawl: !!enemy.crawling,
    }),
    enemy.worldX,
    enemy.y,
  );
}

export function posePlayerLocal(player) {
  return poseLocal({
    kind: 'gunner',
    seed: 1,
    t: enemyTime(player.worldX),
    aimAngle: player.aimAngle || 0,
  });
}

export function posePlayer(player) {
  return offsetPose(posePlayerLocal(player), player.worldX, player.y);
}

export function limbCirclesFromPose(p) {
  const crawl = p.crawl;
  return {
    head: { x: p.head.x, y: p.head.y, r: (crawl ? 11 : 13) * S },
    upper: { x: p.rib.x, y: p.rib.y, r: (crawl ? 12 : 16) * S },
    lower: { x: p.gut.x, y: p.gut.y, r: (crawl ? 11 : 14) * S },
    lLeg: {
      x: (p.l.knee.x + p.l.ankle.x) * 0.5,
      y: (p.l.knee.y + p.l.ankle.y) * 0.5,
      r: 13 * S,
    },
    rLeg: {
      x: (p.r.knee.x + p.r.ankle.x) * 0.5,
      y: (p.r.knee.y + p.r.ankle.y) * 0.5,
      r: 13 * S,
    },
  };
}

export function gunWorld(player) {
  const p = posePlayerLocal(player);
  const ang = player.aimAngle || 0;
  return {
    x: player.worldX + p.gun.x,
    y: player.y + p.gun.y,
    sx: p.gun.x,
    sy: p.gun.y,
    muzzleX: player.worldX + p.gun.x + Math.cos(ang) * MUZZLE_LEN,
    muzzleY: player.y + p.gun.y + Math.sin(ang) * MUZZLE_LEN,
    ang,
    len: MUZZLE_LEN,
  };
}

export function playerCoreFromPose(player) {
  const p = posePlayer(player);
  const left = Math.min(p.shL.x, p.pL.x) - 2 * S;
  const right = Math.max(p.shR.x, p.pR.x) + 2 * S;
  const top = Math.min(p.rib.y, p.shL.y) - 4 * S;
  const bot = p.pelvis.y + 8 * S;
  return { x: left, y: top, w: right - left, h: bot - top };
}

export function ragdollNodesFromPose(p) {
  return [
    { id: 'head', x: p.head.x, y: p.head.y },
    { id: 'rib', x: p.rib.x, y: p.rib.y },
    { id: 'junction', x: p.junction.x, y: p.junction.y },
    { id: 'gut', x: p.gut.x, y: p.gut.y },
    { id: 'pelvis', x: p.pelvis.x, y: p.pelvis.y },
    { id: 'shL', x: p.shL.x, y: p.shL.y },
    { id: 'shR', x: p.shR.x, y: p.shR.y },
    { id: 'lKnee', x: p.l.knee.x, y: p.l.knee.y },
    { id: 'rKnee', x: p.r.knee.x, y: p.r.knee.y },
    { id: 'lAnkle', x: p.l.ankle.x, y: p.l.ankle.y },
    { id: 'rAnkle', x: p.r.ankle.x, y: p.r.ankle.y },
    { id: 'lElbow', x: p.armL.elbow.x, y: p.armL.elbow.y },
    { id: 'rElbow', x: p.armR.elbow.x, y: p.armR.elbow.y },
    { id: 'lHand', x: p.armL.hand.x, y: p.armL.hand.y },
    { id: 'rHand', x: p.armR.hand.x, y: p.armR.hand.y },
    { id: 'lHeel', x: p.l.heel.x, y: p.l.heel.y },
    { id: 'rHeel', x: p.r.heel.x, y: p.r.heel.y },
    { id: 'lToe', x: p.l.toe.x, y: p.l.toe.y },
    { id: 'rToe', x: p.r.toe.x, y: p.r.toe.y },
    { id: 'jL', x: p.jL.x, y: p.jL.y },
    { id: 'jR', x: p.jR.x, y: p.jR.y },
    { id: 'pL', x: p.pL.x, y: p.pL.y },
    { id: 'pR', x: p.pR.x, y: p.pR.y },
    { id: 'hipBL', x: p.hipBL.x, y: p.hipBL.y },
    { id: 'hipBR', x: p.hipBR.x, y: p.hipBR.y },
  ].map((n) => ({ ...n, ox: n.x, oy: n.y }));
}

const RAG_LINKS = [
  ['head', 'rib'],
  ['rib', 'junction'],
  ['junction', 'gut'],
  ['gut', 'pelvis'],
  ['pelvis', 'hipBL'],
  ['pelvis', 'hipBR'],
  ['hipBL', 'lKnee'],
  ['lKnee', 'lAnkle'],
  ['lAnkle', 'lHeel'],
  ['lAnkle', 'lToe'],
  ['hipBR', 'rKnee'],
  ['rKnee', 'rAnkle'],
  ['rAnkle', 'rHeel'],
  ['rAnkle', 'rToe'],
  ['rib', 'shL'],
  ['rib', 'shR'],
  ['shL', 'lElbow'],
  ['lElbow', 'lHand'],
  ['shR', 'rElbow'],
  ['rElbow', 'rHand'],
  ['junction', 'jL'],
  ['junction', 'jR'],
  ['pelvis', 'pL'],
  ['pelvis', 'pR'],
];

export function ragdollLinks(nodes) {
  const idx = Object.fromEntries(nodes.map((n, i) => [n.id, i]));
  return RAG_LINKS.map(([a, b]) => {
    const ia = idx[a];
    const ib = idx[b];
    const na = nodes[ia];
    const nb = nodes[ib];
    return { a: ia, b: ib, len: Math.hypot(na.x - nb.x, na.y - nb.y) };
  });
}

export function poseFromNodes(nodes, kind) {
  const n = Object.fromEntries(nodes.map((nd) => [nd.id, { x: nd.x, y: nd.y }]));
  const pt = (id, fb) => n[id] || fb;
  const pelvis = pt('pelvis', { x: 0, y: 0 });
  const rib = pt('rib', pelvis);
  const shL = pt('shL', rib);
  const shR = pt('shR', rib);
  const hipBL = pt('hipBL', pelvis);
  const hipBR = pt('hipBR', pelvis);
  const lAnkle = pt('lAnkle', hipBL);
  const rAnkle = pt('rAnkle', hipBR);
  return {
    pelvis,
    gut: pt('gut', pelvis),
    rib,
    junction: pt('junction', rib),
    head: pt('head', rib),
    gun: rib,
    jL: pt('jL', shL),
    jR: pt('jR', shR),
    pL: pt('pL', hipBL),
    pR: pt('pR', hipBR),
    shL,
    shR,
    hipBL,
    hipBR,
    l: {
      hip: hipBL,
      knee: pt('lKnee', hipBL),
      ankle: lAnkle,
      heel: pt('lHeel', lAnkle),
      toe: pt('lToe', lAnkle),
      planted: false,
    },
    r: {
      hip: hipBR,
      knee: pt('rKnee', hipBR),
      ankle: rAnkle,
      heel: pt('rHeel', rAnkle),
      toe: pt('rToe', rAnkle),
      planted: false,
    },
    armL: {
      shoulder: shL,
      elbow: pt('lElbow', shL),
      hand: pt('lHand', shL),
    },
    armR: {
      shoulder: shR,
      elbow: pt('rElbow', shR),
      hand: pt('rHand', shR),
    },
    face: kind === 'gunner' ? 1 : -1,
    locDir: -1,
    kind,
    crawl: false,
  };
}
