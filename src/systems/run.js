import { PERFECT_MAG_MULT, PX_PER_M, TRACK_METERS, V_RETREAT } from '../config.js';
import { randomSeed, seedForLevel, seedFromUint32 } from '../engine/rng.js';
import { biomeFor, biomeFromSeed } from '../data/biomes.js';
import { createTerrain } from '../world/terrain.js';
import { createWeather } from '../world/weather.js';
import { createPlayer, screenToWorld, cameraX } from '../entities/player.js';
import { lethalCircles, isDead, updateLocomotion } from '../entities/enemy.js';
import { gunWorld, playerCoreFromPose } from '../figure.js';
import { resolveStats } from '../entities/loadout.js';
import { spawnBullet, stepBullets } from './ballistics.js';
import { stepSpawner } from './spawner.js';
import { spawnRagdoll, stepRagdolls } from './ragdoll.js';
import { spawnBurst, spawnGibs, stepGibs } from './gibs.js';
import { startReload, tapReload, stepReload, pointerInReloadGauge } from './activeReload.js';
import { createScore, tickDistance, onHit, onKill, onPerfect, extractBonus } from './scoring.js';
import { rectCircleOverlap } from './hits.js';
import { playFlesh, playMuzzle } from '../audio/synth.js';

export function createRun({ profile, viewport, type, levelIndex, seed }) {
  const seeded =
    seed != null
      ? { seed, rng: seedFromUint32(seed) }
      : type === 'endless'
        ? randomSeed()
        : seedForLevel(levelIndex);
  const biome = type === 'endless' ? biomeFromSeed(seeded.seed) : biomeFor(levelIndex);
  const terrain = createTerrain(seeded.seed, viewport.h);
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
    spawnTimer: 0.35,
    threat: null,
    paused: true,
    ended: null,
    weapon: {
      ammo: stats.magSize,
      cooldown: 0,
      bloom: 0,
      heat: 0,
      reloading: false,
      reloadT: 0,
      reloadDur: stats.reload,
      jammed: false,
      tapped: false,
      perfectMag: false,
      firing: false,
      toneAcc: 0,
      suppressFire: false,
    },
    score: createScore(),
    lastCallout: '',
  };
}

function degToRad(d) {
  return (d * Math.PI) / 180;
}

function applyHits(run) {
  const { stats, weapon } = run;
  for (const hit of run.pendingHits) {
    const enemy = hit.enemy;
    if (!enemy.alive) continue;
    const crit = run.rng() < stats.critChance;
    const loc = hit.locational;
    const perfect = weapon.perfectMag ? PERFECT_MAG_MULT : 1;
    const critMul = crit ? stats.critMult : 1;
    const dmg = stats.damage * loc * critMul * perfect;
    const zone = hit.zone;
    const pool = zone === 'head' ? 'head' : zone === 'lLeg' || zone === 'rLeg' ? zone : 'torso';
    const remaining = Math.max(0, enemy.hp[pool]);
    enemy.hp[pool] -= dmg;
    if (zone === 'head') enemy.hp.head = Math.max(0, enemy.hp.head);
    onHit(run.score, zone, crit);
    playFlesh(zone === 'head');

    let label = zone === 'head' ? 'HEAD' : zone === 'upper' ? 'UPPER' : zone === 'lower' ? 'LOWER' : 'LEG';
    if (zone === 'head' && crit) label = 'HEAD CRIT';
    else if (crit) label = `${label} CRIT`;
    run.callouts.push({ x: hit.x, y: hit.y - 10, text: label, life: 0.7, crit, head: zone === 'head' });
    run.lastCallout = label;

    if (zone === 'head') {
      run.particles.push(...spawnBurst(hit.x, hit.y, 10));
    }

    updateLocomotion(enemy);

    if (isDead(enemy)) {
      enemy.alive = false;
      if (zone === 'head' || enemy.hp.head <= 0) enemy.severedHead = true;
      const overkill = dmg > remaining * 2 && remaining > 0;
      onKill(run.score, stats.cashMul);
      if (overkill) {
        run.gibs.push(...spawnGibs(hit.x, hit.y, hit.nx, hit.ny));
      } else {
        run.ragdolls.push(spawnRagdoll(enemy, hit.nx * 220, hit.ny * 220));
      }
    }
  }
  run.pendingHits.length = 0;
}

function tryFire(run, firing) {
  const { weapon, stats, player } = run;
  if (weapon.reloading || weapon.suppressFire) return false;
  if (!firing) {
    weapon.firing = false;
    return false;
  }
  if (weapon.ammo <= 0) return false;
  if (weapon.cooldown > 0) return false;
  weapon.firing = true;
  weapon.cooldown = 1 / stats.rof;
  weapon.ammo -= 1;
  const bloomDeg = Math.min(stats.bloomCap, weapon.bloom + weapon.heat * stats.heatBloom);
  const spread = degToRad((run.rng() * 2 - 1) * bloomDeg);
  const angle = player.aimAngle + spread;
  const gun = gunWorld(player);
  const muzzle = {
    x: gun.x + Math.cos(angle) * gun.len,
    y: gun.y + Math.sin(angle) * gun.len,
  };
  run.bullets.push(spawnBullet(muzzle.x, muzzle.y, angle, stats, weapon.perfectMag));
  weapon.bloom = Math.min(stats.bloomCap, weapon.bloom + stats.bloomPerShot);
  playMuzzle();
  return true;
}

function playerCore(player) {
  return playerCoreFromPose(player);
}

function checkContact(run) {
  const core = playerCore(run.player);
  for (const enemy of run.enemies) {
    if (!enemy.alive) continue;
    for (const c of lethalCircles(enemy)) {
      if (rectCircleOverlap(core.x, core.y, core.w, core.h, c.x, c.y, c.r)) {
        run.ended = 'death';
        return;
      }
    }
  }
}

export function simulate(run, dt, viewport, input) {
  if (run.ended || run.paused) return;

  const { player, weapon, stats } = run;
  player.worldX -= V_RETREAT * dt;
  player.y = run.terrain.height(player.worldX);

  const gun = gunWorld(player);
  const aimWorld = screenToWorld(input.pointerX, input.pointerY, player.worldX, viewport);
  const target = Math.atan2(aimWorld.y - gun.y, aimWorld.x - gun.x);
  const maxTurn = stats.aimRate * dt;
  let diff = target - player.aimAngle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) <= maxTurn) player.aimAngle = target;
  else player.aimAngle += Math.sign(diff) * maxTurn;

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
  if (weapon.reloading) {
    if (tapReloadIntent) {
      const result = tapReload(weapon, stats);
      if (result === 'perfect') onPerfect(run.score);
      if (result === 'perfect' || result === 'jam') weapon.suppressFire = true;
    }
  } else {
    const shot = tryFire(run, holding);
    if (shot && weapon.ammo <= 0) {
      startReload(weapon, stats);
      weapon.suppressFire = true;
    }
  }
  stepReload(weapon, stats, dt);

  for (const enemy of run.enemies) {
    if (!enemy.alive) continue;
    enemy.worldX -= enemy.speed * dt;
    enemy.y = run.terrain.height(enemy.worldX);
  }

  stepSpawner(run, dt, viewport);
  run.pendingHits = [];
  stepBullets(run, dt);
  applyHits(run);
  const left = cameraX(player.worldX, viewport);
  run.enemies = run.enemies.filter((e) => e.alive && e.worldX > left - 140);
  stepRagdolls(run, dt);
  stepGibs(run, dt);
  tickDistance(run.score, runMeters(run));
  checkContact(run);

  if (!run.endless && runMeters(run) >= TRACK_METERS && !run.ended) {
    extractBonus(run.score);
    run.ended = 'extract';
  }
}

export function runMeters(run) {
  return -run.player.worldX / PX_PER_M;
}
