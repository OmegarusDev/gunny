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
  PERFECT_MAG_MULT,
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
  clampShotRange,
  effectiveAimReach,
  effectiveShotRange,
  enemyHp,
  hudScale,
  hudTypeScale,
  threatForDistance,
  usesFullScreenAim,
} from '../src/config.js';
import { PARTS, catalogProgressWindow, catalogWindow, ladderCost, partsForSlot } from '../src/data/attachments.js';
import { BIOMES, beatenRoadIndexes, biomeFor } from '../src/data/biomes.js';
import { KINDS } from '../src/data/kinds.js';
import { RECEIVERS, RECEIVER_COST_BASE, RECEIVER_COST_RATE, RECEIVER_STAT_RATE } from '../src/data/receivers.js';
import { CHASE_FLOOR, ROLE_UNLOCK, ROLES, pickRole, roleUnlocked } from '../src/data/roles.js';
import { SKILLS, emptyRanks, refundRetiredRanks, skillCost } from '../src/data/skills.js';
import { formatRpm, gunsmithStatRows, resolveStats, shotSpreadDeg, STAT_BY_ID, STATS } from '../src/entities/loadout.js';
import { applyFlinch, cacheEnemyPose, createEnemy, enemyIsHurt, lethalCircles, lethalHpRatio, limbCircles, stepFlinch, updateLocomotion } from '../src/entities/enemy.js';
import { defaultProfile, resetProfile, buyPart, owns } from '../src/state/profile.js';
import { defaultSettings } from '../src/state/settings.js';
import { wantsImmersive, usesHtmlFullscreen, isPortrait } from '../src/engine/immersive.js';
import { clampAimPoint, clampToViewport, resolveAimPoint } from '../src/view/aim.js';
import { perfectBand, reloadNorm } from '../src/view/reload.js';
import { uhash } from '../src/util/hash.js';
import { mixHex, mixTone } from '../src/util/color.js';
import { createTerrain } from '../src/world/terrain.js';
import { createPlayer } from '../src/entities/player.js';
import { playerCoreFromPose, playerHeadClearance, poseEnemyLocal, posePlayerLocal } from '../src/figure.js';
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
import { deciduousH, pineH } from '../src/render/scenery/util.js';

describe('threat pacing', () => {
  it('keeps the next-road start shift smaller than the within-road span', () => {
    expect(THREAT.step).toBeLessThan(THREAT.span);
  });

  it('steps spawn pressure across the 250m track', () => {
    const early = threatForDistance(20, 0, false);
    const mid = threatForDistance(100, 0, false);
    const late = threatForDistance(200, 0, false);
    expect(early.spawnInterval).toBeGreaterThan(mid.spawnInterval);
    expect(mid.spawnInterval).toBeGreaterThan(late.spawnInterval);
    expect(late.maxAlive).toBeGreaterThan(early.maxAlive);
    expect(late.hpMul).toBeGreaterThan(early.hpMul);
  });

  it('opens the next road harder than this opening but not harder than this finale', () => {
    const l0s = threatForDistance(0, 0, false);
    const l0e = threatForDistance(TRACK_METERS, 0, false);
    const l1s = threatForDistance(0, 1, false);
    expect(l0s.maxAlive).toBeLessThan(l0e.maxAlive);
    expect(l0s.spawnInterval).toBeGreaterThan(l0e.spawnInterval);
    expect(l1s.spawnInterval).toBeLessThan(l0s.spawnInterval);
    expect(l1s.maxAlive).toBeGreaterThanOrEqual(l0s.maxAlive);
    expect(l1s.spawnInterval).toBeGreaterThan(l0e.spawnInterval);
    expect(l1s.maxAlive).toBeLessThanOrEqual(l0e.maxAlive);
  });

  it('steps campaign grunt HP per road, with a small climb inside the 250m', () => {
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
    expect(enemyHp(l10e.hpMul).torso).toBeGreaterThanOrEqual(1);
    expect(enemyHp(-2).head).toBeGreaterThanOrEqual(1);
  });

  it('chases a bit quicker and only sprints very late', () => {
    expect(THREAT.chill.speed).toBeGreaterThanOrEqual(118);
    expect(THREAT.hectic.speed).toBeGreaterThan(THREAT.chill.speed);
    expect(THREAT.hectic.speed).toBeLessThan(THREAT.speedCap);
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
  it('prices mag_2 near ten starter kills', () => {
    expect(PARTS.mag_2.cost).toBe(100);
    expect(ECONOMY.cashPerKill * 10).toBe(PARTS.mag_2.cost);
  });

  it('keeps magazine ladder sequential', () => {
    expect(PARTS.mag_1.requires).toBeUndefined();
    expect(PARTS.mag_2.requires).toBe('mag_1');
    expect(PARTS.mag_3.requires).toBe('mag_2');
    expect(PARTS.mag_40.requires).toBe('mag_35');
  });

  it('exposes receivers with rising cost and tier', () => {
    expect(RECEIVERS.t1_stock.cost).toBe(0);
    expect(RECEIVERS.t1_stock.short).toBe('Shoddy');
    expect(RECEIVERS.t2_tactical.requires).toBe('t1_stock');
    expect(RECEIVERS.t2_tactical.cost).toBe(550);
    expect(RECEIVERS.t3_ordnance.tier).toBe(3);
    expect(RECEIVERS.t3_ordnance.cost).toBe(ladderCost(RECEIVER_COST_BASE, RECEIVER_COST_RATE, 2));
    expect(RECEIVERS.t3_ordnance.cost).toBeGreaterThan(RECEIVERS.t2_tactical.cost);
    expect(RECEIVERS.t4_advanced.requires).toBe('t3_ordnance');
    expect(RECEIVERS.t4_advanced.short).toBe('Advanced');
    expect(RECEIVERS.t4_advanced.cost).toBe(ladderCost(RECEIVER_COST_BASE, RECEIVER_COST_RATE, 3));
    expect(RECEIVERS.t4_advanced.cost).toBeGreaterThan(RECEIVERS.t3_ordnance.cost);
    expect(Object.keys(RECEIVERS)).toHaveLength(4);
  });

  it('keeps Shoddy slow and grows receiver RoF and damage 1.5× per rank', () => {
    expect(RECEIVERS.t1_stock.base.rof).toBe(0.5);
    expect(RECEIVERS.t2_tactical.base.rof).toBeCloseTo(0.5 * RECEIVER_STAT_RATE);
    expect(RECEIVERS.t3_ordnance.base.rof).toBeCloseTo(0.5 * RECEIVER_STAT_RATE ** 2);
    expect(RECEIVERS.t4_advanced.base.rof).toBeCloseTo(0.5 * RECEIVER_STAT_RATE ** 3);
    expect(RECEIVERS.t2_tactical.base.damage).toBeCloseTo(13 * RECEIVER_STAT_RATE, 1);
    expect(RECEIVERS.t4_advanced.base.damage).toBeGreaterThan(RECEIVERS.t3_ordnance.base.damage);
    expect(RECEIVERS.t4_advanced.base.pen).toBeGreaterThan(RECEIVERS.t3_ordnance.base.pen);
    expect(STAT_BY_ID.rof.min).toBeLessThanOrEqual(0.5);
    expect(resolveStats(defaultProfile()).rof).toBe(0.5);
    const starter = resolveStats(defaultProfile());
    expect(starter.magSize).toBe(1);
    expect(formatRpm(starter)).toBe(String(Math.round((1 / starter.reload) * 60)));
    expect(Number(formatRpm(starter))).toBeLessThan(Math.round(starter.rof * 60));
    const mag2 = defaultProfile();
    mag2.owned.push('mag_2');
    mag2.loadout.magazine = 'mag_2';
    expect(Number(formatRpm(resolveStats(mag2)))).toBeGreaterThan(Number(formatRpm(starter)));
    expect(starter.pen).toBe(0.5);
    expect(starter.pen).toBeLessThan(FLESH_PEN_COST);
    expect(RECEIVERS.t2_tactical.base.pen).toBe(0.9);
    expect(RECEIVERS.t2_tactical.base.pen).toBeLessThan(FLESH_PEN_COST);
    expect(RECEIVERS.t3_ordnance.base.pen).toBeCloseTo(0.9 * RECEIVER_STAT_RATE, 2);
    const longShoddy = defaultProfile();
    longShoddy.owned.push('barrel_long');
    longShoddy.loadout.barrel = 'barrel_long';
    const kitPen = resolveStats(longShoddy).pen;
    expect(kitPen + hitPenBonus('head', false)).toBeLessThanOrEqual(FLESH_PEN_COST);
    expect(kitPen + hitPenBonus('torso', true)).toBeLessThanOrEqual(FLESH_PEN_COST);
    expect(kitPen + hitPenBonus('head', true)).toBeGreaterThan(FLESH_PEN_COST);
    const rifle = defaultProfile();
    rifle.owned.push('barrel_rifle');
    rifle.loadout.barrel = 'barrel_rifle';
    expect(resolveStats(rifle).pen + hitPenBonus('head', true)).toBeLessThanOrEqual(FLESH_PEN_COST);
    expect(RECEIVERS.t2_tactical.base.pen + hitPenBonus('head', false)).toBeGreaterThan(FLESH_PEN_COST);
    expect(RECEIVERS.t2_tactical.base.pen + hitPenBonus('torso', true)).toBeGreaterThan(FLESH_PEN_COST);
    expect(spawnBullet(0, 0, 0, starter, true).pen).toBe(starter.pen);
    expect(spawnBullet(0, 0, 0, starter, true).pen).not.toBe(starter.pen * PERFECT_MAG_MULT);
    expect(PARTS.barrel_stub.mods.pen).toBeUndefined();
    expect(PARTS.barrel_carbine.mods.pen).toBeGreaterThan(0);
    expect(PARTS.barrel_rifle.mods.pen).toBeGreaterThan(PARTS.barrel_carbine.mods.pen);
    expect(PARTS.barrel_long.mods.pen).toBeGreaterThan(PARTS.barrel_rifle.mods.pen);
  });

  it('pays modest XP from distance, kills, heads, and extract', () => {
    expect(ECONOMY.xpPerMeter).toBe(0.05);
    expect(ECONOMY.xpPerKill).toBe(3);
    expect(ECONOMY.xpPerHeadshot).toBe(2);
    expect(ECONOMY.extractXp).toBe(18);
    const score = createScore();
    onKill(score, 1);
    onHit(score, 'head', false);
    extractBonus(score);
    expect(score.xp).toBe(ECONOMY.xpPerKill + ECONOMY.xpPerHeadshot + ECONOMY.extractXp);
  });

  it('wipes a live profile back to camp defaults', () => {
    const profile = defaultProfile();
    profile.cash = 500;
    profile.xp = 80;
    profile.unlockedLevel = 2;
    resetProfile(profile);
    expect(profile).toEqual(defaultProfile());
  });

  it('equips a part as soon as it is bought', () => {
    const profile = defaultProfile();
    profile.cash = 500;
    expect(profile.loadout.magazine).toBe('mag_1');
    expect(buyPart(profile, 'mag_2', PARTS.mag_2.cost)).toBe(true);
    expect(owns(profile, 'mag_2')).toBe(true);
    expect(profile.loadout.magazine).toBe('mag_2');
  });
});

describe('gunsmith catalog', () => {
  it('keeps magazine ladder order and short labels', () => {
    const mags = partsForSlot('magazine');
    expect(mags.map((p) => p.short)).toEqual(mags.map((p) => String(p.mods.magSize + 1)));
    expect(mags[0].id).toBe('mag_1');
    expect(mags.find((p) => p.id === 'mag_40').requires).toBe('mag_35');
    expect(mags.find((p) => p.id === 'mag_80').requires).toBe('mag_75');
    expect(RECEIVERS.t1_stock.short).toBe('Shoddy');
    expect(RECEIVERS.t2_tactical.short).toBe('Militia');
    expect(RECEIVERS.t3_ordnance.short).toBe('Ordnance');
    expect(RECEIVERS.t4_advanced.short).toBe('Advanced');
  });

  it('windows long catalogs to four visible rungs', () => {
    const mags = partsForSlot('magazine');
    const first = catalogWindow(mags, { focusId: 'mag_1' });
    expect(first.items).toHaveLength(4);
    expect(first.items.map((p) => p.id)).toEqual(['mag_1', 'mag_2', 'mag_3', 'mag_4']);
    const later = catalogWindow(mags, { focusId: 'mag_40' });
    expect(later.items.map((p) => p.id)).toContain('mag_40');
    expect(later.items).toHaveLength(4);
    const paged = catalogWindow(mags, { focusId: 'mag_1', start: 8, keepStart: true });
    expect(paged.start).toBe(8);
    expect(paged.items[0].id).not.toBe('mag_1');
    expect(catalogProgressWindow(mags, { nextId: mags[3].id }).items.map((p) => p.id)).toEqual(mags.slice(0, 4).map((p) => p.id));
    expect(catalogProgressWindow(mags, { nextId: mags[4].id }).items.map((p) => p.id)).toEqual(mags.slice(4, 8).map((p) => p.id));
    expect(paged.items[0].id).not.toBe('mag_1');
  });

  it('keeps at least four rungs on every attachment slot', () => {
    for (const slot of ['barrel', 'magazine', 'springs', 'optic', 'stock', 'muzzle', 'trigger', 'gasBlock']) {
      expect(partsForSlot(slot).length).toBeGreaterThanOrEqual(4);
    }
  });

  it('prices later rungs from a base cost and a rate', () => {
    expect(PARTS.trigger_match.cost).toBe(400);
    expect(PARTS.trigger_binary.cost).toBe(ladderCost(400, 1.9, 2));
    expect(PARTS.trigger_volt.cost).toBeGreaterThan(PARTS.trigger_binary.cost);
    expect(PARTS.muzzle_brake.cost).toBeGreaterThan(PARTS.muzzle_comp.cost);
    expect(PARTS.muzzle_hybrid.cost).toBeGreaterThan(PARTS.muzzle_ported.cost);
  });

  it('replaces the suppressor line with recoil/spread muzzle devices', () => {
    expect(PARTS.muzzle_can).toBeUndefined();
    expect(PARTS.muzzle_flash).toBeUndefined();
    expect(partsForSlot('muzzle').map((p) => p.id)).toEqual([
      'muzzle_none',
      'muzzle_comp',
      'muzzle_brake',
      'muzzle_ported',
      'muzzle_hybrid',
    ]);
    const comp = PARTS.muzzle_comp.mods;
    const brake = PARTS.muzzle_brake.mods;
    const ported = PARTS.muzzle_ported.mods;
    const hybrid = PARTS.muzzle_hybrid.mods;
    expect(brake.bloomPerShot).toBeLessThan(comp.bloomPerShot);
    expect(hybrid.bloomPerShot).toBeLessThan(brake.bloomPerShot);
    expect(ported.baseSpread).toBeLessThan(brake.baseSpread);
    expect(hybrid.baseSpread).toBe(ported.baseSpread);
    expect(hybrid.bloomPerShot).toBeLessThan(ported.bloomPerShot);
  });

  it('keeps Piston Drive a cycle upgrade over Overgassed', () => {
    const profile = defaultProfile();
    profile.owned.push('t2_tactical', 't3_ordnance', 'gas_adjust', 'gas_over', 'gas_piston');
    profile.loadout.receiver = 't3_ordnance';
    profile.loadout.gasBlock = 'gas_over';
    const over = resolveStats(profile);
    profile.loadout.gasBlock = 'gas_piston';
    const piston = resolveStats(profile);
    expect(piston.rof).toBeGreaterThan(over.rof);
    expect(piston.heatBuild).toBeLessThan(over.heatBuild);
  });
});

describe('loadout aim stats', () => {
  it('gives starter a limited reach and non-zero base spread', () => {
    const stats = resolveStats(defaultProfile());
    expect(stats.magSize).toBe(1);
    expect(stats.aimReach).toBeGreaterThanOrEqual(AIM_REACH_MIN);
    expect(stats.aimReach).toBeCloseTo(AIM_REACH_BASE, 5);
    expect(stats.shotRange).toBeCloseTo(SHOT_REACH_BASE, 5);
    expect(stats.baseSpread).toBeGreaterThan(1.5);
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
    const profile = defaultProfile();
    profile.owned.push('t2_tactical', 'optic_dot', 'optic_acog');
    profile.loadout.receiver = 't2_tactical';
    const irons = resolveStats(profile);
    profile.loadout.optic = 'optic_dot';
    const dot = resolveStats(profile);
    profile.loadout.optic = 'optic_acog';
    const scoped = resolveStats(profile);
    const viewport = { w: 1280, h: 720 };
    const gunX = viewport.w * PLAYER_SCREEN_X_RATIO;
    expect(dot.aimReach).toBeGreaterThan(irons.aimReach);
    expect(scoped.aimReach).toBeGreaterThan(dot.aimReach);
    expect(gunX + effectiveAimReach(dot, viewport)).toBeLessThan(viewport.w * 0.5);
    expect(gunX + effectiveAimReach(scoped, viewport)).toBeGreaterThan(viewport.w * 0.5);
    expect(gunX + effectiveAimReach(scoped, viewport)).toBeLessThan(viewport.w * 0.7);
    expect(scoped.baseSpread).toBeLessThan(irons.baseSpread);
    expect(scoped.shotRange).toBeCloseTo(irons.shotRange, 5);
    expect(effectiveShotRange(scoped, viewport)).toBeCloseTo(effectiveShotRange(irons, viewport), 5);
    expect(usesFullScreenAim(scoped)).toBe(false);
  });

  it('lets only LPVO hold the whole screen', () => {
    const profile = defaultProfile();
    profile.owned.push('t2_tactical', 't3_ordnance', 'optic_dot', 'optic_acog', 'optic_lpvo');
    profile.loadout.receiver = 't3_ordnance';
    profile.loadout.optic = 'optic_acog';
    const acog = resolveStats(profile);
    profile.loadout.optic = 'optic_lpvo';
    const lpvo = resolveStats(profile);
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
    const profile = defaultProfile();
    profile.owned.push('barrel_carbine', 'barrel_rifle');
    const stub = resolveStats(profile);
    profile.loadout.barrel = 'barrel_rifle';
    const rifle = resolveStats(profile);
    const viewport = { w: 1280, h: 720 };
    expect(rifle.shotRange).toBeGreaterThan(stub.shotRange);
    expect(rifle.aimReach).toBeCloseTo(stub.aimReach, 5);
    expect(effectiveShotRange(rifle, viewport)).toBeGreaterThan(effectiveShotRange(stub, viewport));
    expect(effectiveAimReach(rifle, viewport)).toBeCloseTo(effectiveAimReach(stub, viewport), 5);
  });

  it('tightens marksman without unlocking extra sight reach', () => {
    const profile = defaultProfile();
    profile.skillRanks.marksman = 8;
    profile.owned.push('t2_tactical', 'stock_wire', 'stock_combat', 'stock_precision');
    profile.loadout.receiver = 't2_tactical';
    profile.loadout.stock = 'stock_precision';
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

  it('builds a symmetric perfect band from perfectWidth', () => {
    const band = perfectBand({ perfectWidth: 0.1 });
    expect(band.b - band.a).toBeCloseTo(0.1, 6);
    expect((band.a + band.b) / 2).toBeCloseTo(0.58, 6);
  });
});

describe('skills & profile', () => {
  it('includes marksman in empty ranks', () => {
    expect(emptyRanks().marksman).toBe(0);
    expect(SKILLS.marksman.perRank.aimReach).toBeUndefined();
    expect(SKILLS.elevation).toBeUndefined();
    expect(Object.keys(SKILLS).length % 2).toBe(0);
  });

  it('refunds retired elevation ranks', () => {
    const ranks = { elevation: 2, marksman: 1 };
    const xp = refundRetiredRanks(ranks);
    expect(ranks.elevation).toBeUndefined();
    expect(ranks.marksman).toBe(1);
    expect(xp).toBe(skillCost({ baseCost: 35 }, 0) + skillCost({ baseCost: 35 }, 1));
  });

  it('prices skill ranks with a mild curve', () => {
    expect(skillCost(SKILLS.marksman, 0)).toBe(40);
    expect(skillCost(SKILLS.marksman, 3)).toBeGreaterThan(skillCost(SKILLS.marksman, 0));
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
    expect(hard.torso).toBeGreaterThan(soft.torso);
    expect(hard.head).toBeGreaterThan(soft.head);
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
    const unhit = 100 - 118 * dt;
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
    const vols = Object.values(c);
    const left = Math.min(...vols.map((v) => v.x - v.r)) - 40;
    const right = Math.max(...vols.map((v) => v.x + v.r)) + 40;
    const top = c.head.y - c.head.r + 2;
    const bot = c.pelvis.y + c.pelvis.r - 2;
    for (let y = top; y <= bot; y += 5) {
      const hit = vols.some((v) => segmentHitsCircle(left, y, right, y, v.x, v.y, v.r));
      expect(hit).toBe(true);
    }
  });

  it('drops lethal hp on the bar and springs damage floaters', () => {
    const terrain = { height: () => 400 };
    const foe = createEnemy(0, terrain, 1, 80, 'zombie');
    expect(lethalHpRatio(foe)).toBe(1);
    expect(enemyIsHurt(foe)).toBe(false);
    foe.hp.torso -= 20;
    expect(lethalHpRatio(foe)).toBeLessThan(1);
    expect(enemyIsHurt(foe)).toBe(true);
    const afterLeg = lethalHpRatio(foe);
    foe.hp.lLeg = 0;
    expect(lethalHpRatio(foe)).toBeCloseTo(afterLeg, 5);
    const legs = createEnemy(0, terrain, 1, 80, 'zombie');
    legs.hp.lLeg = 0;
    expect(enemyIsHurt(legs)).toBe(false);
    expect(lethalHpRatio(legs)).toBe(1);
    foe.hp.head = 0;
    expect(lethalHpRatio(foe)).toBeLessThan(afterLeg);

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

  it('exposes gunsmith rails from STATS clamps', () => {
    const rows = gunsmithStatRows(resolveStats(defaultProfile()));
    expect(rows.map((r) => r[0])).toEqual(STATS.filter((s) => s.gunsmith).map((s) => s.gunsmithLabel));
    expect(rows.map((r) => r[0])).toEqual(['DMG', 'ROF', 'MAG', 'VEL', 'PEN', 'RLD', 'Range', 'Sight', 'SPRD']);
    expect(rows.find((r) => r[0] === 'ROF')[1]).toBe(formatRpm(resolveStats(defaultProfile())));
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
    expect(stats.cashMul).toBeCloseTo(1.14);
    const ghost = defaultProfile();
    ghost.loadout.barrel = 'barrel_stub';
    PARTS.barrel_stub.mods.notAStat = 99;
    try {
      const after = resolveStats(ghost);
      expect(after.notAStat).toBeUndefined();
    } finally {
      delete PARTS.barrel_stub.mods.notAStat;
    }
  });
});

describe('walker roles', () => {
  const terrain = { height: () => 400 };

  it('gates tank, heavy, and behemoth by road and endless metres', () => {
    expect(roleUnlocked('tank', { levelIndex: 3 })).toBe(false);
    expect(roleUnlocked('tank', { levelIndex: 4 })).toBe(true);
    expect(roleUnlocked('heavy', { levelIndex: ROLE_UNLOCK.heavy.road - 1 })).toBe(false);
    expect(roleUnlocked('heavy', { levelIndex: ROLE_UNLOCK.heavy.road })).toBe(true);
    expect(roleUnlocked('behemoth', { levelIndex: 18 })).toBe(false);
    expect(roleUnlocked('behemoth', { levelIndex: 19 })).toBe(true);
    expect(roleUnlocked('behemoth', { endless: true, meters: 999 })).toBe(false);
    expect(roleUnlocked('behemoth', { endless: true, meters: 1000 })).toBe(true);
    expect(Object.keys(ROLES)).toEqual(['grunt', 'tank', 'heavy', 'behemoth']);
  });

  it('makes tanks slower, tougher, and larger than grunts', () => {
    const chase = THREAT.chill.speed;
    const grunt = createEnemy(0, terrain, 1, chase, 'zombie', 'grunt');
    const tank = createEnemy(0, terrain, 1, chase, 'zombie', 'tank');
    const heavy = createEnemy(0, terrain, 1, chase, 'zombie', 'heavy');
    const boss = createEnemy(0, terrain, 1, chase, 'zombie', 'behemoth');
    expect(tank.hp.torso).toBeGreaterThan(grunt.hp.torso);
    expect(heavy.hp.torso).toBeGreaterThan(tank.hp.torso);
    expect(boss.hp.torso).toBeGreaterThan(heavy.hp.torso);
    expect(tank.speed).toBeLessThan(grunt.speed);
    expect(heavy.speed).toBeLessThan(tank.speed);
    expect(boss.speed).toBeLessThan(heavy.speed);
    expect(boss.speed).toBeGreaterThan(V_RETREAT);
    expect(boss.speed).toBeGreaterThanOrEqual(CHASE_FLOOR);
    expect(limbCircles(boss).head.r).toBeGreaterThan(limbCircles(grunt).head.r);
    expect(poseEnemyLocal(boss).scale).toBeCloseTo(ROLES.behemoth.scale);
  });

  it('guarantees a behemoth on Road 20 and Endless 1km', () => {
    const viewport = { w: 1280, h: 720 };
    const road = createRun({ profile: defaultProfile(), viewport, type: 'campaign', levelIndex: 19, seed: 1 });
    road.player.worldX = -40 * PX_PER_M;
    road.spawnTimer = 0;
    stepSpawner(road, 0.016, viewport);
    expect(road.enemies.some((e) => e.role === 'behemoth')).toBe(true);
    expect(road.spawnedBehemoth).toBe(true);

    const endless = createRun({ profile: defaultProfile(), viewport, type: 'endless', levelIndex: 0, seed: 1 });
    endless.player.worldX = -1000 * PX_PER_M;
    endless.spawnTimer = 0;
    stepSpawner(endless, 0.016, viewport);
    expect(endless.enemies.some((e) => e.role === 'behemoth')).toBe(true);
  });

  it('forces the first late-road pick to be a behemoth', () => {
    const run = { endless: false, levelIndex: 19, spawnedBehemoth: false, rng: () => 0.99 };
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
    const steps = Math.ceil(DEATH_HOLD / dt) + 2;
    for (let i = 0; i < steps; i++) simulate(run2, dt, viewport, idle);
    expect(run2.ended).toBe('death');
  });

  it('lets a crawler finish a contact kill', () => {
    const run = liveRun();
    const crawler = createEnemy(run.player.worldX, run.terrain, 1, 80, 'zombie');
    crawler.hp.lLeg = 0;
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
});

describe('pwa updates', () => {
  it('blocks service-worker refresh while a run is live', () => {
    expect(pwaUpdateBlocked('run', { ended: null })).toBe(true);
    expect(pwaUpdateBlocked('run', { ended: 'death' })).toBe(false);
    expect(pwaUpdateBlocked('hub', { ended: null })).toBe(false);
    expect(pwaUpdateBlocked('run', null)).toBe(false);
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
    for (let i = 0; i < 100; i++) q.noteFrame(0.016);
    expect(q.cheap).toBe(false);
    expect(q.fx).toBe(true);
    expect(q.hillStep).toBe(hill);
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
