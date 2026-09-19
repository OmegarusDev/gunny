import { extractCash } from '../config.js';
import { biomeFor } from '../data/biomes.js';
import { defaultProfile, ensureKit, grant, applyKit } from '../state/profile.js';
import { createCanvas } from '../engine/canvas.js';
import { drawBackdrop, drawWorld } from '../render/draw.js';
import { drawHud } from '../render/hud.js';
import { createRun } from '../systems/run.js';
import { renderGunsmith } from './gunsmith.js';
import { renderHub, renderEnd } from './hub.js';
import { mountOverlays } from './overlays.js';
import { renderTraining } from './training.js';

const SHOTS = [
  ['hub', 'Camp'],
  ['gunsmith', 'Gunsmith'],
  ['training', 'Training'],
  ['death', 'End — down'],
  ['extract', 'End — extract'],
  ['options', 'Options'],
  ['rotate', 'Rotate'],
  ['run', 'Paused run'],
];

const shot = new URLSearchParams(location.search).get('shot');

if (!shot) {
  const gallery = document.getElementById('gallery');
  if (gallery) {
    gallery.innerHTML = SHOTS.map(
      ([id, name]) =>
        `<section class="shot"><h2>${name}</h2><iframe src="./preview.html?shot=${id}" title="${name}"></iframe></section>`,
    ).join('');
  }
} else {
  bootShot(shot);
}

function demoProfile() {
  const profile = defaultProfile();
  profile.cash = 860;
  profile.xp = 240;
  profile.unlockedLevel = 3;
  grant(profile, 't2_tactical');
  profile.loadout.receiver = 't2_tactical';
  applyKit(profile);
  Object.assign(ensureKit(profile).ranks, {
    magazine: 12,
    barrel: 20,
    springs: 20,
    ammo: 8,
  });
  profile.skillRanks.marksman = 2;
  profile.skillRanks.scavenger = 1;
  return profile;
}

function fakeRun(profile, extract) {
  const clear = extract ? extractCash(2) : 0;
  return {
    biome: biomeFor(2),
    endless: false,
    levelIndex: 2,
    ended: extract ? 'extract' : 'death',
    score: {
      lastMetersPaid: extract ? 250 : 187.4,
      kills: 22,
      headshots: 6,
      perfects: 3,
      cash: 220 + clear,
      extractCash: clear,
      xp: extract ? 37 : 41,
    },
  };
}

function bootShot(id) {
  document.title = `Gunny — ${SHOTS.find((s) => s[0] === id)?.[1] || id}`;
  for (const el of [...document.head.querySelectorAll('style')]) el.remove();
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './src/style.css';
  document.head.appendChild(link);

  document.body.style.padding = '0';
  document.body.style.overflow = 'hidden';
  document.body.innerHTML = `
    <div id="rotate-overlay">
      <p class="rotate-kicker">Landscape</p>
      <h1>GUNNY</h1>
      <p>Turn the device sideways</p>
    </div>
    <div id="canvas-container">
      <canvas id="gameCanvas"></canvas>
      <div id="overlay-root"></div>
    </div>
  `;

  const canvas = document.getElementById('gameCanvas');
  const overlayRoot = document.getElementById('overlay-root');
  const { ctx, viewport, resize } = createCanvas(canvas);

  const start = () => {
    requestAnimationFrame(() => {
      resize();
      paintShot(id, { ctx, viewport, overlayRoot });
    });
  };
  if (link.sheet) start();
  else link.onload = start;
}

function paintShot(id, { ctx, viewport, overlayRoot }) {
  const profile = demoProfile();
  const overlays = mountOverlays(overlayRoot, { resetProgress() {} });
  const noop = {
    deploy() {},
    endless() {},
    pickEndless() {},
    hub() {},
    back() {},
    gunsmith() {},
    training() {},
    retry() {},
    endlessBiome: 2,
  };

  const t = 8.4;
  if (id === 'rotate') {
    document.getElementById('rotate-overlay').style.display = 'flex';
    overlayRoot.style.display = 'none';
    return;
  }

  if (id === 'run') {
    overlays.hideAll();
    const run = createRun({ profile, viewport, type: 'campaign', levelIndex: 2 });
    run.paused = true;
    run.score.kills = 9;
    run.score.cash = 90;
    run.score.xp = 18;
    run.weapon.ammo = Math.max(0, run.stats.magSize - 2);
    run.weapon.heat = 0.45;
    run.weapon.bloom = 3.2;
    drawWorld(ctx, run, viewport);
    drawHud(ctx, run, viewport, profile);
    return;
  }

  drawBackdrop(ctx, viewport, t, id === 'extract' || id === 'death' ? 2 : 0);

  if (id === 'hub') {
    overlays.show('hub');
    renderHub(overlays.hub, profile, noop);
    return;
  }
  if (id === 'gunsmith') {
    overlays.show('gunsmith');
    renderGunsmith(overlays.gunsmith, profile, noop);
    return;
  }
  if (id === 'training') {
    overlays.show('training');
    renderTraining(overlays.training, profile, noop);
    return;
  }
  if (id === 'death' || id === 'extract') {
    overlays.show('end');
    renderEnd(overlays.end, {
      title: id === 'extract' ? 'You made it' : 'You barely escape alive...',
      run: fakeRun(profile, id === 'extract'),
      profile,
      handlers: noop,
      extract: id === 'extract',
    });
    return;
  }
  if (id === 'options') {
    overlays.show('hub');
    renderHub(overlays.hub, profile, noop);
    requestAnimationFrame(() => document.querySelector('[aria-label="Options"]')?.click());
  }
}
