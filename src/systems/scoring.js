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

export function tickDistance(score, meters) {
  const gained = meters - score.lastMetersPaid;
  if (gained <= 0) return;
  score.lastMetersPaid = meters;
  score.xp += gained * ECONOMY.xpPerMeter;
}

export function onHit(score, zone, crit) {
  if (zone === 'head') {
    score.headshots += 1;
    score.xp += ECONOMY.xpPerHeadshot;
  }
}

export function onKill(score, cashMul, xpMul = 1) {
  score.kills += 1;
  score.cash += ECONOMY.cashPerKill * cashMul;
  score.xp += ECONOMY.xpPerKill * xpMul;
}

export function onPerfect(score) {
  score.perfects += 1;
  score.xp += ECONOMY.xpPerPerfect;
}

export function extractBonus(score) {
  score.cash += ECONOMY.extractBonus;
  score.xp += ECONOMY.extractXp;
}
