import { describe, expect, it } from 'vitest';
import {
  AIM_REACH_BASE,
  AIM_REACH_MAX,
  AIM_REACH_MIN,
  AIM_SCREEN_FRAC,
  ECONOMY,
  DEATH_HOLD,
  FLESH_PEN_COST,
  HIT_IMPULSE,
  MAX_DPR,
  PERFECT_MAG_ROF,
  PLAYER_SCREEN_X_RATIO,
  PX_PER_M,
  SHOT_REACH_BASE,
  SHOT_SCREEN_FRAC,
  TERRAIN_AMP,
  TERRAIN_FLOOR_PAD,
  TERRAIN_HEADROOM,
  THREAT,
  TRACK_METERS,
  V_RETREAT,
  extractCash,
  clampShotRange,
  effectiveAimReach,
  effectiveShotRange,
  enemyHp,
  GRUNT_HP,
  hudScale,
  hudTypeScale,
  LEG_HP_FRAC,
  LOCATIONAL,
  threatForDistance,
  usesFullScreenAim,
} from '../src/config.js';
import { BIOMES, beatenRoadIndexes, biomeFor } from '../src/data/biomes.js';
import { KINDS } from '../src/data/kinds.js';
import { RECEIVERS, RECEIVER_COST_BASE, RECEIVER_COSTS, RECEIVER_STAT_RATE, SLOTS, SLOT_MIN_TIER } from '../src/data/receivers.js';
import { SLOT_COST_RATE, SLOT_MAX, SLOT_UPGRADES, sanitizeSlotRanks, slotCapFor, slotMods, upgradeCost } from '../src/data/upgrades.js';
import { CHASE_FLOOR, ROLE_UNLOCK, ROLES, pickRole, roleUnlocked } from '../src/data/roles.js';
import { SKILLS, sanitizeRanks, skillCost, xpInvested } from '../src/data/skills.js';
import { formatRpm, gunsmithStatRows, magRof, resolveStats, shotCycle, shotSpreadDeg, slotUnlockedFor, STAT_BY_ID, STATS, trainingStatRows } from '../src/entities/loadout.js';
import { applyFlinch, cacheEnemyPose, createEnemy, enemyIsHurt, isDead, lethalCircles, lethalHpRatio, limbCircleList, limbCircles, locationalOf, stepFlinch, updateLocomotion } from '../src/entities/enemy.js';
import { defaultProfile, resetProfile, buyPart, buyBlockedReason, owns, hydrateProfile, equipPart, ensureKit, upgradeSlot, slotRank } from '../src/state/profile.js';
import { defaultSettings } from '../src/state/settings.js';
import { wantsImmersive, usesHtmlFullscreen, isPortrait } from '../src/engine/immersive.js';
import { clampAimPoint, clampToViewport, resolveAimPoint } from '../src/view/aim.js';
import { PERFECT_MARK, PERFECT_MARK_IN_BAND, perfectBand, reloadNorm } from '../src/view/reload.js';
import { uhash } from '../src/util/hash.js';
import { mixHex, mixTone } from '../src/util/color.js';
import { createTerrain } from '../src/world/terrain.js';
import { createPlayer } from '../src/entities/player.js';
import { gaitPlanted, playerCoreFromPose, playerHeadClearance, poseEnemyLocal, posePlayerLocal, S } from '../src/figure.js';
import { gunLookFrom, magStyleFor, MAG_BOX_MAX, MAG_DRUM_MAX, MAG_STICK_MAX } from '../src/data/gunLook.js';
import { emitBarrelSmoke, MAX_SMOKE, stepSmoke } from '../src/systems/smoke.js';
import { shotEnergy } from '../src/systems/impulse.js';
import { cullFrozenCorpses, spawnRagdoll } from '../src/systems/ragdoll.js';
import { stepGibs } from '../src/systems/gibs.js';
import { createRun, simulate } from '../src/systems/run.js';
import { stepSpawner } from '../src/systems/spawner.js';
import { createScore, onHit, onKill, extractBonus } from '../src/systems/scoring.js';
import { rectCircleOverlap, segmentHitsCircle } from '../src/systems/hits.js';
import { spawnBullet, stepBullets, rangeDamageMul, hitPenBonus } from '../src/systems/ballistics.js';
import { capDpr, createQuality } from '../src/engine/quality.js';
import { pwaUpdateBlocked } from '../src/engine/pwaBusy.js';
import { formatMetres } from '../src/ui/overlays.js';
import { renderEnd } from '../src/ui/hub.js';
import { renderGunsmith } from '../src/ui/gunsmith.js';
import { deciduousH, pineH } from '../src/render/scenery/util.js';

const LADDER = ['t1_stock', 't2_tactical', 't3_ordnance', 't4_duty', 't5_advanced'];

function setRanks(profile, ranks, recId = profile.loadout.receiver) {
  const kit = ensureKit(profile, recId);
  kit.ranks = sanitizeSlotRanks({ ...kit.ranks, ...ranks }, slotCapFor(recId));
  return profile;
}

function gunAt(recId, ranks = {}) {
  const profile = defaultProfile();
  const idx = LADDER.indexOf(recId);
  if (idx > 0) {
    profile.owned = LADDER.slice(0, idx + 1);
    profile.loadout.receiver = recId;
  }
  return setRanks(profile, ranks, recId);
}

describe('threat pacing', () => {
  it('keeps the in-road climb larger than the per-road step so the next open is a breather', () => {
    expect(THREAT.roadHpRamp).toBeGreaterThan(THREAT.roadHpStep);
    expect(THREAT.roadDensityRamp).toBeGreaterThan(THREAT.roadDensityStep);
    expect(THREAT.roadHpStep).toBe(THREAT.roadDensityStep);
    expect(THREAT.roadHpRamp).toBe(THREAT.roadDensityRamp);
  });

  it('climbs HP a little across the 250m', () => {
    const early = threatForDistance(20, 0, false);
    const mid = threatForDistance(100, 0, false);
    const late = threatForDistance(200, 0, false);
    expect(early.spawnInterval).toBeGreaterThan(mid.spawnInterval);
    expect(mid.spawnInterval).toBeGreaterThan(late.spawnInterval);
    expect(late.maxAlive).toBeGreaterThanOrEqual(early.maxAlive);
    expect(late.hpMul).toBeGreaterThan(early.hpMul);
    expect(enemyHp(1).body).toBe(GRUNT_HP);
    expect(enemyHp(1).legs).toBe(GRUNT_HP * LEG_HP_FRAC);
    expect(enemyHp(threatForDistance(0, 0, false).hpMul).body).toBe(GRUNT_HP);
    expect(enemyHp(threatForDistance(TRACK_METERS, 0, false).hpMul).body).toBe(60);
    expect(THREAT.roadHpStep).toBe(0.1);
    expect(THREAT.roadHpRamp).toBe(0.2);
  });

  it('opens the next road harder than the last open, easier than the last extract', () => {
    for (let L = 0; L < 8; L++) {
      const open = threatForDistance(0, L, false);
      const extract = threatForDistance(TRACK_METERS, L, false);
      const nextOpen = threatForDistance(0, L + 1, false);
      const nextExtract = threatForDistance(TRACK_METERS, L + 1, false);
      expect(nextOpen.hpMul).toBeGreaterThan(open.hpMul);
      expect(nextOpen.hpMul).toBeLessThan(extract.hpMul);
      expect(nextExtract.hpMul).toBeGreaterThan(extract.hpMul);
      expect(nextOpen.spawnInterval).toBeLessThan(open.spawnInterval);
      expect(nextOpen.spawnInterval).toBeGreaterThan(extract.spawnInterval);
    }
    expect(threatForDistance(0, 0, false).maxAlive).toBeGreaterThanOrEqual(2);
    expect(threatForDistance(0, 0, false).packChance).toBe(0);
    expect(threatForDistance(TRACK_METERS, 0, false).packChance).toBeGreaterThan(0);
  });

  it('steps campaign grunt HP per road, with a larger climb inside the 250m', () => {
    const l0s = threatForDistance(0, 0, false);
    const l0e = threatForDistance(TRACK_METERS, 0, false);
    const l2s = threatForDistance(80, 2, false);
    const l2e = threatForDistance(TRACK_METERS, 2, false);
    expect(l0e.hpMul).toBeGreaterThan(l0s.hpMul);
    expect(l0e.hpMul / l0s.hpMul).toBeCloseTo(1 + THREAT.roadHpRamp);
    expect(l2e.hpMul).toBeGreaterThan(l2s.hpMul);
    expect(l2s.hpMul).toBeGreaterThan(l0s.hpMul);
    expect(l2s.maxAlive).toBeGreaterThanOrEqual(threatForDistance(80, 0, false).maxAlive);
    expect(l2s.speed).toBeGreaterThan(threatForDistance(80, 0, false).speed);
  });

  it('makes Endless twice as hard as the same campaign metres', () => {
    const camp0_80 = threatForDistance(80, 0, false);
    const camp0_250 = threatForDistance(TRACK_METERS, 0, false);
    const camp1_250 = threatForDistance(TRACK_METERS, 1, false);
    const camp4_250 = threatForDistance(TRACK_METERS, 4, false);
    const end80 = threatForDistance(80, 0, true);
    const end250 = threatForDistance(TRACK_METERS, 0, true);
    const end500 = threatForDistance(500, 0, true);

    expect(THREAT.endlessHard).toBe(2);
    expect(end80.hpMul / camp0_80.hpMul).toBeCloseTo(THREAT.endlessHard);
    expect(end250.hpMul / camp0_250.hpMul).toBeCloseTo(THREAT.endlessHard);
    expect(end80.spawnInterval).toBeLessThan(camp0_80.spawnInterval);
    expect(end250.hpMul).toBeGreaterThan(camp1_250.hpMul);
    expect(end250.spawnInterval).toBeLessThanOrEqual(camp1_250.spawnInterval);
    expect(end500.hpMul).toBeGreaterThan(camp4_250.hpMul);
    expect(end500.hpMul).toBeGreaterThan(end250.hpMul);
    expect(end500.spawnInterval).toBeLessThan(end250.spawnInterval);
  });

  it('ramps Endless toughness with metres including inside the first 250', () => {
    const early = threatForDistance(40, 0, true);
    const mid = threatForDistance(180, 0, true);
    const later = threatForDistance(TRACK_METERS + 200, 0, true);
    expect(mid.hpMul).toBeGreaterThan(early.hpMul);
    expect(later.hpMul).toBeGreaterThan(mid.hpMul);
    expect(later.spawnInterval).toBeLessThan(mid.spawnInterval);
    expect(later.maxAlive).toBeGreaterThanOrEqual(mid.maxAlive);
  });

  it('keeps campaign HP positive and rising on late roads', () => {
    const l0e = threatForDistance(TRACK_METERS, 0, false);
    const l10s = threatForDistance(0, 10, false);
    const l10e = threatForDistance(TRACK_METERS, 10, false);
    expect(l10s.hpMul).toBeGreaterThan(l0e.hpMul);
    expect(l10e.hpMul).toBeGreaterThan(l10s.hpMul);
    expect(l10s.spawnInterval).toBeLessThanOrEqual(l0e.spawnInterval);
    expect(enemyHp(l10e.hpMul).body).toBeGreaterThanOrEqual(1);
    expect(enemyHp(-2).body).toBeGreaterThanOrEqual(1);
  });

  it('chases a bit quicker and only sprints very late', () => {
    expect(THREAT.chill.speed).toBeGreaterThanOrEqual(118);
    expect(THREAT.speedCap).toBeLessThan(THREAT.speedSprint);

    const l0s = threatForDistance(0, 0, false);
    const l0e = threatForDistance(TRACK_METERS, 0, false);
    const l2e = threatForDistance(TRACK_METERS, 2, false);
    const l10e = threatForDistance(TRACK_METERS, 10, false);
    const l20e = threatForDistance(TRACK_METERS, 20, false);
    expect(l0e.speed).toBeGreaterThan(l0s.speed);
    expect(l2e.speed).toBeGreaterThan(l0e.speed);
    expect(l10e.speed).toBeLessThanOrEqual(THREAT.speedCap);
    expect(l20e.speed).toBeGreaterThan(THREAT.speedCap);
    expect(l20e.speed).toBeLessThanOrEqual(THREAT.speedSprint);

    const deepEndless = TRACK_METERS + (THREAT.sprintEndless + 6) * 120;
    expect(threatForDistance(600, 0, true).speed).toBeLessThanOrEqual(THREAT.speedCap);
    expect(threatForDistance(deepEndless, 0, true).speed).toBeGreaterThan(THREAT.speedCap);
    expect(threatForDistance(deepEndless, 0, true).speed).toBeLessThanOrEqual(THREAT.speedSprint);
  });
});

describe('economy & ladders', () => {
  it('prices the first mag upgrade near ten starter kills', () => {
    expect(upgradeCost('magazine', 0)).toBe(100);
    expect(ECONOMY.cashPerKill * 10).toBe(upgradeCost('magazine', 0));
    expect(upgradeCost('magazine', 1)).toBe(110);
    expect(upgradeCost('magazine', 2)).toBe(120);
    expect(upgradeCost('bolt', 0)).toBe(80);
    expect(upgradeCost('ammo', 0)).toBe(100);
  });

  it('grows slot prices by about 6% per level and caps at 100', () => {
    expect(SLOT_MAX).toBe(100);
    expect(SLOT_COST_RATE).toBe(1.06);
    expect(upgradeCost('magazine', SLOT_MAX)).toBe(0);
    expect(upgradeCost('magazine', 10)).toBeGreaterThan(upgradeCost('magazine', 0));
    expect(upgradeCost('magazine', 40)).toBeGreaterThan(upgradeCost('magazine', 20));
    expect(upgradeCost('muzzle', 1)).toBeGreaterThan(upgradeCost('muzzle', 0));
    for (let i = 1; i < 20; i++) {
      expect(upgradeCost('magazine', i)).toBeGreaterThan(upgradeCost('magazine', i - 1));
      expect(upgradeCost('bolt', i)).toBeGreaterThan(upgradeCost('bolt', i - 1));
    }
  });

  it('exposes receivers with rising cost and tier', () => {
    expect(RECEIVERS.t1_stock.cost).toBe(0);
    expect(RECEIVERS.t1_stock.short).toBe('Shoddy');
    expect(RECEIVERS.t2_tactical.requires).toBe('t1_stock');
    expect(RECEIVERS.t2_tactical.cost).toBe(500);
    expect(RECEIVERS.t3_ordnance.tier).toBe(3);
    expect(RECEIVERS.t3_ordnance.cost).toBe(2000);
    expect(RECEIVERS.t3_ordnance.cost).toBeGreaterThan(RECEIVERS.t2_tactical.cost);
    expect(RECEIVERS.t4_duty.requires).toBe('t3_ordnance');
    expect(RECEIVERS.t4_duty.short).toBe('Expert');
    expect(RECEIVERS.t4_duty.cost).toBe(4000);
    expect(RECEIVERS.t5_advanced.requires).toBe('t4_duty');
    expect(RECEIVERS.t5_advanced.short).toBe('Elite');
    expect(RECEIVERS.t5_advanced.cost).toBe(8000);
    expect(RECEIVERS.t5_advanced.cost).toBeGreaterThan(RECEIVERS.t4_duty.cost);
    expect(RECEIVER_COSTS).toEqual([0, 500, 2000, 4000, 8000]);
    expect(RECEIVERS.t2_tactical.cost).toBe(RECEIVER_COST_BASE);
    expect(Object.keys(RECEIVERS)).toHaveLength(5);
  });

  it('keeps Shoddy slow and grows receiver RoF and damage 1.5× per rank', () => {
    expect(RECEIVERS.t1_stock.base.rof).toBeCloseTo(40 / 60);
    expect(RECEIVERS.t2_tactical.base.rof).toBeCloseTo((40 / 60) * RECEIVER_STAT_RATE);
    expect(RECEIVERS.t3_ordnance.base.rof).toBeCloseTo((40 / 60) * RECEIVER_STAT_RATE ** 2);
    expect(RECEIVERS.t4_duty.base.rof).toBeCloseTo((40 / 60) * RECEIVER_STAT_RATE ** 3);
    expect(RECEIVERS.t5_advanced.base.rof).toBeCloseTo((40 / 60) * RECEIVER_STAT_RATE ** 4);
    expect(RECEIVERS.t2_tactical.base.damage).toBeCloseTo(15 * RECEIVER_STAT_RATE, 1);
    expect(RECEIVERS.t5_advanced.base.damage).toBeGreaterThan(RECEIVERS.t4_duty.base.damage);
    expect(RECEIVERS.t5_advanced.base.pen).toBeGreaterThan(RECEIVERS.t4_duty.base.pen);
    expect(STAT_BY_ID.rof.min).toBeLessThanOrEqual(40 / 60);
    expect(resolveStats(defaultProfile()).rof).toBeCloseTo(40 / 60);
    const starter = resolveStats(defaultProfile());
    expect(starter.magSize).toBe(1);
    expect(starter.reload).toBe(3);
    expect(starter.damage).toBe(15);
    expect(formatRpm(starter)).toBe(String(Math.round((1 / starter.reload) * 60)));
    expect(Number(formatRpm(starter))).toBeLessThan(Math.round(starter.rof * 60));
    expect(Math.round(starter.rof * 60)).toBe(40);
    const mag2 = setRanks(defaultProfile(), { magazine: 1 });
    expect(Number(formatRpm(resolveStats(mag2)))).toBeGreaterThan(Number(formatRpm(starter)));
    expect(starter.pen).toBe(0.5);
    expect(starter.pen).toBeLessThan(FLESH_PEN_COST);
    expect(RECEIVERS.t2_tactical.base.pen).toBe(0.9);
    expect(RECEIVERS.t2_tactical.base.pen).toBeLessThan(FLESH_PEN_COST);
    expect(RECEIVERS.t3_ordnance.base.pen).toBeCloseTo(0.9 * RECEIVER_STAT_RATE, 2);
    const magnum = setRanks(defaultProfile(), { ammo: 60 });
    expect(slotRank(magnum, 'ammo')).toBe(slotCapFor('t1_stock'));
    const kitPen = resolveStats(magnum).pen;
    expect(kitPen).toBeCloseTo(0.5 + slotMods('ammo', slotCapFor('t1_stock')).pen);
    expect(kitPen + hitPenBonus('head', true)).toBeLessThanOrEqual(FLESH_PEN_COST);
    const ammo60Pen = 0.5 + slotMods('ammo', 60).pen;
    expect(ammo60Pen + hitPenBonus('head', false)).toBeLessThanOrEqual(FLESH_PEN_COST);
    expect(ammo60Pen + hitPenBonus('torso', true)).toBeLessThanOrEqual(FLESH_PEN_COST);
    expect(ammo60Pen + hitPenBonus('head', true)).toBeGreaterThan(FLESH_PEN_COST);
    const pluspPen = 0.5 + slotMods('ammo', 40).pen;
    expect(pluspPen + hitPenBonus('head', true)).toBeLessThanOrEqual(FLESH_PEN_COST);
    const militia = gunAt('t2_tactical');
    expect(resolveStats(militia).pen).toBeCloseTo(0.9);
    const longMilitia = gunAt('t2_tactical', { barrel: 40 });
    expect(resolveStats(longMilitia).pen).toBeCloseTo(0.9 + slotMods('barrel', 40).pen);
    expect(RECEIVERS.t2_tactical.base.pen + hitPenBonus('head', false)).toBeGreaterThan(FLESH_PEN_COST);
    expect(RECEIVERS.t2_tactical.base.pen + hitPenBonus('torso', true)).toBeGreaterThan(FLESH_PEN_COST);
    expect(spawnBullet(0, 0, 0, starter, true).pen).toBe(starter.pen);
    expect(slotMods('barrel', 1).pen).toBeGreaterThan(0);
    expect(slotMods('barrel', 20).pen).toBeGreaterThan(slotMods('barrel', 1).pen);
    expect(slotMods('barrel', 40).pen).toBeGreaterThan(slotMods('barrel', 20).pen);
    expect(slotMods('barrel', 60).pen).toBeGreaterThan(slotMods('barrel', 40).pen);
  });

  it('pays XP from distance, kills, and heads — not from a road clear', () => {
    expect(ECONOMY.xpPerMeter).toBe(0.1);
    expect(ECONOMY.xpPerKill).toBe(5);
    expect(ECONOMY.xpPerHeadshot).toBe(2);
    const score = createScore();
    onKill(score, 1);
    onHit(score, 'head', false);
    extractBonus(score, 0);
    expect(score.xp).toBe(ECONOMY.xpPerKill + ECONOMY.xpPerHeadshot);
    expect(score.extractCash).toBe(150);
    expect(score.cash).toBe(ECONOMY.cashPerKill + 150);
  });

  it('pays $150 to clear Forest, then $50 more per later road, capped at $400', () => {
    expect(extractCash(0)).toBe(150);
    expect(extractCash(1)).toBe(200);
    expect(extractCash(4)).toBe(350);
    expect(extractCash(5)).toBe(400);
    expect(extractCash(10)).toBe(400);
    expect(extractCash(19)).toBe(400);
    expect(extractCash(40)).toBe(400);
    expect(ECONOMY.extractCashCap).toBe(400);
  });

  it('wipes a live profile back to camp defaults', () => {
    const profile = defaultProfile();
    profile.cash = 500;
    profile.xp = 80;
    profile.unlockedLevel = 2;
    resetProfile(profile);
    expect(profile).toEqual(defaultProfile());
  });

  it('equips a mag rank as soon as it is bought', () => {
    const profile = defaultProfile();
    profile.cash = 500;
    expect(slotRank(profile, 'magazine')).toBe(0);
    expect(upgradeSlot(profile, 'magazine')).toBe(true);
    expect(slotRank(profile, 'magazine')).toBe(1);
    expect(resolveStats(profile).magSize).toBe(2);
  });

  it('keeps a separate kit per receiver and restores it on switch', () => {
    const profile = defaultProfile();
    profile.cash = 2000;
    expect(upgradeSlot(profile, 'magazine')).toBe(true);
    expect(resolveStats(profile).magSize).toBe(2);
    expect(buyPart(profile, 't2_tactical', RECEIVERS.t2_tactical.cost)).toBe(true);
    expect(profile.loadout.receiver).toBe('t2_tactical');
    expect(resolveStats(profile).magSize).toBe(1);
    expect(slotRank(profile, 'magazine', 't1_stock')).toBe(1);
    expect(slotRank(profile, 'magazine', 't2_tactical')).toBe(0);
    expect(upgradeSlot(profile, 'magazine')).toBe(true);
    expect(resolveStats(profile).magSize).toBe(2);
    expect(equipPart(profile, 'receiver', 't1_stock')).toBe(true);
    expect(profile.loadout.receiver).toBe('t1_stock');
    expect(resolveStats(profile).magSize).toBe(2);
    expect(equipPart(profile, 'receiver', 't2_tactical')).toBe(true);
    expect(slotRank(profile, 'magazine', 't1_stock')).toBe(1);
    expect(slotRank(profile, 'magazine', 't2_tactical')).toBe(1);
  });

  it('hydrates per-receiver kits and restores them on switch', () => {
    const profile = hydrateProfile({
      cash: 10,
      owned: ['t1_stock', 't2_tactical'],
      loadout: { receiver: 't1_stock' },
      kits: {
        t1_stock: {
          owned: ['mag_2', 'bolt_polished'],
          loadout: { magazine: 'mag_2', bolt: 'bolt_polished' },
        },
      },
    });
    expect(profile.owned).toEqual(['t1_stock', 't2_tactical']);
    expect(slotRank(profile, 'magazine', 't1_stock')).toBe(1);
    expect(slotRank(profile, 'bolt', 't1_stock')).toBe(20);
    expect(resolveStats(profile).magSize).toBe(2);
    expect(equipPart(profile, 'receiver', 't2_tactical')).toBe(true);
    expect(slotRank(profile, 'magazine', 't2_tactical')).toBe(0);
    expect(resolveStats(profile).magSize).toBe(1);
    expect(equipPart(profile, 'receiver', 't1_stock')).toBe(true);
    expect(slotRank(profile, 'magazine')).toBe(1);
    expect(slotRank(profile, 'bolt')).toBe(20);
  });

  it('does not treat a flat owned part list as the equipped kit', () => {
    const profile = hydrateProfile({
      owned: ['t1_stock', 'mag_2'],
      loadout: { receiver: 't1_stock', magazine: 'mag_2' },
    });
    expect(slotRank(profile, 'magazine')).toBe(0);
    expect(profile.loadout.receiver).toBe('t1_stock');
    expect(owns(profile, 'mag_2')).toBe(false);
  });

  it('renames a saved Advanced receiver onto the fifth gun', () => {
    const profile = hydrateProfile({
      owned: ['t1_stock', 't2_tactical', 't3_ordnance', 't4_advanced'],
      loadout: { receiver: 't4_advanced' },
      kits: {
        t4_advanced: {
          owned: ['muzzle_comp'],
          loadout: { muzzle: 'muzzle_comp' },
        },
      },
    });
    expect(profile.owned).toContain('t5_advanced');
    expect(profile.owned).toContain('t4_duty');
    expect(profile.owned).not.toContain('t4_advanced');
    expect(profile.loadout.receiver).toBe('t5_advanced');
    expect(slotRank(profile, 'muzzle', 't5_advanced')).toBe(20);
  });
});

describe('gunsmith catalog', () => {
  it('lists every attachment slot with a 0–100 upgrade', () => {
    const slots = SLOTS.filter((slot) => slot !== 'receiver');
    expect(slots).toEqual(Object.keys(SLOT_UPGRADES));
    for (const slot of slots) {
      expect(SLOT_UPGRADES[slot].perRank || SLOT_UPGRADES[slot].thresholds).toBeTruthy();
      expect(upgradeCost(slot, 0)).toBeGreaterThan(0);
      expect(upgradeCost(slot, SLOT_MAX)).toBe(0);
    }
    expect(RECEIVERS.t1_stock.short).toBe('Shoddy');
    expect(RECEIVERS.t2_tactical.short).toBe('Basic');
    expect(RECEIVERS.t3_ordnance.short).toBe('Advanced');
    expect(RECEIVERS.t4_duty.short).toBe('Expert');
    expect(RECEIVERS.t5_advanced.short).toBe('Elite');
  });

  it('unlocks mag, bolt, and ammo on Shoddy, then two slots per later gun, three on Elite', () => {
    expect(SLOTS).toEqual([
      'receiver',
      'magazine',
      'bolt',
      'ammo',
      'barrel',
      'springs',
      'grip',
      'optic',
      'stock',
      'trigger',
      'muzzle',
      'gasBlock',
      'laser',
    ]);
    expect(SLOT_MIN_TIER).toEqual({
      receiver: 1,
      magazine: 1,
      bolt: 1,
      ammo: 1,
      barrel: 2,
      springs: 2,
      grip: 3,
      optic: 3,
      stock: 4,
      trigger: 4,
      muzzle: 5,
      gasBlock: 5,
      laser: 5,
    });
    expect(slotUnlockedFor('t1_stock', 'magazine')).toBe(true);
    expect(slotUnlockedFor('t1_stock', 'bolt')).toBe(true);
    expect(slotUnlockedFor('t1_stock', 'ammo')).toBe(true);
    expect(slotUnlockedFor('t1_stock', 'barrel')).toBe(false);
    expect(slotUnlockedFor('t1_stock', 'springs')).toBe(false);
    expect(slotUnlockedFor('t1_stock', 'grip')).toBe(false);
    expect(slotUnlockedFor('t2_tactical', 'barrel')).toBe(true);
    expect(slotUnlockedFor('t2_tactical', 'springs')).toBe(true);
    expect(slotUnlockedFor('t2_tactical', 'grip')).toBe(false);
    expect(slotUnlockedFor('t2_tactical', 'optic')).toBe(false);
    expect(slotUnlockedFor('t3_ordnance', 'grip')).toBe(true);
    expect(slotUnlockedFor('t3_ordnance', 'optic')).toBe(true);
    expect(slotUnlockedFor('t3_ordnance', 'stock')).toBe(false);
    expect(slotUnlockedFor('t3_ordnance', 'trigger')).toBe(false);
    expect(slotUnlockedFor('t3_ordnance', 'muzzle')).toBe(false);
    expect(slotUnlockedFor('t4_duty', 'stock')).toBe(true);
    expect(slotUnlockedFor('t4_duty', 'trigger')).toBe(true);
    expect(slotUnlockedFor('t4_duty', 'muzzle')).toBe(false);
    expect(slotUnlockedFor('t5_advanced', 'muzzle')).toBe(true);
    expect(slotUnlockedFor('t5_advanced', 'gasBlock')).toBe(true);
    expect(slotUnlockedFor('t5_advanced', 'laser')).toBe(true);
  });

  it('lets Shoddy raise mag, RoF, and damage through slot ranks', () => {
    const starter = resolveStats(defaultProfile());
    expect(starter.magSize).toBe(1);
    expect(slotRank(defaultProfile(), 'ammo')).toBe(0);
    const mag = setRanks(defaultProfile(), { magazine: 1 });
    expect(resolveStats(mag).magSize).toBe(2);
    const bolt = setRanks(defaultProfile(), { bolt: 20 });
    expect(resolveStats(bolt).rof).toBeGreaterThan(starter.rof);
    const ammo = setRanks(defaultProfile(), { ammo: 20 });
    expect(resolveStats(ammo).damage).toBeCloseTo(starter.damage + slotMods('ammo', 20).damage);
    expect(slotMods('ammo', 20).damage).toBeCloseTo(1.8);
    expect(slotMods('ammo', 60).damage).toBeGreaterThan(slotMods('ammo', 40).damage);
  });

  it('makes bigger mags take longer to seat without a cliff at 80', () => {
    const small = resolveStats(gunAt('t5_advanced', { magazine: 4 }));
    const mid = resolveStats(gunAt('t5_advanced', { magazine: 32 }));
    const huge = resolveStats(gunAt('t5_advanced', { magazine: 80 }));
    expect(small.reload).toBeCloseTo(RECEIVERS.t5_advanced.base.reload);
    expect(mid.reload).toBeGreaterThan(small.reload);
    expect(huge.reload).toBeGreaterThan(mid.reload);
    expect(huge.reload - mid.reload).toBeLessThan(1);
  });

  it('prices later levels from a base cost and a rate', () => {
    expect(upgradeCost('bolt', 0)).toBe(SLOT_UPGRADES.bolt.baseCost);
    expect(upgradeCost('bolt', 20)).toBeGreaterThan(upgradeCost('bolt', 0));
    expect(upgradeCost('ammo', 0)).toBe(100);
    expect(upgradeCost('muzzle', 40)).toBeGreaterThan(upgradeCost('muzzle', 20));
    expect(upgradeCost('muzzle', 80)).toBeGreaterThan(upgradeCost('muzzle', 60));
  });

  it('tightens muzzle bloom and spread as the rank climbs', () => {
    const comp = slotMods('muzzle', 20);
    const brake = slotMods('muzzle', 40);
    const ported = slotMods('muzzle', 60);
    const hybrid = slotMods('muzzle', 80);
    expect(brake.bloomPerShot).toBeLessThan(comp.bloomPerShot);
    expect(hybrid.bloomPerShot).toBeLessThan(brake.bloomPerShot);
    expect(ported.baseSpread).toBeLessThan(brake.baseSpread);
    expect(hybrid.baseSpread).toBeLessThan(ported.baseSpread);
  });

  it('keeps high gas ranks a cycle upgrade over mid ranks', () => {
    const over = resolveStats(gunAt('t5_advanced', { gasBlock: 40 }));
    const piston = resolveStats(gunAt('t5_advanced', { gasBlock: 60 }));
    expect(piston.rof).toBeGreaterThan(over.rof);
    expect(piston.heatBuild).toBeLessThan(over.heatBuild);
  });

  it('caps Shoddy slots at 20 and refuses locked parts', () => {
    const profile = defaultProfile();
    profile.cash = 1e9;
    setRanks(profile, { magazine: SLOT_MAX });
    expect(upgradeSlot(profile, 'magazine')).toBe(false);
    expect(slotRank(profile, 'magazine')).toBe(20);
    expect(slotRank(profile, 'magazine')).not.toBe(SLOT_MAX);
    expect(upgradeSlot(profile, 'barrel')).toBe(false);
  });

  it('lets Elite slots reach 100', () => {
    const profile = gunAt('t5_advanced');
    profile.cash = 1e9;
    setRanks(profile, { magazine: SLOT_MAX }, 't5_advanced');
    expect(slotRank(profile, 'magazine', 't5_advanced')).toBe(SLOT_MAX);
    expect(upgradeSlot(profile, 'magazine', 't5_advanced')).toBe(false);
  });

  it('caps slot ranks by receiver tier', () => {
    expect(slotCapFor('t1_stock')).toBe(20);
    expect(slotCapFor('t2_tactical')).toBe(40);
    expect(slotCapFor('t3_ordnance')).toBe(60);
    expect(slotCapFor('t4_duty')).toBe(80);
    expect(slotCapFor('t5_advanced')).toBe(100);
  });

  it('clamps unequipped kits to that receiver’s cap on hydrate', () => {
    const profile = hydrateProfile({
      owned: ['t1_stock', 't2_tactical'],
      loadout: { receiver: 't2_tactical' },
      kits: { t1_stock: { ranks: { magazine: 80 } } },
    });
    expect(profile.kits.t1_stock.ranks.magazine).toBe(20);
  });

  it('resolves Gunsmith stats for the browsed receiver', () => {
    const profile = gunAt('t2_tactical', { magazine: 8 });
    expect(equipPart(profile, 'receiver', 't1_stock')).toBe(true);
    expect(resolveStats(profile).magSize).toBe(1);
    expect(resolveStats(profile, 't2_tactical').magSize).toBe(9);
  });

  it('prints each Gunsmith part as rank over that gun’s cap', () => {
    const stub = {
      onclick: null,
      className: '',
      textContent: '',
      dataset: {},
      disabled: false,
      classList: { add() {}, contains: () => false, toggle() {} },
      style: {},
      parentElement: null,
      addEventListener() {},
      appendChild() {},
      querySelector() {
        return stub;
      },
      querySelectorAll() {
        return [];
      },
      setAttribute() {},
    };
    const el = {
      dataset: {},
      innerHTML: '',
      querySelector: () => stub,
      querySelectorAll: () => [],
    };
    const prev = globalThis.document;
    globalThis.document = { createElement: () => stub };
    try {
      renderGunsmith(el, defaultProfile(), { hub() {}, back() {} });
      expect(el.innerHTML).toContain('>0/20<');
      expect(el.innerHTML).not.toContain('>0/100<');
      const basic = gunAt('t2_tactical', { magazine: 12, barrel: 3 });
      el.dataset.rec = 't2_tactical';
      renderGunsmith(el, basic, { hub() {}, back() {} });
      expect(el.innerHTML).toContain('>12/40<');
      expect(el.innerHTML).toContain('>3/40<');
      expect(el.innerHTML).toContain('>0/40<');
    } finally {
      globalThis.document = prev;
    }
  });
});

describe('loadout aim stats', () => {
  it('gives starter a limited reach and non-zero base spread', () => {
    const stats = resolveStats(defaultProfile());
    expect(stats.magSize).toBe(1);
    expect(stats.aimReach).toBeGreaterThanOrEqual(AIM_REACH_MIN);
    expect(stats.aimReach).toBeCloseTo(AIM_REACH_BASE, 5);
    expect(stats.shotRange).toBeCloseTo(SHOT_REACH_BASE, 5);
    expect(stats.baseSpread).toBe(4);
  });

  it('places base shot range two-thirds across the screen', () => {
    const viewport = { w: 1280, h: 720 };
    const stats = resolveStats(defaultProfile());
    const range = effectiveShotRange(stats, viewport);
    const gunX = viewport.w * PLAYER_SCREEN_X_RATIO;
    expect(gunX + range).toBeCloseTo(viewport.w * SHOT_SCREEN_FRAC, 5);
  });

  it('places iron sights at a third of the screen, short of gun range', () => {
    const viewport = { w: 1280, h: 720 };
    const stats = resolveStats(defaultProfile());
    const sight = effectiveAimReach(stats, viewport);
    const gunX = viewport.w * PLAYER_SCREEN_X_RATIO;
    expect(gunX + sight).toBeCloseTo(viewport.w * AIM_SCREEN_FRAC, 5);
    expect(AIM_SCREEN_FRAC).toBeCloseTo(0.35, 5);
    expect(sight).toBeLessThan(effectiveShotRange(stats, viewport));
  });

  it('lets optics extend the sight picture and tighten spread without adding gun range', () => {
    const irons = resolveStats(gunAt('t3_ordnance'));
    const dot = resolveStats(gunAt('t3_ordnance', { optic: 20 }));
    const scoped = resolveStats(gunAt('t3_ordnance', { optic: 40 }));
    const viewport = { w: 1280, h: 720 };
    const gunX = viewport.w * PLAYER_SCREEN_X_RATIO;
    expect(dot.aimReach).toBeGreaterThan(irons.aimReach);
    expect(scoped.aimReach).toBeGreaterThan(dot.aimReach);
    expect(gunX + effectiveAimReach(dot, viewport)).toBeLessThan(viewport.w * 0.5);
    expect(gunX + effectiveAimReach(scoped, viewport)).toBeGreaterThan(viewport.w * 0.5);
    expect(gunX + effectiveAimReach(scoped, viewport)).toBeLessThan(viewport.w * 0.7);
    expect(scoped.baseSpread).toBeLessThan(irons.baseSpread);
    expect(dot.critChance).toBeGreaterThan(irons.critChance);
    expect(scoped.critChance).toBeGreaterThan(dot.critChance);
    expect(scoped.shotRange).toBeCloseTo(irons.shotRange, 5);
    expect(effectiveShotRange(scoped, viewport)).toBeCloseTo(effectiveShotRange(irons, viewport), 5);
    expect(usesFullScreenAim(scoped)).toBe(false);
  });

  it('lets only a high optic rank hold the whole screen', () => {
    const acog = resolveStats(gunAt('t3_ordnance', { optic: 40 }));
    const lpvo = resolveStats(gunAt('t3_ordnance', { optic: 50 }));
    const viewport = { w: 1280, h: 720 };
    expect(usesFullScreenAim(acog)).toBe(false);
    expect(usesFullScreenAim(lpvo)).toBe(true);
    const terrain = createTerrain(1, 720, { id: 'forest' });
    const player = createPlayer(0, terrain);
    const far = resolveAimPoint(1240, 40, player, viewport, effectiveAimReach(lpvo, viewport), {
      fullScreen: true,
    });
    expect(far.clamped).toBe(false);
    expect(far.x).toBe(1240);
    expect(far.y).toBe(40);
    const disc = resolveAimPoint(1240, 40, player, viewport, effectiveAimReach(acog, viewport));
    expect(disc.clamped).toBe(true);
    expect(Math.hypot(disc.x - disc.anchorX, disc.y - disc.anchorY)).toBeLessThan(520);
  });

  it('lets barrels add gun range without stretching the reticle', () => {
    const stub = resolveStats(gunAt('t2_tactical'));
    const rifle = resolveStats(gunAt('t2_tactical', { barrel: 40 }));
    const viewport = { w: 1280, h: 720 };
    expect(rifle.shotRange).toBeGreaterThan(stub.shotRange);
    expect(rifle.aimReach).toBeCloseTo(stub.aimReach, 5);
    expect(effectiveShotRange(rifle, viewport)).toBeGreaterThan(effectiveShotRange(stub, viewport));
    expect(effectiveAimReach(rifle, viewport)).toBeCloseTo(effectiveAimReach(stub, viewport), 5);
    expect(rifle.damage).toBeGreaterThan(stub.damage);
    expect(slotMods('barrel', 1).damage).toBeGreaterThan(0);
  });

  it('gives Advanced a grip, Expert a trigger, and Elite a laser', () => {
    const grooved = resolveStats(gunAt('t3_ordnance', { grip: 60 }));
    expect(grooved.baseSpread).toBeLessThan(resolveStats(gunAt('t3_ordnance')).baseSpread);

    const stockTrig = resolveStats(gunAt('t4_duty'));
    expect(resolveStats(gunAt('t4_duty', { trigger: 60 })).rof).toBeGreaterThan(stockTrig.rof);

    const dark = resolveStats(gunAt('t5_advanced'));
    expect(dark.laserSight).toBe(0);
    const lit = resolveStats(gunAt('t5_advanced', { laser: 1 }));
    expect(lit.laserSight).toBeGreaterThan(0);
    expect(lit.baseSpread).toBeLessThan(dark.baseSpread);
  });

  it('tightens marksman without unlocking extra sight reach', () => {
    const profile = gunAt('t4_duty', { stock: 60 });
    profile.skillRanks.marksman = 8;
    const stats = resolveStats(profile);
    const stock = resolveStats(defaultProfile());
    expect(stats.aimReach).toBeCloseTo(stock.aimReach, 5);
    expect(usesFullScreenAim(stats)).toBe(false);
    expect(stats.baseSpread).toBeLessThan(stock.baseSpread);
    expect(stats.aimRate).toBeGreaterThan(stock.aimRate);
    expect(stats.aimReach).toBeLessThanOrEqual(AIM_REACH_MAX);
  });

  it('includes base spread in the shot cone even at zero bloom', () => {
    const stats = resolveStats(defaultProfile());
    const deg = shotSpreadDeg(stats, { bloom: 0, heat: 0 });
    expect(deg).toBe(stats.baseSpread);
  });

  it('keeps first-shot spread sloppy until a finished Elite kit plus max Marksman', () => {
    expect(STAT_BY_ID.baseSpread.max).toBeUndefined();
    expect(STAT_BY_ID.baseSpread.min).toBe(0);
    expect(RECEIVERS.t1_stock.base.baseSpread).toBe(4);
    expect(RECEIVERS.t2_tactical.base.baseSpread).toBeCloseTo(3.88, 5);
    expect(RECEIVERS.t3_ordnance.base.baseSpread).toBeCloseTo(3.76, 5);
    expect(RECEIVERS.t4_duty.base.baseSpread).toBeCloseTo(3.64, 5);
    expect(RECEIVERS.t5_advanced.base.baseSpread).toBeCloseTo(3.52, 5);

    const maxParts = {
      magazine: SLOT_MAX,
      bolt: SLOT_MAX,
      ammo: SLOT_MAX,
      barrel: SLOT_MAX,
      springs: SLOT_MAX,
      grip: SLOT_MAX,
      optic: SLOT_MAX,
      stock: SLOT_MAX,
      trigger: SLOT_MAX,
      muzzle: SLOT_MAX,
      gasBlock: SLOT_MAX,
      laser: SLOT_MAX,
    };

    const marksman = gunAt('t1_stock');
    marksman.skillRanks.marksman = SKILLS.marksman.maxRank;
    expect(resolveStats(marksman).baseSpread).toBeCloseTo(2.4, 5);

    const basicDone = gunAt('t2_tactical', maxParts);
    basicDone.skillRanks.marksman = SKILLS.marksman.maxRank;
    expect(resolveStats(basicDone).baseSpread).toBeGreaterThan(1.5);

    const advancedDone = gunAt('t3_ordnance', maxParts);
    advancedDone.skillRanks.marksman = SKILLS.marksman.maxRank;
    expect(resolveStats(advancedDone).baseSpread).toBeGreaterThan(0.5);

    const expertDone = gunAt('t4_duty', maxParts);
    expertDone.skillRanks.marksman = SKILLS.marksman.maxRank;
    expect(resolveStats(expertDone).baseSpread).toBeGreaterThan(0);

    const eliteParts = gunAt('t5_advanced', maxParts);
    expect(resolveStats(eliteParts).baseSpread).toBeGreaterThan(0.8);
    eliteParts.skillRanks.marksman = SKILLS.marksman.maxRank;
    expect(resolveStats(eliteParts).baseSpread).toBe(0);
  });
});

describe('aim clamp', () => {
  it('leaves in-range pointers alone', () => {
    const p = clampAimPoint(110, 100, 100, 100, 50);
    expect(p).toEqual({ x: 110, y: 100, clamped: false });
  });

  it('pulls far pointers onto the reach ring', () => {
    const p = clampAimPoint(400, 100, 100, 100, 50);
    expect(p.clamped).toBe(true);
    expect(Math.hypot(p.x - 100, p.y - 100)).toBeCloseTo(50, 5);
  });

  it('clamps LPVO pointers to the viewport instead of a disc', () => {
    const inside = clampToViewport(100, 80, 1280, 720);
    expect(inside).toEqual({ x: 100, y: 80, clamped: false });
    const corner = clampToViewport(1400, -20, 1280, 720);
    expect(corner).toEqual({ x: 1280, y: 0, clamped: true });
  });

  it('resolves against the gun screen anchor', () => {
    const terrain = createTerrain(1, 720);
    const player = createPlayer(0, terrain);
    player.aimAngle = 0;
    const viewport = { w: 1280, h: 720 };
    const aim = resolveAimPoint(900, 200, player, viewport, 160);
    expect(aim.reach).toBe(160);
    expect(Math.hypot(aim.x - aim.anchorX, aim.y - aim.anchorY)).toBeLessThanOrEqual(160.01);
  });
});

describe('reload helpers', () => {
  it('guards reloadNorm against zero duration', () => {
    expect(reloadNorm({ reloading: true, reloadT: 0.5, reloadDur: 0 })).toBe(0);
    expect(reloadNorm({ reloading: false, reloadT: 1, reloadDur: 2 })).toBe(0);
    expect(reloadNorm({ reloading: true, reloadT: 1, reloadDur: 2 })).toBe(0.5);
  });

  it('places the perfect band so 2s is 20% through on a 3s reload', () => {
    const starter = resolveStats(defaultProfile());
    expect(starter.reload).toBe(3);
    const band = perfectBand(starter);
    expect(band.b - band.a).toBeCloseTo(starter.perfectWidth, 6);
    const twoSeconds = 2 / starter.reload;
    expect((twoSeconds - band.a) / (band.b - band.a)).toBeCloseTo(PERFECT_MARK_IN_BAND, 5);
    expect(twoSeconds).toBeCloseTo(PERFECT_MARK, 10);
  });

  it('raises cyclic rate 10% on a perfect mag', () => {
    const starter = resolveStats(defaultProfile());
    expect(magRof(starter, { perfectMag: false })).toBeCloseTo(starter.rof);
    expect(magRof(starter, { perfectMag: true })).toBeCloseTo(starter.rof * PERFECT_MAG_ROF);
  });

  it('fills the shot cycle from magRof so a perfect mag matches the HUD', () => {
    const starter = resolveStats(defaultProfile());
    expect(shotCycle(starter, { cooldown: 0, perfectMag: false })).toBe(1);
    expect(shotCycle(starter, { cooldown: 1 / starter.rof, perfectMag: false })).toBeCloseTo(0);
    expect(shotCycle(starter, { cooldown: 0.5 / (starter.rof * PERFECT_MAG_ROF), perfectMag: true })).toBeCloseTo(0.5);
    expect(shotCycle(starter, { cooldown: 0, reloading: true })).toBe(0);
  });

  it('keeps metre labels from reading as om', () => {
    expect(formatMetres(0)).toBe('0 m');
    expect(formatMetres(12.9)).toBe('12 m');
    expect(formatMetres(Number.NaN)).toBe('0 m');
  });
});

describe('skills & profile', () => {
  it('includes marksman in empty ranks', () => {
    expect(SKILLS.recoil.maxRank).toBe(100);
    expect(SKILLS.critChance.maxRank).toBe(100);
    expect(SKILLS.marksman.maxRank).toBe(100);
    expect(SKILLS.speed).toBeTruthy();
    expect(SKILLS.firing).toBeTruthy();
    expect(Object.keys(SKILLS).length % 2).toBe(0);
    const paced = defaultProfile();
    paced.skillRanks.speed = 4;
    paced.skillRanks.firing = 5;
    const starter = resolveStats(defaultProfile());
    const trained = resolveStats(paced);
    expect(trained.moveMul).toBeGreaterThan(starter.moveMul);
    expect(trained.rof).toBeGreaterThan(starter.rof);
  });

  it('drops unknown skill ranks and clamps known ones', () => {
    const ranks = sanitizeRanks({ nope: 2, marksman: 1, recoil: 99 });
    expect(ranks.nope).toBeUndefined();
    expect(ranks.marksman).toBe(1);
    expect(ranks.recoil).toBe(99);
    expect(ranks.firing).toBe(0);
    expect(sanitizeRanks({ recoil: 199 }).recoil).toBe(SKILLS.recoil.maxRank);
    expect(SKILLS.recoil.maxRank).toBe(100);
  });

  it('prices skill ranks with a mild curve', () => {
    for (const def of Object.values(SKILLS)) {
      expect(def.baseCost).toBe(40);
      expect(skillCost(def, 0)).toBe(40);
      expect(skillCost(def, 1)).toBe(60);
      expect(skillCost(def, 3)).toBe(100);
      expect(skillCost(def, 19)).toBe(420);
      expect(skillCost(def, 20)).toBe(440);
    }
  });

  it('blocks later receivers until the previous gun is owned', () => {
    const profile = defaultProfile();
    expect(buyBlockedReason(profile, 't3_ordnance')).toBe('Need previous');
    expect(buyBlockedReason(profile, 't2_tactical')).toBeNull();
  });

  it('scales legacy skill ranks 5× and keeps xpSpent on the old curve', () => {
    const oldRanks = sanitizeRanks({ recoil: 4 });
    const profile = hydrateProfile({ skillRanks: { recoil: 4 } }, { scaleSkills: true });
    expect(profile.skillRanks.recoil).toBe(20);
    expect(profile.xpSpent).toBe(xpInvested(oldRanks));
  });

  it('renders death on the camp stack with a named Retry road', () => {
    const stub = { onclick: null };
    const el = {
      innerHTML: '',
      querySelector: () => stub,
      querySelectorAll: () => [],
    };
    renderEnd(el, {
      title: 'You barely escape alive...',
      run: {
        biome: { place: 'Forest Road' },
        endless: false,
        levelIndex: 0,
        ended: 'death',
        score: { lastMetersPaid: 87, kills: 3, headshots: 1, perfects: 0, cash: 30, xp: 12 },
      },
      profile: defaultProfile(),
      handlers: { retry() {}, hub() {}, gunsmith() {}, training() {} },
      extract: false,
    });
    expect(el.innerHTML).toContain('camp-stack');
    expect(el.innerHTML).toContain('GUNNY');
    expect(el.innerHTML).toContain('You barely escape alive...');
    expect(el.innerHTML).toContain(`Forest Road · ${TRACK_METERS}m`);
    expect(el.innerHTML).not.toContain('Same road');
  });

  it('only auto-fullscreens the Android WebAPK unless the setting is on', () => {
    expect(defaultSettings().fullscreen).toBe(false);
    expect(wantsImmersive({ fullscreen: false }, { android: false, installed: false })).toBe(false);
    expect(wantsImmersive({ fullscreen: false }, { android: true, installed: false })).toBe(false);
    expect(wantsImmersive({ fullscreen: false }, { android: false, installed: true })).toBe(false);
    expect(wantsImmersive({ fullscreen: false }, { android: true, installed: true })).toBe(true);
    expect(wantsImmersive({ fullscreen: true }, { android: false, installed: false })).toBe(true);
    expect(
      usesHtmlFullscreen({ fullscreen: false }, { android: true, installed: true, displayFullscreen: true }),
    ).toBe(false);
    expect(
      usesHtmlFullscreen({ fullscreen: false }, { android: true, installed: true, displayFullscreen: false }),
    ).toBe(true);
    expect(usesHtmlFullscreen({ fullscreen: true }, { android: false, installed: false })).toBe(true);
  });

  it('treats a portrait media query as portrait', () => {
    expect(isPortrait({ matchMedia: () => ({ matches: true }) })).toBe(true);
    expect(isPortrait({ matchMedia: () => ({ matches: false }) })).toBe(false);
    expect(isPortrait(null)).toBe(false);
  });
});

describe('world helpers', () => {
  it('cycles biomes and unlocks beaten skins for endless', () => {
    expect(biomeFor(0).id).toBe('forest');
    expect(biomeFor(BIOMES.length).id).toBe('forest');
    expect(beatenRoadIndexes(0)).toEqual([0]);
    expect(beatenRoadIndexes(1)).toEqual([0]);
    expect(beatenRoadIndexes(2)).toEqual([0, 1]);
    expect(beatenRoadIndexes(BIOMES.length + 1)).toHaveLength(BIOMES.length);
  });

  it('uses rolling hills instead of tiny bumps', () => {
    expect(TERRAIN_AMP).toBeGreaterThanOrEqual(0.14);
    const h = 720;
    const forest = createTerrain(1, h, { id: 'forest' });
    const desert = createTerrain(1, h, { id: 'desert' });
    const stand = playerHeadClearance();
    const floorY = h * (1 - TERRAIN_FLOOR_PAD);
    const peakY = h * TERRAIN_HEADROOM + stand;
    let min = Infinity;
    let max = -Infinity;
    let forestSteep = 0;
    let desertSteep = 0;
    for (let x = 0; x < 24000; x += 40) {
      const y = forest.height(x);
      min = Math.min(min, y);
      max = Math.max(max, y);
      expect(y).toBeGreaterThanOrEqual(peakY - 0.75);
      expect(y).toBeLessThanOrEqual(floorY + 0.75);
      forestSteep = Math.max(forestSteep, Math.abs(forest.slope(x)));
      desertSteep = Math.max(desertSteep, Math.abs(desert.slope(x)));
    }
    expect(max - min).toBeGreaterThan((floorY - peakY) * 0.32);
    expect(forestSteep).toBeGreaterThan(desertSteep);
    expect(forestSteep).toBeLessThan(0.38);
  });

  it('trees tower over the gunner', () => {
    const stand = playerHeadClearance();
    expect(deciduousH('near', 0)).toBeGreaterThan(stand * 1.7);
    expect(pineH('near', 0)).toBeGreaterThan(stand * 1.7);
    expect(deciduousH('far', 0)).toBeGreaterThan(stand);
    expect(pineH('far', 0)).toBeGreaterThan(stand);
  });

  it('scales enemy pools by hpMul', () => {
    const soft = enemyHp(0.82);
    const hard = enemyHp(1.15);
    expect(hard.body).toBeGreaterThan(soft.body);
    expect(hard.legs).toBeGreaterThan(soft.legs);
  });
});

describe('util', () => {
  it('keeps uhash deterministic and in unit range', () => {
    expect(uhash(42)).toBe(uhash(42));
    expect(uhash(7)).toBeGreaterThanOrEqual(0);
    expect(uhash(7)).toBeLessThan(1);
  });

  it('mixes tones toward hex results', () => {
    expect(mixTone('#000000', '#ffffff', 0.5)).toMatch(/^#[0-9a-f]{6}$/);
    expect(mixHex('#ff0000', '#0000ff', 0.5)).toMatch(/^rgba\(/);
  });
});

describe('hit impulse', () => {
  const dt = 1 / 60;
  const terrain = { height: () => 0 };
  const hit = { nx: 1, energy: 1, zone: 'upper' };

  function chase(enemy) {
    stepFlinch(enemy, dt);
    const hitch = enemy.stun > 0 ? HIT_IMPULSE.stunHitch : 1;
    enemy.worldX -= enemy.speed * hitch * dt;
  }

  it('gives stopping hits more energy than overpen at the same speed', () => {
    expect(shotEnergy(820, true)).toBeGreaterThan(shotEnergy(820, false));
    expect(shotEnergy(1640, true)).toBeGreaterThan(shotEnergy(820, true));
    expect(shotEnergy(820, false)).toBeCloseTo(shotEnergy(820, true) * HIT_IMPULSE.overpen);
  });

  it('scales stopping energy by remaining pen instead of a full flesh cost', () => {
    expect(shotEnergy(820, true, 0.05)).toBeCloseTo(shotEnergy(820, true) * 0.05);
    expect(shotEnergy(820, true, 0.05)).toBeLessThan(shotEnergy(820, true));
  });

  it('kicks ragdoll nodes with Verlet velocity instead of a pose shift', () => {
    const enemy = { worldX: 0, y: 0, kind: 'zombie', id: 1, crawling: false, severedHead: false };
    const rag = spawnRagdoll(enemy, { nx: 1, ny: 0, energy: 1, zone: 'upper' }, () => 0.5);
    const rib = rag.nodes.find((n) => n.id === 'rib');
    const toe = rag.nodes.find((n) => n.id === 'lToe');
    expect(rib.x - rib.ox).toBeGreaterThan(2);
    expect(rib.ox).not.toBe(rib.x);
    expect(rib.mass).toBeGreaterThan(0);
    expect(Math.abs(rib.x - rib.ox)).toBeGreaterThan(Math.abs(toe.x - toe.ox));
    expect(
      rag.links.some((l) => {
        const a = rag.nodes[l.a];
        const b = rag.nodes[l.b];
        return (a.id === 'head' && b.id === 'junction') || (a.id === 'junction' && b.id === 'head');
      }),
    ).toBe(true);
  });

  it('keeps corpses in view and drops ones the camera has already left', () => {
    const run = {
      player: { worldX: 0 },
      frozenCorpses: [
        { nodes: [{ id: 'pelvis', x: 80, y: 400 }] },
        { nodes: [{ id: 'pelvis', x: 4200, y: 400 }] },
      ],
    };
    cullFrozenCorpses(run, { w: 1280, h: 720 });
    expect(run.frozenCorpses).toHaveLength(1);
    expect(run.frozenCorpses[0].nodes[0].x).toBe(80);
  });

  it('flinches visually without slowing a normal hit, and staggers only on crit', () => {
    const normal = createEnemy(100, terrain, 1, 118);
    applyFlinch(normal, hit);
    expect(normal.stun).toBe(0);
    expect(normal.flinchLean).not.toBe(0);
    const unhit = 100 - normal.speed * dt;
    chase(normal);
    expect(normal.worldX).toBeCloseTo(unhit);

    const crit = createEnemy(100, terrain, 1, 118);
    applyFlinch(crit, hit, { crit: true });
    expect(crit.stun).toBeGreaterThan(0);
    chase(crit);
    expect(crit.worldX).toBeGreaterThan(unhit);

    const pose = { worldX: 0, y: 0, kind: 'zombie', id: 1, crawling: false, flinchLean: 0.35 };
    const idle = poseEnemyLocal({ ...pose, flinchLean: 0 }, { flinch: true });
    const combat = poseEnemyLocal(pose, { flinch: false });
    const drawn = poseEnemyLocal(pose, { flinch: true });
    expect(combat.head.x).toBe(idle.head.x);
    expect(drawn.head.x).not.toBe(combat.head.x);
    const circles = limbCircles(pose);
    expect(circles.head.x).toBe(drawn.head.x);
    expect(circles.lUpp.zone).toBe('upper');
    expect(circles.lThigh.zone).toBe('lLeg');
  });

  it('cannot thread a horizontal round through a standing torso', () => {
    const foe = createEnemy(400, { height: () => 400 }, 1, 80, 'zombie');
    cacheEnemyPose(foe);
    const c = limbCircles(foe);
    const vols = limbCircleList(foe);
    const left = Math.min(...vols.map((v) => v.x - v.r)) - 40;
    const right = Math.max(...vols.map((v) => v.x + v.r)) + 40;
    const top = c.head.y - c.head.r + 2;
    const bot = Math.max(c.pelvis.y + c.pelvis.r, c.lLeg.y + c.lLeg.r, c.rLeg.y + c.rLeg.r) - 2;
    for (let y = top; y <= bot; y += 3) {
      const hit = vols.some((v) => segmentHitsCircle(left, y, right, y, v.x, v.y, v.r));
      expect(hit).toBe(true);
    }
    const cx = (c.upper.x + c.pelvis.x) * 0.5;
    const above = c.head.y - c.head.r - 30;
    const below = bot + 40;
    expect(vols.some((v) => segmentHitsCircle(cx, above, cx, below, v.x, v.y, v.r))).toBe(true);
  });

  it('drops lethal hp on the bar and springs damage floaters', () => {
    const terrain = { height: () => 400 };
    const foe = createEnemy(0, terrain, 1, 80, 'zombie');
    expect(lethalHpRatio(foe)).toBe(1);
    expect(enemyIsHurt(foe)).toBe(false);
    foe.hp.body -= 20;
    expect(lethalHpRatio(foe)).toBeLessThan(1);
    expect(enemyIsHurt(foe)).toBe(true);
    const afterBody = lethalHpRatio(foe);
    foe.hp.legs = 0;
    expect(lethalHpRatio(foe)).toBeCloseTo(afterBody, 5);
    const legs = createEnemy(0, terrain, 1, 80, 'zombie');
    legs.hp.legs = 0;
    expect(enemyIsHurt(legs)).toBe(false);
    expect(lethalHpRatio(legs)).toBe(1);
    expect(isDead(legs)).toBe(false);
    foe.hp.body = 0;
    expect(lethalHpRatio(foe)).toBe(0);
    expect(isDead(foe)).toBe(true);

    const run = {
      callouts: [{ x: 10, y: 80, vx: 20, vy: -240, life: 0.92, maxLife: 0.92, text: '13' }],
      particles: [],
      gibs: [],
      impacts: [],
    };
    stepGibs(run, 0.05);
    expect(run.callouts[0].y).toBeLessThan(80);
    expect(run.callouts[0].life).toBeLessThan(0.92);
  });

  it('uses one body pool, 2× heads, and an 80% crawl bar on the legs', () => {
    expect(LOCATIONAL.head).toBe(2);
    expect(locationalOf('head')).toBe(2);
    expect(locationalOf('upper')).toBe(1);
    expect(locationalOf('lLeg')).toBe(1);
    expect(locationalOf('rLeg')).toBe(1);
    const hp = enemyHp(1);
    expect(hp.body).toBe(50);
    expect(hp.legs).toBe(40);
    expect(hp.head).toBeUndefined();
    expect(hp.torso).toBeUndefined();

    const viewport = { w: 1280, h: 720 };
    const idle = { pointerX: 800, pointerY: 360, firing: false, reloadPressed: false, pointerTap: false };
    const run = createRun({ profile: defaultProfile(), viewport, type: 'campaign', levelIndex: 0, seed: 1 });
    run.paused = false;
    run.spawnTimer = 1e9;
    const foe = createEnemy(run.player.worldX + 280, run.terrain, 1, 80, 'zombie');
    cacheEnemyPose(foe);
    run.enemies = [foe];
    run.stats.damage = 40;
    run.pendingHits = [{
      enemy: foe,
      zone: 'lLeg',
      locational: 1,
      crit: false,
      rangeMul: 1,
      x: foe.worldX,
      y: foe.y,
      nx: 1,
      ny: 0,
    }];
    simulate(run, 1 / 60, viewport, idle);
    expect(foe.hp.body).toBe(50);
    expect(foe.hp.legs).toBeLessThanOrEqual(0);
    expect(foe.crawling).toBe(true);
    expect(foe.alive).toBe(true);
    expect(isDead(foe)).toBe(false);

    run.pendingHits = [{
      enemy: foe,
      zone: 'rLeg',
      locational: 1,
      crit: false,
      rangeMul: 1,
      x: foe.worldX,
      y: foe.y,
      nx: 1,
      ny: 0,
    }];
    run.stats.damage = 200;
    simulate(run, 1 / 60, viewport, idle);
    expect(foe.hp.body).toBe(50);
    expect(foe.alive).toBe(true);
    expect(isDead(foe)).toBe(false);

    const heads = createRun({ profile: defaultProfile(), viewport, type: 'campaign', levelIndex: 0, seed: 1 });
    heads.paused = false;
    heads.spawnTimer = 1e9;
    const skull = createEnemy(heads.player.worldX + 280, heads.terrain, 1, 80, 'zombie');
    cacheEnemyPose(skull);
    heads.enemies = [skull];
    heads.stats.damage = 15;
    heads.pendingHits = [{
      enemy: skull,
      zone: 'head',
      locational: locationalOf('head'),
      crit: false,
      rangeMul: 1,
      x: skull.worldX,
      y: skull.y,
      nx: 1,
      ny: 0,
    }];
    simulate(heads, 1 / 60, viewport, idle);
    expect(skull.hp.body).toBeCloseTo(20);
    expect(skull.hp.legs).toBe(40);
    expect(skull.crawling).toBe(false);
    expect(skull.alive).toBe(true);
  });

  it('kills on torso contact, not a reaching arm', () => {
    const foe = createEnemy(0, { height: () => 400 }, 1, 80, 'zombie');
    cacheEnemyPose(foe);
    const lethal = lethalCircles(foe);
    expect(lethal).toHaveLength(4);
    expect(lethal.every((c) => c.zone === 'head' || c.zone === 'upper' || c.zone === 'lower')).toBe(true);
    expect(lethal.includes(foe.hitCircles.lFore)).toBe(false);
    expect(lethal.includes(foe.hitCircles.rFore)).toBe(false);
  });

  it('counts a hip-height shot as body, not a crawl graze', () => {
    const viewport = { w: 1280, h: 720 };
    const run = createRun({ profile: defaultProfile(), viewport, type: 'campaign', levelIndex: 0, seed: 1 });
    run.paused = false;
    run.spawnTimer = 1e9;
    const foe = createEnemy(run.player.worldX + 280, run.terrain, 1, 80, 'zombie');
    cacheEnemyPose(foe);
    run.enemies = [foe];
    const y = foe.y + foe.pose.pelvis.y;
    const b = spawnBullet(run.player.worldX + 40, y, 0, { ...run.stats, bulletSpeed: 1600, pen: 2 }, false, 800);
    run.bullets = [b];
    run.pendingHits = [];
    for (let i = 0; i < 40; i++) stepBullets(run, 1 / 60, viewport);
    expect(run.pendingHits.length).toBeGreaterThan(0);
    expect(['upper', 'lower', 'head']).toContain(run.pendingHits[0].zone);
  });
});

describe('kinds & stats schema', () => {
  it('tables foe palettes and biome rosters', () => {
    expect(KINDS.ghoul.hunch).toBeGreaterThan(KINDS.vampire.hunch);
    expect(KINDS.zombie.palette.skin).toMatch(/^#/);
    for (const biome of BIOMES) {
      expect(biome.roster.length).toBeGreaterThan(0);
      expect(biome.kind).toBe(biome.roster[0]);
      expect(KINDS[biome.roster[0]]).toBeTruthy();
    }
  });

  it('shows one Training chip per skill, not gunsmith sight or range', () => {
    const fresh = trainingStatRows(resolveStats(defaultProfile()));
    expect(fresh.map((r) => r[0])).toEqual(['Bloom', 'Reload', 'Spread', 'Cash', 'Crit', 'Crit×', 'Speed', 'ROF']);
    expect(fresh).toHaveLength(Object.keys(SKILLS).length);
    expect(fresh.every((r) => r[2])).toBe(true);
    expect(fresh.some((r) => r[0] === 'Sight' || r[0] === 'Range')).toBe(false);
    const trained = defaultProfile();
    trained.skillRanks.marksman = 4;
    trained.skillRanks.scavenger = 2;
    trained.skillRanks.firing = 20;
    const after = trainingStatRows(resolveStats(trained));
    const before = Object.fromEntries(fresh.map((r) => [r[0], r[1]]));
    const next = Object.fromEntries(after.map((r) => [r[0], r[1]]));
    expect(next.Spread).not.toBe(before.Spread);
    expect(next.Cash).not.toBe(before.Cash);
    expect(Number(next.ROF)).toBeGreaterThan(Number(before.ROF));
  });

  it('exposes gunsmith rails from STATS clamps', () => {
    const rows = gunsmithStatRows(resolveStats(defaultProfile()));
    expect(rows.map((r) => r[0])).toEqual(STATS.filter((s) => s.gunsmith).map((s) => s.gunsmithLabel));
    expect(rows.map((r) => r[0])).toEqual(['DMG', 'ROF', 'MAG', 'VEL', 'PEN', 'RLD', 'Range', 'Sight', 'SPRD']);
    expect(rows.find((r) => r[0] === 'ROF')[1]).toBe(String(Math.round(resolveStats(defaultProfile()).rof * 60)));
    expect(rows.find((r) => r[0] === 'SPRD')[1]).toBe('4.00°');
    expect(rows.every((r) => r[2])).toBe(true);
    expect(rows.length).toBeGreaterThanOrEqual(8);
  });

  it('stacks known STATS and ignores unknown part keys', () => {
    expect(STAT_BY_ID.damage.stack).toBe('add');
    expect(STAT_BY_ID.cashMul.stack).toBe('add');
    expect(STAT_BY_ID.fullScreenAim).toBeTruthy();
    const profile = defaultProfile();
    profile.skillRanks.scavenger = 2;
    const stats = resolveStats(profile);
    expect(stats.cashMul).toBeCloseTo(1.028);
    const ghost = defaultProfile();
    ghost.kits.t1_stock.ranks.ammo = 1;
    const after = resolveStats(ghost);
    expect(after.notAStat).toBeUndefined();
    expect(after.damage).toBeGreaterThan(resolveStats(defaultProfile()).damage);
  });
});

describe('walker roles', () => {
  const terrain = { height: () => 400 };

  it('gates tank, heavy, and behemoth just before each receiver payday', () => {
    expect(roleUnlocked('tank', { levelIndex: ROLE_UNLOCK.tank.road - 1 })).toBe(false);
    expect(roleUnlocked('tank', { levelIndex: ROLE_UNLOCK.tank.road })).toBe(true);
    expect(ROLE_UNLOCK.tank.road).toBe(2);
    expect(roleUnlocked('heavy', { levelIndex: ROLE_UNLOCK.heavy.road - 1 })).toBe(false);
    expect(roleUnlocked('heavy', { levelIndex: ROLE_UNLOCK.heavy.road })).toBe(true);
    expect(ROLE_UNLOCK.heavy.road).toBe(6);
    expect(roleUnlocked('behemoth', { levelIndex: ROLE_UNLOCK.behemoth.road - 1 })).toBe(false);
    expect(roleUnlocked('behemoth', { levelIndex: ROLE_UNLOCK.behemoth.road })).toBe(true);
    expect(ROLE_UNLOCK.behemoth.road).toBe(14);
    expect(roleUnlocked('behemoth', { endless: true, meters: ROLE_UNLOCK.behemoth.endlessM - 1 })).toBe(false);
    expect(roleUnlocked('behemoth', { endless: true, meters: ROLE_UNLOCK.behemoth.endlessM })).toBe(true);
    expect(Object.keys(ROLES)).toEqual(['grunt', 'tank', 'heavy', 'behemoth']);
    expect(ROLES.tank.cash).toBe(ROLES.grunt.cash * 2);
    expect(ROLES.heavy.cash).toBe(ROLES.tank.cash * 2);
    expect(ROLES.behemoth.cash).toBe(ROLES.heavy.cash * 2);
    expect(ROLES.tank.xp).toBe(ROLES.grunt.xp * 2);
    expect(ROLES.heavy.xp).toBe(ROLES.tank.xp * 2);
    expect(ROLES.behemoth.xp).toBe(ROLES.heavy.xp * 2);
  });

  it('makes tanks slower, tougher, and larger than grunts', () => {
    const chase = THREAT.chill.speed;
    const grunt = createEnemy(0, terrain, 1, chase, 'zombie', 'grunt');
    const tank = createEnemy(0, terrain, 1, chase, 'zombie', 'tank');
    const heavy = createEnemy(0, terrain, 1, chase, 'zombie', 'heavy');
    const boss = createEnemy(0, terrain, 1, chase, 'zombie', 'behemoth');
    expect(tank.hp.body).toBeGreaterThan(grunt.hp.body);
    expect(heavy.hp.body).toBeGreaterThan(tank.hp.body);
    expect(boss.hp.body).toBeGreaterThan(heavy.hp.body);
    expect(tank.speed).toBeLessThan(grunt.speed);
    expect(heavy.speed).toBeLessThan(tank.speed);
    expect(boss.speed).toBeLessThan(heavy.speed);
    expect(boss.speed).toBeGreaterThan(V_RETREAT);
    expect(boss.speed).toBeGreaterThanOrEqual(CHASE_FLOOR);
    expect(limbCircles(boss).head.r).toBeGreaterThan(limbCircles(grunt).head.r);
    expect(poseEnemyLocal(boss).scale).toBeCloseTo(ROLES.behemoth.scale);
  });

  it('guarantees a behemoth on Road 15 and Endless 800m', () => {
    const viewport = { w: 1280, h: 720 };
    const road = createRun({ profile: defaultProfile(), viewport, type: 'campaign', levelIndex: ROLE_UNLOCK.behemoth.road, seed: 1 });
    road.player.worldX = -40 * PX_PER_M;
    road.spawnTimer = 0;
    stepSpawner(road, 0.016, viewport);
    expect(road.enemies.some((e) => e.role === 'behemoth')).toBe(true);
    expect(road.spawnedBehemoth).toBe(true);

    const endless = createRun({ profile: defaultProfile(), viewport, type: 'endless', levelIndex: 0, seed: 1 });
    endless.player.worldX = -ROLE_UNLOCK.behemoth.endlessM * PX_PER_M;
    endless.spawnTimer = 0;
    stepSpawner(endless, 0.016, viewport);
    expect(endless.enemies.some((e) => e.role === 'behemoth')).toBe(true);
  });

  it('does not pack the opening wave even when the pack roll is forced', () => {
    const viewport = { w: 1280, h: 720 };
    const run = createRun({ profile: defaultProfile(), viewport, type: 'campaign', levelIndex: 0, seed: 1 });
    run.spawnTimer = 0;
    run.rng = () => 0;
    stepSpawner(run, 0.016, viewport);
    expect(run.enemies.filter((e) => e.alive)).toHaveLength(1);
  });

  it('can cluster two walkers inside a single gap instead of spacing a line', () => {
    const viewport = { w: 1280, h: 720 };
    const run = createRun({ profile: defaultProfile(), viewport, type: 'campaign', levelIndex: 0, seed: 1 });
    run.player.worldX = -200 * PX_PER_M;
    run.spawnTimer = 0;
    run.rng = () => 0;
    stepSpawner(run, 0.016, viewport);
    const living = run.enemies.filter((e) => e.alive);
    expect(living.length).toBe(2);
    expect(Math.abs(living[1].worldX - living[0].worldX)).toBeLessThan(ROLES.grunt.gap);
    expect(Math.abs(living[1].worldX - living[0].worldX)).toBeGreaterThanOrEqual(THREAT.clusterGapMin);
  });

  it('forces the first late-road pick to be a behemoth', () => {
    const run = { endless: false, levelIndex: ROLE_UNLOCK.behemoth.road, spawnedBehemoth: false, rng: () => 0.99 };
    expect(pickRole(run, 40, [])).toBe('behemoth');
    expect(run.spawnedBehemoth).toBe(true);
    expect(pickRole(run, 80, [{ role: 'behemoth' }])).toBe('grunt');
  });
});

describe('simulate loop', () => {
  const viewport = { w: 1280, h: 720 };
  const dt = 1 / 60;
  const idle = { pointerX: 800, pointerY: 360, firing: false, reloadPressed: false, pointerTap: false };

  function liveRun(type = 'campaign', levelIndex = 0) {
    const run = createRun({ profile: defaultProfile(), viewport, type, levelIndex, seed: 1 });
    run.paused = false;
    return run;
  }

  it('starts a run unpaused', () => {
    const run = createRun({ profile: defaultProfile(), viewport, type: 'campaign', levelIndex: 0, seed: 1 });
    expect(run.paused).toBe(false);
    expect(typeof run.fxRng).toBe('function');
  });

  it('does not let barrel smoke steal the next shot’s spread', () => {
    const cool = liveRun();
    const hot = liveRun();
    cool.spawnTimer = 1e9;
    hot.spawnTimer = 1e9;
    cool.enemies.length = 0;
    hot.enemies.length = 0;
    hot.weapon.heat = 1;
    simulate(cool, dt, viewport, idle);
    simulate(hot, dt, viewport, idle);
    hot.weapon.heat = 0;
    hot.weapon.bloom = cool.weapon.bloom;
    simulate(cool, dt, viewport, { ...idle, firing: true, pointerTap: true });
    simulate(hot, dt, viewport, { ...idle, firing: true, pointerTap: true });
    expect(cool.bullets).toHaveLength(1);
    expect(hot.bullets).toHaveLength(1);
    expect(cool.bullets[0].vx).toBeCloseTo(hot.bullets[0].vx, 8);
    expect(cool.bullets[0].vy).toBeCloseTo(hot.bullets[0].vy, 8);
  });

  it('snaps aim to the tap before the shot leaves', () => {
    const run = liveRun();
    run.spawnTimer = 1e9;
    run.enemies.length = 0;
    run.player.aimAngle = -Math.PI / 2;
    run.weapon.ammo = 4;
    run.weapon.cooldown = 0;
    simulate(run, dt, viewport, { ...idle, pointerX: 900, pointerY: 400, firing: true, pointerTap: true });
    expect(run.bullets.length).toBe(1);
    const ang = Math.atan2(run.bullets[0].vy, run.bullets[0].vx);
    expect(run.player.aimAngle).toBeGreaterThan(-0.55);
    expect(run.player.aimAngle).toBeLessThan(0.35);
    const spread = (run.stats.baseSpread * Math.PI) / 180;
    expect(Math.abs(run.player.aimAngle - ang)).toBeLessThanOrEqual(spread + 1e-6);
  });

  it('retreats the player and extracts campaign at TRACK_METERS', () => {
    const run = liveRun();
    const x0 = run.player.worldX;
    simulate(run, dt, viewport, idle);
    expect(run.player.worldX).toBeLessThan(x0);
    expect(run.ended).toBeNull();

    run.player.worldX = -TRACK_METERS * PX_PER_M;
    simulate(run, dt, viewport, idle);
    expect(run.ended).toBe('extract');
  });

  it('extracts on the line even if a body is touching', () => {
    const run = liveRun();
    run.player.worldX = -TRACK_METERS * PX_PER_M;
    run.enemies.push(createEnemy(run.player.worldX, run.terrain, 1, 80, 'zombie'));
    simulate(run, dt, viewport, idle);
    expect(run.ended).toBe('extract');
    expect(run.dying).toBeFalsy();
  });

  it('does not extract endless past TRACK_METERS', () => {
    const run = liveRun('endless');
    run.player.worldX = -TRACK_METERS * PX_PER_M - 400;
    simulate(run, dt, viewport, idle);
    expect(run.ended).not.toBe('extract');
  });

  it('clicks dry and does not fire again until the cycle is up', () => {
    const run = liveRun();
    run.spawnTimer = 1e9;
    run.enemies.length = 0;
    run.stats.magSize = 4;
    run.weapon.ammo = 4;
    run.weapon.cooldown = 0;
    simulate(run, dt, viewport, { ...idle, firing: true });
    expect(run.weapon.ammo).toBe(3);
    simulate(run, dt, viewport, { ...idle, firing: true, pointerTap: true });
    expect(run.weapon.ammo).toBe(3);
    expect(run.weapon.dryFlash).toBeGreaterThan(0);
    const steps = Math.ceil(1 / run.stats.rof / dt) + 1;
    for (let i = 0; i < steps; i++) simulate(run, dt, viewport, idle);
    simulate(run, dt, viewport, { ...idle, firing: true });
    expect(run.weapon.ammo).toBe(2);
  });

  it('starts reload after the last round and ragdolls on torso contact', () => {
    const run = liveRun();
    run.weapon.ammo = 1;
    run.weapon.cooldown = 0;
    simulate(run, dt, viewport, { ...idle, firing: true });
    expect(run.weapon.reloading).toBe(true);

    const run2 = liveRun();
    const foe = createEnemy(run2.player.worldX, run2.terrain, 1, 80, 'zombie');
    run2.enemies.push(foe);
    simulate(run2, dt, viewport, idle);
    expect(run2.dying).toBe(true);
    expect(run2.ended).toBeNull();
    expect(run2.player.dead).toBe(true);
    expect(run2.ragdolls.some((r) => r.hero && r.kind === 'gunner')).toBe(true);
    const x0 = foe.worldX;
    simulate(run2, dt, viewport, idle);
    expect(foe.worldX).toBeLessThan(x0);
    const steps = Math.ceil(DEATH_HOLD / dt) + 2;
    for (let i = 0; i < steps; i++) simulate(run2, dt, viewport, idle);
    expect(run2.ended).toBe('death');
  });

  it('lets in-flight shots finish during the death hold', () => {
    const run = liveRun();
    const grabber = createEnemy(run.player.worldX, run.terrain, 1, 80, 'zombie');
    cacheEnemyPose(grabber);
    run.enemies = [grabber];
    simulate(run, dt, viewport, idle);
    expect(run.dying).toBe(true);
    const other = createEnemy(run.player.worldX + 240, run.terrain, 1, 80, 'zombie');
    cacheEnemyPose(other);
    run.enemies.push(other);
    run.stats.damage = 80;
    const y = other.y + other.pose.pelvis.y;
    run.bullets = [spawnBullet(run.player.worldX + 40, y, 0, { ...run.stats, bulletSpeed: 1600, pen: 2 }, false, 800)];
    const kills = run.score.kills;
    for (let i = 0; i < 24; i++) simulate(run, dt, viewport, idle);
    expect(other.alive).toBe(false);
    expect(run.score.kills).toBeGreaterThan(kills);
  });

  it('lets a crawler finish a contact kill', () => {
    const run = liveRun();
    const crawler = createEnemy(run.player.worldX, run.terrain, 1, 80, 'zombie');
    crawler.hp.legs = 0;
    updateLocomotion(crawler);
    cacheEnemyPose(crawler);
    run.enemies = [crawler];
    const core = playerCoreFromPose(run.player);
    const hit = lethalCircles(crawler).some((c) => rectCircleOverlap(core.x, core.y, core.w, core.h, c.x, c.y, c.r));
    expect(hit).toBe(true);
    simulate(run, dt, viewport, idle);
    expect(run.dying).toBe(true);
    expect(run.ragdolls.some((r) => r.hero)).toBe(true);
  });

  it('uses crawl arms when the gunner is down', () => {
    const standing = posePlayerLocal({ worldX: 0, crawling: false, aimAngle: 0 });
    const crawling = posePlayerLocal({ worldX: 0, crawling: true, aimAngle: 0 });
    expect(crawling.crawl).toBe(true);
    expect(crawling.pelvis.y).toBeGreaterThan(standing.pelvis.y);
    expect(crawling.armL.hand.y).toBeGreaterThan(standing.armL.hand.y);
  });

  it('plants footsteps on the same stance the legs use', () => {
    const gunner = posePlayerLocal({ worldX: -12 });
    const feet = gaitPlanted('gunner', 1, -12);
    expect(feet.L).toBe(gunner.l.planted);
    expect(feet.R).toBe(gunner.r.planted);
    const walker = poseEnemyLocal({ id: 7, kind: 'zombie', worldX: -40, y: 0, scale: 1 });
    const zed = gaitPlanted('zombie', 7, -40);
    expect(zed.L).toBe(walker.l.planted);
    expect(zed.R).toBe(walker.r.planted);
  });

  it('bends the gunner knee toward facing so it does not buckle backward', () => {
    const side = (hip, knee, ankle, face) =>
      ((knee.x - hip.x) * (ankle.y - hip.y) - (knee.y - hip.y) * (ankle.x - hip.x)) * face;
    for (let x = 0; x >= -360; x -= 18) {
      const p = posePlayerLocal({ worldX: x, aimAngle: 0 });
      expect(side(p.l.hip, p.l.knee, p.l.ankle, p.face)).toBeGreaterThan(-1);
      expect(side(p.r.hip, p.r.knee, p.r.ankle, p.face)).toBeGreaterThan(-1);
    }
  });

  it('points gunner toes at the horde even while retreating', () => {
    for (let x = 0; x >= -360; x -= 18) {
      const p = posePlayerLocal({ worldX: x, aimAngle: 0 });
      expect(p.face).toBe(1);
      expect(p.l.toe.x).toBeGreaterThan(p.l.heel.x);
      expect(p.r.toe.x).toBeGreaterThan(p.r.heel.x);
    }
    const walker = poseEnemyLocal({ id: 3, kind: 'zombie', worldX: -80, y: 0, scale: 1 });
    expect(walker.face).toBe(-1);
    expect(walker.l.toe.x).toBeLessThan(walker.l.heel.x);
    expect(walker.r.toe.x).toBeLessThan(walker.r.heel.x);
  });

  it('grows the held gun from visible parts only', () => {
    expect(magStyleFor(0)).toBe('stick');
    expect(magStyleFor(MAG_STICK_MAX)).toBe('stick');
    expect(magStyleFor(MAG_STICK_MAX + 1)).toBe('box');
    expect(magStyleFor(MAG_BOX_MAX)).toBe('box');
    expect(magStyleFor(MAG_BOX_MAX + 1)).toBe('drum');
    expect(magStyleFor(MAG_DRUM_MAX)).toBe('drum');
    expect(magStyleFor(MAG_DRUM_MAX + 1)).toBe('belt');

    const shoddy = gunLookFrom(gunAt('t1_stock', { stock: 40, barrel: 0, magazine: 0 }));
    expect(shoddy.stockLen).toBe(0);
    expect(shoddy.magStyle).toBe('stick');
    const longer = gunLookFrom(gunAt('t2_tactical', { barrel: 40, magazine: 0 }));
    const stub = gunLookFrom(gunAt('t2_tactical', { barrel: 0, magazine: 0 }));
    expect(longer.barrelLen).toBeGreaterThan(stub.barrelLen);
    expect(longer.muzzleLen).toBeGreaterThan(stub.muzzleLen);
    const expert = gunLookFrom(gunAt('t4_duty', { stock: 1, magazine: 12 }));
    expect(expert.stockLen).toBeGreaterThan(0);
    expect(expert.magStyle).toBe('box');
    const drum = gunLookFrom(gunAt('t4_duty', { magazine: 24 }));
    expect(drum.magStyle).toBe('drum');
    const belt = gunLookFrom(gunAt('t5_advanced', { magazine: 50 }));
    expect(belt.magStyle).toBe('belt');

    const p = posePlayerLocal({ worldX: 0, aimAngle: 0, gunLook: longer });
    const gripD = Math.hypot(p.armR.hand.x - p.gun.x, p.armR.hand.y - p.gun.y);
    const forendD = Math.hypot(p.armL.hand.x - p.gun.x, p.armL.hand.y - p.gun.y);
    expect(forendD).toBeGreaterThan(gripD);
    expect(p.armR.hand.y).toBeGreaterThan(p.gun.y);
    expect(p.armL.hand.y).toBeGreaterThan(p.gun.y);
    expect(p.aimAngle).toBe(0);

    const longStock = gunLookFrom(gunAt('t5_advanced', { stock: 100 }));
    const held = posePlayerLocal({ worldX: 0, aimAngle: 0, gunLook: longStock });
    expect(held.gun.x - longStock.stockLen).toBeGreaterThan(held.rib.x - 8 * S);
  });

  it('keeps the rifle in the gunner’s hands when they flop', () => {
    const player = {
      pose: posePlayerLocal({ worldX: 0, y: 400, aimAngle: -0.2, gunLook: gunLookFrom(defaultProfile()) }),
      worldX: 0,
      y: 400,
      kind: 'gunner',
    };
    const rag = spawnRagdoll(player, { nx: 1, ny: 0, energy: 1.2, zone: 'upper' }, () => 0.5);
    expect(rag.nodes.some((n) => n.id === 'gun')).toBe(true);
    expect(rag.nodes.some((n) => n.id === 'muzzle')).toBe(true);
    expect(rag.gunLook).toBeTruthy();
  });

  it('leaves a world-space smoke trail from the barrel', () => {
    const run = { smoke: [] };
    emitBarrelSmoke(run, 100, 200, 0, () => 0.4, 'shot');
    expect(run.smoke.length).toBeGreaterThan(3);
    const first = run.smoke[0];
    const x0 = first.x;
    const r0 = first.r;
    stepSmoke(run, 0.2);
    expect(run.smoke[0].x).not.toBeCloseTo(x0, 5);
    expect(run.smoke[0].r).toBeGreaterThan(r0);
  });

  it('caps barrel smoke so a mag dump cannot flood the scene', () => {
    const run = { smoke: [] };
    for (let i = 0; i < 40; i++) emitBarrelSmoke(run, 0, 0, 0, () => 0.5, 'shot');
    expect(run.smoke.length).toBe(MAX_SMOKE);
  });

  it('forgives fire-spam taps at the start of reload so they do not jam', () => {
    const run = liveRun();
    run.weapon.ammo = 1;
    run.weapon.cooldown = 0;
    simulate(run, dt, viewport, { ...idle, firing: true, pointerTap: true });
    expect(run.weapon.reloading).toBe(true);
    simulate(run, dt, viewport, idle);
    for (let i = 0; i < 8; i++) simulate(run, dt, viewport, idle);
    expect(run.weapon.reloadT).toBeLessThan(0.32);
    simulate(run, dt, viewport, { ...idle, firing: true, pointerTap: true });
    expect(run.weapon.tapped).toBe(false);
    expect(run.weapon.jammed).toBe(false);
    expect(run.weapon.reloading).toBe(true);
  });

  it('applies a reload tap after the forgive window', () => {
    const run = liveRun();
    run.weapon.ammo = 1;
    run.weapon.cooldown = 0;
    simulate(run, dt, viewport, { ...idle, firing: true });
    expect(run.weapon.reloading).toBe(true);
    const steps = Math.ceil(0.35 / dt);
    for (let i = 0; i < steps; i++) simulate(run, dt, viewport, idle);
    expect(run.weapon.reloadT).toBeGreaterThanOrEqual(0.32);
    simulate(run, dt, viewport, { ...idle, pointerTap: true });
    expect(run.weapon.tapped).toBe(true);
  });

  it('fires the next mag if the trigger is held through a passive reload', () => {
    const run = liveRun();
    run.spawnTimer = 1e9;
    run.enemies.length = 0;
    run.weapon.ammo = 1;
    run.weapon.cooldown = 0;
    simulate(run, dt, viewport, { ...idle, firing: true });
    expect(run.weapon.reloading).toBe(true);
    const hold = { ...idle, firing: true };
    for (let i = 0; i < 400 && run.weapon.reloading; i++) simulate(run, dt, viewport, hold);
    expect(run.ended).toBeNull();
    expect(run.weapon.reloading).toBe(false);
    expect(run.weapon.ammo).toBe(run.stats.magSize);
    simulate(run, dt, viewport, hold);
    expect(run.weapon.ammo).toBeLessThan(run.stats.magSize);
  });

  it('does not dump the next mag if the trigger is held through a perfect reload', () => {
    const run = liveRun();
    run.weapon.ammo = 1;
    run.weapon.cooldown = 0;
    simulate(run, dt, viewport, { ...idle, firing: true });
    const band = perfectBand(run.stats);
    for (let i = 0; i < 240; i++) {
      const n = run.weapon.reloadDur > 0 ? run.weapon.reloadT / run.weapon.reloadDur : 1;
      if (n >= band.a && n <= band.b) break;
      simulate(run, dt, viewport, idle);
    }
    simulate(run, dt, viewport, { ...idle, firing: true, pointerTap: true });
    expect(run.weapon.perfectMag).toBe(true);
    expect(run.weapon.reloading).toBe(false);
    expect(run.weapon.ammo).toBe(run.stats.magSize);
    simulate(run, dt, viewport, { ...idle, firing: true });
    expect(run.weapon.ammo).toBe(run.stats.magSize);
    expect(run.weapon.suppressFire).toBe(true);
    simulate(run, dt, viewport, idle);
    simulate(run, dt, viewport, { ...idle, firing: true });
    expect(run.weapon.ammo).toBeLessThan(run.stats.magSize);
  });

  it('fires a perfect mag 10% faster', () => {
    const run = liveRun();
    run.weapon.perfectMag = true;
    run.weapon.ammo = 2;
    run.stats.magSize = 2;
    run.weapon.cooldown = 0;
    simulate(run, dt, viewport, { ...idle, firing: true });
    expect(run.weapon.cooldown).toBeCloseTo(1 / (run.stats.rof * PERFECT_MAG_ROF));
  });

  it('bakes perfect-mag onto the emptying shot', () => {
    const run = liveRun();
    run.weapon.perfectMag = true;
    run.weapon.ammo = 1;
    run.weapon.cooldown = 0;
    simulate(run, dt, viewport, { ...idle, firing: true });
    expect(run.weapon.reloading).toBe(true);
    expect(run.weapon.perfectMag).toBe(false);
    expect(run.bullets[0].perfect).toBe(true);
  });

  it('treats a touch anywhere during reload as an active-reload tap', () => {
    const run = liveRun();
    run.weapon.ammo = 1;
    run.weapon.cooldown = 0;
    simulate(run, dt, viewport, { ...idle, firing: true });
    const steps = Math.ceil(0.35 / dt);
    for (let i = 0; i < steps; i++) simulate(run, dt, viewport, idle);
    simulate(run, dt, viewport, {
      ...idle,
      pointerX: 8,
      pointerY: 8,
      pointerTap: true,
      pointerType: 'touch',
    });
    expect(run.weapon.tapped).toBe(true);
  });

  it('keeps spent rounds flying past effective range with inverse-square drop', () => {
    expect(rangeDamageMul(48, 48)).toBe(1);
    expect(rangeDamageMul(96, 48)).toBeCloseTo(0.25, 5);
    expect(rangeDamageMul(72, 48)).toBeCloseTo((48 / 72) ** 2, 5);
    const run = liveRun();
    const maxDist = 48;
    const b = spawnBullet(run.player.worldX, run.player.y - 120, 0, run.stats, false, maxDist);
    run.enemies.length = 0;
    run.bullets = [b];
    for (let i = 0; i < 20; i++) stepBullets(run, dt, viewport);
    expect(run.bullets).toHaveLength(1);
    expect(Math.hypot(run.bullets[0].x - b.ox, run.bullets[0].y - b.oy)).toBeGreaterThan(maxDist);
    expect(clampShotRange(4000, viewport)).toBeLessThan(viewport.w * (1 - PLAYER_SCREEN_X_RATIO));
    expect(AIM_REACH_MAX).toBeLessThan(clampShotRange(4000, viewport));
  });

  it('spent rounds still wound a body they geometrically hit', () => {
    const run = liveRun();
    run.spawnTimer = 1e9;
    const foe = createEnemy(run.player.worldX + 320, run.terrain, 1, 80, 'zombie');
    cacheEnemyPose(foe);
    run.enemies = [foe];
    const y = foe.y + foe.pose.rib.y;
    const b = spawnBullet(run.player.worldX, y, 0, { ...run.stats, bulletSpeed: 900, pen: 2 }, false, 48);
    run.bullets = [b];
    run.pendingHits = [];
    for (let i = 0; i < 30; i++) stepBullets(run, dt, viewport);
    expect(run.pendingHits.length).toBeGreaterThan(0);
    expect(run.pendingHits[0].enemy).toBe(foe);
    expect(run.pendingHits[0].rangeMul).toBeLessThan(0.05);
  });

  it('keeps an on-screen round after 1.6s', () => {
    const run = liveRun();
    const maxDist = 48;
    const b = spawnBullet(run.player.worldX, run.player.y - 120, 0, { ...run.stats, bulletSpeed: 80 }, false, maxDist);
    run.enemies.length = 0;
    run.bullets = [b];
    for (let i = 0; i < 120; i++) stepBullets(run, dt, viewport);
    expect(run.bullets).toHaveLength(1);
    expect(Math.hypot(run.bullets[0].x - b.ox, run.bullets[0].y - b.oy)).toBeGreaterThan(80 * 1.6);
    expect(run.bullets[0].age).toBeUndefined();
  });

  it('does not kill a spent round when air pen runs out', () => {
    const run = liveRun();
    run.enemies.length = 0;
    const b = spawnBullet(
      run.player.worldX,
      40,
      0,
      { ...run.stats, bulletSpeed: 500, pen: 0.05, penDecay: 0.02 },
      false,
      40,
    );
    run.bullets = [b];
    for (let i = 0; i < 50; i++) stepBullets(run, dt, viewport);
    expect(run.bullets).toHaveLength(1);
    expect(run.bullets[0].pen).toBe(0);
    expect(Math.hypot(run.bullets[0].x - b.ox, run.bullets[0].y - b.oy)).toBeGreaterThan(200);
  });
});

describe('pwa updates', () => {
  it('blocks service-worker refresh until camp', () => {
    expect(pwaUpdateBlocked('run')).toBe(true);
    expect(pwaUpdateBlocked('end')).toBe(true);
    expect(pwaUpdateBlocked('gunsmith')).toBe(true);
    expect(pwaUpdateBlocked('training')).toBe(true);
    expect(pwaUpdateBlocked('hub')).toBe(false);
  });
});

describe('render budget', () => {
  it('caps backing-store dpr', () => {
    expect(MAX_DPR).toBe(2);
    expect(capDpr(3, MAX_DPR)).toBe(2);
    expect(capDpr(1.25, MAX_DPR)).toBe(1.25);
    expect(capDpr(0, MAX_DPR)).toBe(1);
  });

  it('drops scenery fx after sustained long frames', () => {
    const q = createQuality();
    const hill = q.hillStep;
    const mul = q.propMul;
    for (let i = 0; i < 12; i++) q.noteFrame(0.04);
    expect(q.cheap).toBe(true);
    expect(q.fx).toBe(false);
    expect(q.hillStep).toBe(hill);
    expect(q.propMul).toBe(mul);
  });

  it('restores scenery quality after frames stay healthy', () => {
    const q = createQuality();
    const hill = q.hillStep;
    for (let i = 0; i < 12; i++) q.noteFrame(0.04);
    expect(q.cheap).toBe(true);
    for (let i = 0; i < 200; i++) q.noteFrame(0.016);
    expect(q.cheap).toBe(false);
    expect(q.fx).toBe(true);
    expect(q.hillStep).toBe(hill);
  });

  it('stops restoring FX after it hitch-loops twice', () => {
    const q = createQuality();
    for (let i = 0; i < 12; i++) q.noteFrame(0.04);
    for (let i = 0; i < 200; i++) q.noteFrame(0.016);
    expect(q.fx).toBe(true);
    for (let i = 0; i < 12; i++) q.noteFrame(0.04);
    for (let i = 0; i < 250; i++) q.noteFrame(0.016);
    expect(q.cheap).toBe(true);
    expect(q.fx).toBe(false);
  });

  it('sizes canvas HUD in screen pixels so short phones stay readable', () => {
    const phone = hudScale({ h: 720, cssH: 390 });
    const desk = hudScale({ h: 720, cssH: 720 });
    const phoneType = hudTypeScale({ h: 720, cssH: 390 });
    expect(desk).toBeCloseTo(1, 5);
    expect(phone).toBeGreaterThan(desk);
    expect(phone).toBeLessThanOrEqual(1.06);
    expect(phone).toBeLessThan(720 / 390);
    expect(phoneType).toBeGreaterThan(phone);
    expect(phoneType).toBeLessThanOrEqual(1.28);
  });
});
