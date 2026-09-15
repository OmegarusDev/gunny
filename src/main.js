import { effectiveShotRange, FIXED_DT, MAX_FRAME_DT } from './config.js';
import { createCanvas } from './engine/canvas.js';
import { createInput } from './engine/input.js';
import { enterImmersive } from './engine/immersive.js';
import { createLoop } from './engine/loop.js';
import { resumeAudio } from './audio/synth.js';
import { drawBackdrop, drawHud, drawWorld } from './render/draw.js';
import { addRewards, loadProfile, resetProfile, saveProfile, unlockLevel } from './state/profile.js';
import { createRun, simulate } from './systems/run.js';
import { renderGunsmith } from './ui/gunsmith.js';
import { renderHub, renderEnd } from './ui/hub.js';
import { mountOverlays } from './ui/overlays.js';
import { renderTraining } from './ui/training.js';
import { resolveAimPoint } from './view/aim.js';
import { applyPwaUpdate, hasPwaUpdate, initPwa } from './pwa.js';
import { mountSoftCursor } from './ui/cursor.js';

const canvas = document.getElementById('gameCanvas');
const overlayRoot = document.getElementById('overlay-root');
const updateBtn = document.getElementById('pwa-update');
const { ctx, viewport } = createCanvas(canvas);
const input = createInput(canvas);
const softCursor = mountSoftCursor();
const loop = createLoop(FIXED_DT, MAX_FRAME_DT);
const profile = loadProfile();
const overlays = mountOverlays(overlayRoot, {
  resetProgress() {
    resetProfile(profile);
    showHub();
  },
});
let mode = 'hub';
let run = null;
let lastType = 'campaign';
let lastLevel = 0;
let lastSeed = null;

canvas.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener(
  'pointerdown',
  () => {
    enterImmersive();
    resumeAudio();
  },
  { capture: true },
);

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
    startRun('campaign', level);
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

function syncCursor() {
  if (mode === 'run' && run && !run.ended) softCursor.setMode('hidden');
  else softCursor.setMode('menu');
}

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
  input.consume('pauseTap');
  input.consume('forcePause');
  queuedPointerTap = false;
  queuedReloadTap = false;
  loop.reset();
  syncUpdateBanner();
  syncCursor();
}

function showHub() {
  mode = 'hub';
  run = null;
  overlays.show('hub');
  renderHub(overlays.hub, profile, handlers);
  offerOrApplyUpdate();
  syncCursor();
}

function showGunsmith() {
  mode = 'gunsmith';
  run = null;
  overlays.show('gunsmith');
  renderGunsmith(overlays.gunsmith, profile, handlers);
  offerOrApplyUpdate();
  syncCursor();
}

function showTraining() {
  mode = 'training';
  run = null;
  overlays.show('training');
  renderTraining(overlays.training, profile, handlers);
  offerOrApplyUpdate();
  syncCursor();
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
    title: run.ended === 'extract' ? 'You made it' : 'You barely escape alive...',
    run,
    profile,
    handlers,
    extract: run.ended === 'extract',
  });
  syncUpdateBanner();
  offerOrApplyUpdate();
  syncCursor();
}

let queuedPointerTap = false;
let queuedReloadTap = false;

function frame(now) {
  const { steps, frame: frameDt } = loop.tick(now);
  const q = viewport.quality;
  q?.noteFrame(frameDt);
  if (q && ctx.imageSmoothingQuality !== q.smoothing) ctx.imageSmoothingQuality = q.smoothing;
  if (mode === 'run' && run) {
    const forcePause = input.consume('forcePause');
    const pauseTap = input.consume('pauseTap');
    queuedPointerTap = queuedPointerTap || input.consume('pointerTap');
    queuedReloadTap = queuedReloadTap || input.consume('reloadTap');
    let skipSim = false;

    if (!run.ended) {
      if (run.paused) {
        if (queuedPointerTap || pauseTap) {
          run.paused = false;
          queuedPointerTap = false;
          queuedReloadTap = false;
          input.clearFireIntent();
          skipSim = true; // resume gesture is not a shot
        }
      } else if (forcePause || pauseTap) {
        run.paused = true;
        queuedPointerTap = false;
        queuedReloadTap = false;
        input.clearFireIntent();
        skipSim = true;
      }
      syncCursor();
    }

    if (!run.paused && !run.ended && !skipSim) {
      const pointerTap = queuedPointerTap;
      const reloadPressed = queuedReloadTap;
      const firing = input.state.firing || pointerTap;
      if (steps > 0) {
        queuedPointerTap = false;
        queuedReloadTap = false;
      }
      for (let i = 0; i < steps; i++) {
        simulate(run, FIXED_DT, viewport, {
          pointerX: input.state.pointerX,
          pointerY: input.state.pointerY,
          pointerType: input.state.pointerType,
          firing,
          reloadPressed: i === 0 ? reloadPressed : false,
          pointerTap: i === 0 ? pointerTap : false,
        });
      }
    } else if (!run.ended) {
      run.aim = resolveAimPoint(
        input.state.pointerX,
        input.state.pointerY,
        run.player,
        viewport,
        effectiveShotRange(run.stats, viewport),
      );
    }
    drawWorld(ctx, run, viewport);
    drawHud(ctx, run, viewport, profile);
    if (run.ended) settleRun();
  } else {
    queuedPointerTap = false;
    queuedReloadTap = false;
    drawBackdrop(ctx, viewport, now / 1000, profile.unlockedLevel);
  }
  requestAnimationFrame(frame);
}

showHub();
requestAnimationFrame(frame);
