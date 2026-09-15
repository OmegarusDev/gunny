import { FLESH_PEN_COST, HIT_IMPULSE } from '../config.js';

export const ZONE_NODE = {
  head: 'head',
  upper: 'rib',
  lower: 'gut',
  lLeg: 'lKnee',
  rLeg: 'rKnee',
};

export function shotEnergy(speed, stopped, penBefore = FLESH_PEN_COST) {
  const deposited = Math.min(FLESH_PEN_COST, Math.max(0, penBefore));
  const penUsed = stopped ? deposited : deposited * HIT_IMPULSE.overpen;
  return penUsed * (speed / HIT_IMPULSE.refSpeed);
}
