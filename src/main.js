import { FIXED_DT, MAX_FRAME_DT } from './config.js';
import { createCanvas } from './engine/canvas.js';
import { createInput } from './engine/input.js';
import { enterImmersive, exitImmersive } from './engine/immersive.js';
import { createLoop } from './engine/loop.js';
import { resumeAudio } from './audio/synth.js';
import { drawBackdrop, drawHud, drawWorld } from './render/draw.js';
import { addRewards, loadProfile, saveProfile, unlockLevel } from './state/profile.js';
import { createRun, simulate } from './systems/run.js';
import { renderGunsmith } from './ui/gunsmith.js';
import { renderHub, renderEnd } from './ui/hub.js';
import { mountOverlays } from './ui/overlays.js';
import { renderTraining } from './ui/training.js';
import { applyPwaUpdate, hasPwaUpdate, initPwa } from './pwa.js';

const canvas = document.getElementById('gameCanvas');
const overlayRoot = document.getElementById('overlay-root');
const updateBtn = document.getElementById('pwa-update');
const { ctx, viewport } = createCanvas(canvas);
const input = createInput(canvas);
const loop = createLoop(FIXED_DT, MAX_FRAME_DT);
const profile = loadProfile();
const overlays = mountOverlays(overlayRoot);
let mode = 'hub';
let run = null;
let lastType = '200m';
let lastLevel = 0;
let lastSeed = null;

canvas.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('pointerdown', () => resumeAudio(), { once: true });

function inActiveRun() {
  return mode === 'run' && run && !run.ended;
}

function syncUpdateBanner() {
  if (!updateBtn) return;
  updateBtn.classList.toggle('hidden', !hasPwaUpdate() || !inActiveRun());
}

function offerOrApplyUpdate() {
  if (!hasPwaUpdate()) {
    syncUpdateBanner();
    return;
  }
  if (inActiveRun()) {
    syncUpdateBanner();
    return;
  }
  applyPwaUpdate();
}

initPwa({
  isSafeToReload: () => !inActiveRun(),
  onUpdateAvailable: offerOrApplyUpdate,
});

updateBtn?.addEventListener('click', () => {
  applyPwaUpdate();
});

const handlers = {
  deploy(level) {
    startRun('200m', level);
  },
  endless() {
    startRun('endless', 0);
  },
  hub: showHub,
  gunsmith: showGunsmith,
  training: showTraining,
  retry() {
    startRun(lastType, lastLevel, lastSeed);
  },
};

function startRun(type, levelIndex, seed) {
  resumeAudio();
  enterImmersive();
  lastType = type;
  lastLevel = levelIndex;
  run = createRun({ profile, viewport, type, levelIndex, seed });
  lastSeed = run.seed;
  mode = 'run';
  overlays.hideAll();
  input.clearFireIntent();
  loop.reset();
  syncUpdateBanner();
}

function showHub() {
  mode = 'hub';
  run = null;
  exitImmersive();
  overlays.show('hub');
  renderHub(overlays.hub, profile, handlers);
  offerOrApplyUpdate();
}

function showGunsmith() {
  mode = 'gunsmith';
  run = null;
  overlays.show('gunsmith');
  renderGunsmith(overlays.gunsmith, profile, handlers);
  offerOrApplyUpdate();
}

function showTraining() {
  mode = 'training';
  run = null;
  overlays.show('training');
  renderTraining(overlays.training, profile, handlers);
  offerOrApplyUpdate();
}

function settleRun() {
  if (!run || run.settled) return;
  run.settled = true;
  addRewards(profile, run.score.cash, run.score.xp);
  if (run.ended === 'extract' && !run.endless) {
    unlockLevel(profile, run.levelIndex + 1);
  }
  saveProfile(profile);
  mode = 'end';
  overlays.show('end');
  renderEnd(overlays.end, {
    title: run.ended === 'extract' ? 'You made it' : 'They caught you',
    run,
    profile,
    handlers,
    extract: run.ended === 'extract',
  });
  syncUpdateBanner();
  offerOrApplyUpdate();
}

function frame(now) {
  const { steps } = loop.tick(now);
  if (mode === 'run' && run) {
    const forcePause = input.consume('forcePause');
    const pauseTap = input.consume('pauseTap');
    const pointerTap = input.consume('pointerTap');
    const reloadPressed = input.consume('reloadTap');
    let skipSim = false;

    if (!run.ended) {
      if (run.paused) {
        if (pointerTap || pauseTap) {
          run.paused = false;
          input.clearFireIntent();
          skipSim = true; // resume gesture is not a shot
        }
      } else if (forcePause || pauseTap) {
        run.paused = true;
        input.clearFireIntent();
        skipSim = true;
      }
    }

    if (!run.paused && !run.ended && !skipSim) {
      for (let i = 0; i < steps; i++) {
        simulate(run, FIXED_DT, viewport, {
          pointerX: input.state.pointerX,
          pointerY: input.state.pointerY,
          firing: input.state.firing,
          reloadPressed: i === 0 ? reloadPressed : false,
          pointerTap: i === 0 ? pointerTap : false,
        });
      }
    }
    drawWorld(ctx, run, viewport);
    drawHud(ctx, run, viewport, profile);
    if (run.ended) settleRun();
  } else {
    drawBackdrop(ctx, viewport, now / 1000, profile.unlockedLevel);
  }
  requestAnimationFrame(frame);
}

showHub();
requestAnimationFrame(frame);
