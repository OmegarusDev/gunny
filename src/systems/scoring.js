import { ECONOMY } from '../config.js';

export function createScore() {
  return {
    cash: 0,
    xp: 0,
    kills: 0,
    headshots: 0,
    perfects: 0,
    lastMetersPaid: 0,
  };
}

export function tickDistance(score, meters, cashMul) {
  const gained = meters - score.lastMetersPaid;
  if (gained <= 0) return;
  score.lastMetersPaid = meters;
  score.cash += gained * ECONOMY.cashPerMeter * cashMul;
  score.xp += gained * ECONOMY.xpPerMeter;
}

export function onHit(score, zone, crit, cashMul) {
  if (zone === 'head') {
    score.headshots += 1;
    score.cash += ECONOMY.cashPerHeadshot * cashMul;
    score.xp += ECONOMY.xpPerHeadshot;
  } else if (zone === 'lLeg' || zone === 'rLeg') {
    score.cash += ECONOMY.cashPerLimb * cashMul;
    score.xp += 1;
  }
  if (crit) {
    score.cash += 2 * cashMul;
    score.xp += 1;
  }
}

export function onKill(score, cashMul) {
  score.kills += 1;
  score.cash += ECONOMY.cashPerKill * cashMul;
  score.xp += ECONOMY.xpPerKill;
}

export function onPerfect(score, cashMul) {
  score.perfects += 1;
  score.cash += ECONOMY.cashPerPerfect * cashMul;
  score.xp += 3;
}

export function extractBonus(score) {
  score.cash += ECONOMY.extractBonus;
  score.xp += ECONOMY.extractXp;
}
