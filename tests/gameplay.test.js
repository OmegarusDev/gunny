import { describe, expect, it } from 'vitest';
import {
  AIM_REACH_BASE,
  AIM_REACH_MAX,
  AIM_REACH_MIN,
  AIM_SCREEN_FRAC,
  ECONOMY,
  HIT_IMPULSE,
  MAX_DPR,
  PLAYER_SCREEN_X_RATIO,
  PX_PER_M,
  SHOT_REACH_BASE,
  SHOT_SCREEN_FRAC,
  TERRAIN_AMP,
  TERRAIN_FLOOR_PAD,
  TERRAIN_HEADROOM,
  THREAT,
  TRACK_METERS,
  clampShotRange,
  effectiveAimReach,
  effectiveShotRange,
  enemyHp,
  threatForDistance,
  usesFullScreenAim,
} from '../src/config.js';
import { PARTS, catalogWindow, partsForSlot } from '../src/data/attachments.js';
import { BIOMES, beatenRoadIndexes, biomeFor } from '../src/data/biomes.js';
import { KINDS } from '../src/data/kinds.js';
import { RECEIVERS } from '../src/data/receivers.js';
import { SKILLS, emptyRanks, refundRetiredRanks, skillCost } from '../src/data/skills.js';
import { gunsmithStatRows, resolveStats, shotSpreadDeg, STATS } from '../src/entities/loadout.js';
import { applyFlinch, createEnemy, lethalHpRatio, limbCircles, stepFlinch } from '../src/entities/enemy.js';
import { defaultProfile, resetProfile } from '../src/state/profile.js';
import { defaultSettings } from '../src/state/settings.js';
import { wantsImmersive, usesHtmlFullscreen } from '../src/engine/immersive.js';
import { clampAimPoint, clampToViewport, resolveAimPoint } from '../src/view/aim.js';
import { perfectBand, reloadNorm } from '../src/view/reload.js';
import { uhash } from '../src/util/hash.js';
import { mixHex, mixTone } from '../src/util/color.js';
import { createTerrain } from '../src/world/terrain.js';
import { createPlayer } from '../src/entities/player.js';
import { playerHeadClearance, poseEnemyLocal } from '../src/figure.js';
import { shotEnergy } from '../src/systems/impulse.js';
import { spawnRagdoll } from '../src/systems/ragdoll.js';
import { stepGibs } from '../src/systems/gibs.js';
import { createRun, simulate } from '../src/systems/run.js';
import { spawnBullet, stepBullets, rangeDamageMul } from '../src/systems/ballistics.js';
import { capDpr, createQuality } from '../src/engine/quality.js';
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
    expect(early.hpMul).toBeCloseTo(late.hpMul);
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

  it('steps campaign grunt HP per road, not within the 250m', () => {
    const l0s = threatForDistance(0, 0, false);
    const l0e = threatForDistance(TRACK_METERS, 0, false);
    const l2s = threatForDistance(80, 2, false);
    const l2e = threatForDistance(TRACK_METERS, 2, false);
    expect(l0e.hpMul).toBeCloseTo(l0s.hpMul);
    expect(l2e.hpMul).toBeCloseTo(l2s.hpMul);
    expect(l2s.hpMul).toBeGreaterThan(l0s.hpMul);
    expect(l2s.maxAlive).toBeGreaterThanOrEqual(threatForDistance(80, 0, false).maxAlive);
    expect(l2s.speed).toBeGreaterThan(threatForDistance(80, 0, false).speed);
  });

  it('makes Endless a steeper curve than campaign, not a 1:1 road map', () => {
    const camp0_80 = threatForDistance(80, 0, false);
    const camp0_250 = threatForDistance(TRACK_METERS, 0, false);
    const camp1_250 = threatForDistance(TRACK_METERS, 1, false);
    const camp4_250 = threatForDistance(TRACK_METERS, 4, false);
    const end80 = threatForDistance(80, 0, true);
    const end250 = threatForDistance(TRACK_METERS, 0, true);
    const end500 = threatForDistance(500, 0, true);

    expect(end80.hpMul).toBeGreaterThan(camp0_80.hpMul);
    expect(end80.spawnInterval).toBeLessThan(camp0_80.spawnInterval);
    expect(end250.hpMul).toBeGreaterThan(camp0_250.hpMul);
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
    expect(l10e.hpMul).toBeCloseTo(l10s.hpMul);
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
    expect(RECEIVERS.t2_tactical.requires).toBe('t1_stock');
    expect(RECEIVERS.t2_tactical.cost).toBe(550);
    expect(RECEIVERS.t3_ordnance.tier).toBe(3);
    expect(RECEIVERS.t3_ordnance.cost).toBe(1350);
    expect(RECEIVERS.t3_ordnance.cost).toBeGreaterThan(RECEIVERS.t2_tactical.cost);
  });

  it('wipes a live profile back to camp defaults', () => {
    const profile = defaultProfile();
    profile.cash = 500;
    profile.xp = 80;
    profile.unlockedLevel = 2;
    resetProfile(profile);
    expect(profile).toEqual(defaultProfile());
  });
});

describe('gunsmith catalog', () => {
  it('keeps magazine ladder order and short labels', () => {
    const mags = partsForSlot('magazine');
    expect(mags.map((p) => p.short)).toEqual(mags.map((p) => String(p.mods.magSize + 1)));
    expect(mags[0].id).toBe('mag_1');
    expect(mags.find((p) => p.id === 'mag_40').requires).toBe('mag_35');
    expect(mags.find((p) => p.id === 'mag_80').requires).toBe('mag_75');
    expect(RECEIVERS.t1_stock.short).toBe('Stock');
    expect(RECEIVERS.t2_tactical.short).toBe('Tactical');
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
  });

  it('keeps at least four rungs on every attachment slot', () => {
    for (const slot of ['barrel', 'magazine', 'springs', 'optic', 'stock', 'muzzle', 'trigger', 'gasBlock']) {
      expect(partsForSlot(slot).length).toBeGreaterThanOrEqual(4);
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
    expect(circles.head.x).toBe(combat.head.x);
  });

  it('drops lethal hp on the bar and springs damage floaters', () => {
    const terrain = { height: () => 400 };
    const foe = createEnemy(0, terrain, 1, 80, 'zombie');
    expect(lethalHpRatio(foe)).toBe(1);
    foe.hp.torso -= 20;
    expect(lethalHpRatio(foe)).toBeLessThan(1);
    const afterLeg = lethalHpRatio(foe);
    foe.hp.lLeg = 0;
    expect(lethalHpRatio(foe)).toBeCloseTo(afterLeg, 5);
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
    expect(rows.length).toBeGreaterThanOrEqual(8);
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

  it('does not extract endless past TRACK_METERS', () => {
    const run = liveRun('endless');
    run.player.worldX = -TRACK_METERS * PX_PER_M - 400;
    simulate(run, dt, viewport, idle);
    expect(run.ended).not.toBe('extract');
  });

  it('starts reload after the last round and dies on torso contact', () => {
    const run = liveRun();
    run.weapon.ammo = 1;
    run.weapon.cooldown = 0;
    simulate(run, dt, viewport, { ...idle, firing: true });
    expect(run.weapon.reloading).toBe(true);

    const run2 = liveRun();
    const foe = createEnemy(run2.player.worldX, run2.terrain, 1, 80, 'zombie');
    run2.enemies.push(foe);
    simulate(run2, dt, viewport, idle);
    expect(run2.ended).toBe('death');
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
    for (let i = 0; i < 12; i++) q.noteFrame(0.04);
    expect(q.cheap).toBe(true);
    expect(q.fx).toBe(false);
    expect(q.hillStep).toBeGreaterThan(6);
    expect(q.propMul).toBeGreaterThan(1);
  });
});
