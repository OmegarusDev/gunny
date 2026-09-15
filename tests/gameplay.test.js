import { describe, expect, it } from 'vitest';
import {
  AIM_REACH_MAX,
  AIM_REACH_MIN,
  ECONOMY,
  HIT_IMPULSE,
  MAX_DPR,
  PX_PER_M,
  THREAT,
  TRACK_METERS,
  enemyHp,
  threatForDistance,
} from '../src/config.js';
import { PARTS, partsForSlot } from '../src/data/attachments.js';
import { BIOMES } from '../src/data/biomes.js';
import { KINDS } from '../src/data/kinds.js';
import { RECEIVERS } from '../src/data/receivers.js';
import { SKILLS, emptyRanks, skillCost } from '../src/data/skills.js';
import { gunsmithStatRows, resolveStats, shotSpreadDeg, STATS } from '../src/entities/loadout.js';
import { applyFlinch, createEnemy, limbCircles, stepFlinch } from '../src/entities/enemy.js';
import { defaultProfile } from '../src/state/profile.js';
import { clampAimPoint, resolveAimPoint } from '../src/view/aim.js';
import { perfectBand, reloadNorm } from '../src/view/reload.js';
import { uhash } from '../src/util/hash.js';
import { mixHex, mixTone } from '../src/util/color.js';
import { runMeters } from '../src/world/metrics.js';
import { createTerrain } from '../src/world/terrain.js';
import { createPlayer } from '../src/entities/player.js';
import { poseEnemyLocal } from '../src/figure.js';
import { shotEnergy } from '../src/systems/impulse.js';
import { spawnRagdoll } from '../src/systems/ragdoll.js';
import { createRun, simulate } from '../src/systems/run.js';
import { capDpr, createQuality } from '../src/engine/quality.js';

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
    expect(early.hpMul).toBeGreaterThan(late.hpMul);
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

  it('scales later campaign roads at the same metre while endless uses the L0 curve', () => {
    const s0 = threatForDistance(80, 0, false);
    const s2 = threatForDistance(80, 2, false);
    expect(s2.maxAlive).toBeGreaterThanOrEqual(s0.maxAlive);
    expect(s2.speed).toBeGreaterThan(s0.speed);
    expect(threatForDistance(80, 0, true).spawnInterval).toBe(s0.spawnInterval);
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
