import {
  DEATH_HOLD,
  effectiveAimReach,
  effectiveShotRange,
  HIT_IMPULSE,
  TRACK_METERS,
  threatForDistance,
  usesFullScreenAim,
  V_RETREAT,
} from '../config.js';
import { randomSeed, seedForLevel, seedFromUint32 } from '../engine/rng.js';
import { biomeFor } from '../data/biomes.js';
import { createTerrain } from '../world/terrain.js';
import { createWeather } from '../world/weather.js';
import { runMeters } from '../world/metrics.js';
import { createPlayer, screenToWorld, cameraX } from '../entities/player.js';
import { applyFlinch, cacheEnemyPose, isDead, lethalCircles, stepFlinch, updateLocomotion } from '../entities/enemy.js';
import { gaitPlanted, gunWorld, playerCoreFromPose, posePlayerLocal } from '../figure.js';
import { magRof, resolveStats, shotSpreadDeg } from '../entities/loadout.js';
import { rangeSpreadDeg, spawnBullet, stepBullets } from './ballistics.js';
import { stepSpawner } from './spawner.js';
import { spawnRagdoll, stepRagdolls } from './ragdoll.js';
import { spawnBurst, spawnGibs, stepGibs } from './gibs.js';
import { startReload, tapReload, stepReload } from './activeReload.js';
import { pointerInReloadGauge } from '../view/reload.js';
import { resolveAimPoint } from '../view/aim.js';
import { roleOf } from '../data/roles.js';
import { createScore, tickDistance, onHit, onKill, onPerfect, extractBonus } from './scoring.js';
import { rectCircleOverlap } from './hits.js';
import { beginFootFrame, playDry, playFlesh, playFoot, playMuzzle } from '../audio/synth.js';

export function createRun({ profile, viewport, type, levelIndex, seed }) {
  const seeded =
    seed != null
      ? { seed, rng: seedFromUint32(seed) }
      : type === 'endless'
        ? randomSeed()
        : seedForLevel(levelIndex);
  const biome = biomeFor(levelIndex);
  const terrain = createTerrain(seeded.seed, viewport.h, biome);
  const weather = createWeather(seeded.rng);
  const stats = resolveStats(profile);
  const player = createPlayer(0, terrain);
  return {
    type,
    endless: type === 'endless',
    levelIndex,
    seed: seeded.seed,
    rng: seeded.rng,
    biome,
    terrain,
    weather,
    stats,
    player,
    enemies: [],
    bullets: [],
    ragdolls: [],
    frozenCorpses: [],
    gibs: [],
    particles: [],
    callouts: [],
    impacts: [],
    pendingHits: [],
    shakeX: 0,
    shakeY: 0,
    spawnedBehemoth: false,
    spawnTimer: 0.35,
    threat: threatForDistance(0, levelIndex, type === 'endless'),
    paused: false,
    ended: null,
    dying: false,
    deathT: 0,
    weapon: {
      ammo: stats.magSize,
      cooldown: 0,
      bloom: 0,
      heat: 0,
      shotFlash: 0,
      dryFlash: 0,
      magIn: false,
      reloading: false,
      reloadT: 0,
      reloadDur: stats.reload,
      jammed: false,
      tapped: false,
      perfectMag: false,
      firing: false,
      suppressFire: false,
    },
    score: createScore(),
    aim: null,
  };
}

function degToRad(d) {
  return (d * Math.PI) / 180;
}

function applyHits(run) {
  const { stats } = run;
  for (const hit of run.pendingHits) {
    const enemy = hit.enemy;
    if (!enemy.alive) continue;
    const crit = hit.crit ?? (run.rng() < stats.critChance);
    const loc = hit.locational;
    const critMul = crit ? stats.critMult : 1;
    const rangeMul = hit.rangeMul ?? 1;
    const dmg = stats.damage * loc * critMul * rangeMul;
    const zone = hit.zone;
    const pool = zone === 'head' ? 'head' : zone === 'lLeg' || zone === 'rLeg' ? zone : 'torso';
    const remaining = Math.max(0, enemy.hp[pool]);
    enemy.hp[pool] -= dmg;
    if (zone === 'head') enemy.hp.head = Math.max(0, enemy.hp.head);
    onHit(run.score, zone, crit);
    playFlesh(zone === 'head');

    const applied = Math.max(0, dmg);
    const n = applied >= 9.5 ? String(Math.round(applied)) : applied.toFixed(1);
    run.callouts.push({
      x: hit.x + (run.rng() - 0.5) * 16,
      y: hit.y - 12,
      vx: (run.rng() - 0.5) * 70,
      vy: -260,
      text: n,
      life: 0.92,
      maxLife: 0.92,
      crit,
      head: zone === 'head',
    });

    if (zone === 'head') {
      run.particles.push(...spawnBurst(hit.x, hit.y, 14, run.rng, hit.nx, hit.ny));
    } else {
      run.particles.push(...spawnBurst(hit.x, hit.y, 6, run.rng, hit.nx, hit.ny));
    }
    run.impacts.push({ x: hit.x, y: hit.y, life: 0.1, dirt: false, head: zone === 'head' });

    applyFlinch(enemy, hit, { crit });
    updateLocomotion(enemy);

    if (isDead(enemy)) {
      enemy.alive = false;
      if (zone === 'head' || enemy.hp.head <= 0) enemy.severedHead = true;
      const overkill = dmg > remaining * 2 && remaining > 0;
      const role = roleOf(enemy.role);
      const hpMul = run.threat?.hpMul || 1;
      onKill(run.score, stats.cashMul * role.cash, role.xp * hpMul);
      if (overkill) {
        run.gibs.push(...spawnGibs(hit.x, hit.y, hit.nx, hit.ny, 10, run.rng));
      } else {
        run.ragdolls.push(spawnRagdoll(enemy, hit, run.rng));
      }
    }
  }
  run.pendingHits.length = 0;
}

function tryFire(run, firing, viewport, tap) {
  const { weapon, stats, player } = run;
  if (weapon.reloading || weapon.suppressFire) return false;
  if (!firing) {
    weapon.firing = false;
    return false;
  }
  if (weapon.ammo <= 0) return false;
  if (weapon.cooldown > 0) {
    if (tap) {
      playDry();
      weapon.dryFlash = 0.14;
    }
    return false;
  }
  weapon.firing = true;
  weapon.cooldown = 1 / magRof(stats, weapon);
  weapon.ammo -= 1;
  const gun = gunWorld(player);
  const shotRange = effectiveShotRange(stats, viewport);
  const pre = {
    x: gun.x + Math.cos(player.aimAngle) * gun.len,
    y: gun.y + Math.sin(player.aimAngle) * gun.len,
  };
  let bloomDeg = shotSpreadDeg(stats, weapon);
  if (run.aim) {
    const aimWorld = screenToWorld(run.aim.x, run.aim.y, player.worldX, viewport);
    const aimDist = Math.hypot(aimWorld.x - pre.x, aimWorld.y - pre.y);
    bloomDeg += rangeSpreadDeg(aimDist, shotRange);
  }
  const spread = degToRad((run.rng() * 2 - 1) * bloomDeg);
  const angle = player.aimAngle + spread;
  const muzzle = {
    x: gun.x + Math.cos(angle) * gun.len,
    y: gun.y + Math.sin(angle) * gun.len,
  };
  run.bullets.push(spawnBullet(muzzle.x, muzzle.y, angle, stats, weapon.perfectMag, shotRange));
  weapon.bloom = Math.min(stats.bloomCap, weapon.bloom + stats.bloomPerShot);
  weapon.shotFlash = 0.09;
  player.shotKick = Math.min(0.12, (player.shotKick || 0) + 0.07);
  run.shakeX = (run.shakeX || 0) - Math.cos(angle) * 2.4;
  run.shakeY = (run.shakeY || 0) - Math.sin(angle) * 1.5 - 0.9;
  const sparks = spawnBurst(muzzle.x, muzzle.y, 5, run.rng, Math.cos(angle), Math.sin(angle));
  for (const p of sparks) {
    p.tone = 'spark';
    p.life = 0.09 + run.rng() * 0.05;
    p.max = 0.16;
  }
  run.particles.push(...sparks);
  playMuzzle(stats);
  return true;
}

function playerCore(player) {
  return playerCoreFromPose(player);
}

function beginDeath(run, enemy) {
  if (run.dying || run.ended) return;
  run.dying = true;
  run.deathT = 0;
  run.player.dead = true;
  run.weapon.firing = false;
  run.weapon.suppressFire = true;
  run.aim = null;
  const nx = enemy && enemy.worldX >= run.player.worldX ? -1 : 1;
  const rag = spawnRagdoll(
    {
      pose: posePlayerLocal(run.player),
      worldX: run.player.worldX,
      y: run.player.y,
      kind: 'gunner',
    },
    { nx, ny: -0.3, energy: 1.6, zone: 'upper' },
    run.rng,
  );
  rag.hero = true;
  run.ragdolls.push(rag);
}

function chaseLiving(run, dt) {
  for (const enemy of run.enemies) {
    if (!enemy.alive) continue;
    stepFlinch(enemy, dt);
    const hitch = enemy.stun > 0 ? HIT_IMPULSE.stunHitch : 1;
    enemy.worldX -= enemy.speed * hitch * dt;
    enemy.y = run.terrain.height(enemy.worldX);
  }
}

function stepDeath(run, dt, viewport) {
  run.deathT += dt;
  run.weapon.firing = false;
  chaseLiving(run, dt);
  for (const enemy of run.enemies) {
    if (enemy.alive) cacheEnemyPose(enemy);
  }
  stepFootfalls(run, viewport);
  stepRagdolls(run, dt, viewport);
  stepGibs(run, dt);
  if (run.deathT >= DEATH_HOLD) {
    run.dying = false;
    run.ended = 'death';
  }
}

function checkContact(run) {
  if (run.dying || run.ended) return;
  const core = playerCore(run.player);
  for (const enemy of run.enemies) {
    if (!enemy.alive) continue;
    for (const c of lethalCircles(enemy)) {
      if (rectCircleOverlap(core.x, core.y, core.w, core.h, c.x, c.y, c.r)) {
        beginDeath(run, enemy);
        return;
      }
    }
  }
}

function emitPlant(ent, planted, play) {
  if (ent.footL == null) {
    ent.footL = planted.L;
    ent.footR = planted.R;
    return;
  }
  if (planted.L && !ent.footL) play();
  if (planted.R && !ent.footR) play();
  ent.footL = planted.L;
  ent.footR = planted.R;
}

function stepFootfalls(run, viewport) {
  beginFootFrame();
  const { player } = run;
  emitPlant(player, gaitPlanted('gunner', 1, player.worldX), () => playFoot({ voice: 'boot' }));
  const cam = cameraX(player.worldX, viewport);
  for (const enemy of run.enemies) {
    if (!enemy.alive) continue;
    const sx = enemy.worldX - cam;
    if (sx < -40 || sx > viewport.w + 40) {
      enemy.footL = null;
      enemy.footR = null;
      continue;
    }
    emitPlant(enemy, gaitPlanted(enemy.kind || 'zombie', enemy.id || 1, enemy.worldX), () =>
      playFoot({
        voice: enemy.crawling ? 'drag' : 'zombie',
        dist: Math.abs(enemy.worldX - player.worldX),
        pan: (sx / viewport.w) * 2 - 1,
      }),
    );
  }
}

export function simulate(run, dt, viewport, input) {
  if (run.ended || run.paused) return;
  if (run.dying) {
    stepDeath(run, dt, viewport);
    return;
  }

  const { player, weapon, stats } = run;
  player.worldX -= V_RETREAT * (stats.moveMul || 1) * dt;
  player.y = run.terrain.height(player.worldX);
  player.shotKick = (player.shotKick || 0) * Math.exp(-dt * 18);
  run.shakeX = (run.shakeX || 0) * Math.exp(-dt * 18);
  run.shakeY = (run.shakeY || 0) * Math.exp(-dt * 18);
  weapon.shotFlash = Math.max(0, (weapon.shotFlash || 0) - dt);
  weapon.dryFlash = Math.max(0, (weapon.dryFlash || 0) - dt);

  const gun = gunWorld(player);
  const aim = resolveAimPoint(
    input.pointerX,
    input.pointerY,
    player,
    viewport,
    effectiveAimReach(stats, viewport),
    { fullScreen: usesFullScreenAim(stats) },
  );
  run.aim = aim;
  const aimWorld = screenToWorld(aim.x, aim.y, player.worldX, viewport);
  const target = Math.atan2(aimWorld.y - gun.y, aimWorld.x - gun.x);
  if (input.pointerTap) {
    player.aimAngle = target;
  } else {
    const maxTurn = stats.aimRate * dt;
    let diff = target - player.aimAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) <= maxTurn) player.aimAngle = target;
    else player.aimAngle += Math.sign(diff) * maxTurn;
  }

  weapon.cooldown = Math.max(0, weapon.cooldown - dt);
  if (!input.firing) weapon.suppressFire = false;

  const holding = input.firing && !weapon.reloading && !weapon.suppressFire;
  if (holding) {
    weapon.heat = Math.min(1, weapon.heat + stats.heatBuild * dt);
  } else {
    weapon.bloom = Math.max(0, weapon.bloom - stats.bloomRecover * dt);
    weapon.heat = Math.max(0, weapon.heat - stats.heatDump * dt);
  }

  const tapReloadIntent =
    input.reloadPressed ||
    (weapon.reloading && input.pointerTap) ||
    (input.pointerTap && pointerInReloadGauge(input.pointerX, input.pointerY, viewport));
  let reloadTap = null;
  const wasReloading = weapon.reloading;
  if (weapon.reloading) {
    if (tapReloadIntent) {
      reloadTap = tapReload(weapon, stats);
      if (reloadTap === 'perfect') onPerfect(run.score);
      if (reloadTap === 'perfect' || reloadTap === 'jam') weapon.suppressFire = true;
    }
  } else {
    const shot = tryFire(run, holding, viewport, input.pointerTap);
    if (shot && weapon.ammo <= 0) {
      startReload(weapon, stats);
      weapon.suppressFire = true;
    }
  }
  stepReload(weapon, stats, dt);
  if (wasReloading && !weapon.reloading && reloadTap !== 'perfect' && reloadTap !== 'jam') {
    weapon.suppressFire = false;
  }

  chaseLiving(run, dt);

  stepSpawner(run, dt, viewport);
  stepFootfalls(run, viewport);
  for (const enemy of run.enemies) {
    if (enemy.alive) cacheEnemyPose(enemy);
  }
  stepBullets(run, dt, viewport);
  applyHits(run);
  const left = cameraX(player.worldX, viewport);
  run.enemies = run.enemies.filter((e) => e.alive && e.worldX > left - 140);
  stepRagdolls(run, dt, viewport);
  stepGibs(run, dt);
  tickDistance(run.score, runMeters(run));
  if (!run.endless && runMeters(run) >= TRACK_METERS && !run.ended && !run.dying) {
    extractBonus(run.score, run.levelIndex);
    run.ended = 'extract';
    return;
  }
  checkContact(run);
}
