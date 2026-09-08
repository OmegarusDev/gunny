import { describe, expect, it } from 'vitest';
import {
  AIM_REACH_MAX,
  AIM_REACH_MIN,
  ECONOMY,
  TRACK_METERS,
  enemyHp,
  threatForDistance,
} from '../src/config.js';
import { PARTS } from '../src/data/attachments.js';
import { RECEIVERS } from '../src/data/receivers.js';
import { SKILLS, emptyRanks, skillCost } from '../src/data/skills.js';
import { resolveStats, shotSpreadDeg } from '../src/entities/loadout.js';
import { defaultProfile } from '../src/state/profile.js';
import { clampAimPoint, resolveAimPoint } from '../src/view/aim.js';
import { perfectBand, reloadNorm } from '../src/view/reload.js';
import { uhash } from '../src/util/hash.js';
import { mixHex, mixTone } from '../src/util/color.js';
import { runMeters } from '../src/world/metrics.js';
import { createTerrain } from '../src/world/terrain.js';
import { createPlayer } from '../src/entities/player.js';

describe('threat pacing', () => {
  it('steps spawn pressure across the 250m track', () => {
    const early = threatForDistance(20, 0, false);
    const mid = threatForDistance(100, 0, false);
    const late = threatForDistance(200, 0, false);
    expect(early.spawnInterval).toBeGreaterThan(mid.spawnInterval);
    expect(mid.spawnInterval).toBeGreaterThan(late.spawnInterval);
    expect(late.maxAlive).toBeGreaterThan(early.maxAlive);
    expect(early.hpMul).toBeGreaterThan(late.hpMul);
  });

  it('scales campaign stage harder without changing endless mid-track stage', () => {
    const s0 = threatForDistance(80, 0, false);
    const s2 = threatForDistance(80, 2, false);
    expect(s2.maxAlive).toBeGreaterThanOrEqual(s0.maxAlive);
    expect(s2.speed).toBeGreaterThan(s0.speed);
  });

  it('ramps endless only past TRACK_METERS', () => {
    const before = threatForDistance(TRACK_METERS - 1, 0, true);
    const after = threatForDistance(TRACK_METERS + 200, 0, true);
    expect(after.spawnInterval).toBeLessThan(before.spawnInterval);
    expect(after.maxAlive).toBeGreaterThanOrEqual(before.maxAlive);
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
    expect(RECEIVERS.t3_ordnance.tier).toBe(3);
  });
});

describe('loadout aim stats', () => {
  it('gives starter a limited reach and non-zero base spread', () => {
    const stats = resolveStats(defaultProfile());
    expect(stats.magSize).toBe(1);
    expect(stats.aimReach).toBeGreaterThanOrEqual(AIM_REACH_MIN);
    expect(stats.aimReach).toBeLessThan(220);
    expect(stats.baseSpread).toBeGreaterThan(1.5);
  });

  it('extends reach and tightens spread with optic + marksman', () => {
    const profile = defaultProfile();
    profile.owned.push('t2_tactical', 'optic_dot', 'optic_acog', 'barrel_carbine', 'barrel_rifle');
    profile.loadout.receiver = 't2_tactical';
    profile.loadout.optic = 'optic_acog';
    profile.loadout.barrel = 'barrel_rifle';
    profile.skillRanks.marksman = 5;
    const stats = resolveStats(profile);
    const stock = resolveStats(defaultProfile());
    expect(stats.aimReach).toBeGreaterThan(stock.aimReach);
    expect(stats.baseSpread).toBeLessThan(stock.baseSpread);
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
    expect(SKILLS.marksman.perRank.aimReach).toBe(10);
  });

  it('prices skill ranks with a mild curve', () => {
    expect(skillCost(SKILLS.marksman, 0)).toBe(40);
    expect(skillCost(SKILLS.marksman, 3)).toBeGreaterThan(skillCost(SKILLS.marksman, 0));
  });
});

describe('world helpers', () => {
  it('converts world retreat into metres', () => {
    expect(runMeters({ player: { worldX: -350 } })).toBe(10);
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
