import { FLESH_PEN_COST, HIT_IMPULSE } from '../config.js';

export const NODE_MASS = {
  head: 0.7,
  rib: 1.2,
  junction: 1.15,
  gut: 1.3,
  pelvis: 1.45,
  shL: 0.85,
  shR: 0.85,
  lKnee: 0.9,
  rKnee: 0.9,
  lAnkle: 0.55,
  rAnkle: 0.55,
  lElbow: 0.55,
  rElbow: 0.55,
  lHand: 0.4,
  rHand: 0.4,
  lHeel: 0.45,
  rHeel: 0.45,
  lToe: 0.35,
  rToe: 0.35,
  jL: 0.7,
  jR: 0.7,
  pL: 0.85,
  pR: 0.85,
  hipBL: 1.0,
  hipBR: 1.0,
};

export const ZONE_NODE = {
  head: 'head',
  upper: 'rib',
  lower: 'gut',
  lLeg: 'lKnee',
  rLeg: 'rKnee',
};

export function shotEnergy(speed, stopped) {
  const penUsed = stopped ? FLESH_PEN_COST : FLESH_PEN_COST * HIT_IMPULSE.overpen;
  return penUsed * (speed / HIT_IMPULSE.refSpeed);
}
