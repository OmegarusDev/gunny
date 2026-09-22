import { effectiveAimReach, FIXED_DT, MAX_FRAME_DT, usesFullScreenAim } from './config.js';
import { createCanvas } from './engine/canvas.js';
import { createInput } from './engine/input.js';
import { enterImmersive } from './engine/immersive.js';
import { createLoop } from './engine/loop.js';
import { resumeAudio, setSoundscape, suspendAudio } from './audio/synth.js';
import { pageHidden } from './engine/page.js';
import { drawBackdrop, drawWorld } from './render/draw.js';
import { drawHud } from './render/hud.js';
import { addRewards, loadProfile, resetProfile, saveProfile, unlockLevel } from './state/profile.js';
import { createRun, simulate } from './systems/run.js';
import { renderGunsmith } from './ui/gunsmith.js';
import { renderHub, renderEnd } from './ui/hub.js';
import { mountOverlays } from './ui/overlays.js';
import { renderTraining } from './ui/training.js';
import { resolveAimPoint } from './view/aim.js';
import { pwaUpdateBlocked } from './engine/pwaBusy.js';
import { initPwa } from './pwa.js';
import { mountSoftCursor } from './ui/cursor.js';

const canvas = document.getElementById('gameCanvas');
const overlayRoot = document.getElementById('overlay-root');
const { ctx, viewport } = createCanvas(canvas);
const input = createInput(canvas, {
  combat: () => mode === 'run' && run && !run.ended && !run.dying,
});
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
let endlessBiome = 0;

canvas.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener(
  'pointerdown',
  () => {
    enterImmersive();
    resumeAudio();
  },
  { capture: true },
);

const applyPwa = initPwa({
  busy: () => pwaUpdateBlocked(mode),
});

const handlers = {
  deploy(level) {
    startRun('campaign', level);
  },
  endless(biomeIndex) {
    endlessBiome = biomeIndex ?? endlessBiome;
    startRun('endless', endlessBiome);
  },
  pickEndless(biomeIndex) {
    endlessBiome = biomeIndex;
    showHub();
  },
  hub: showHub,
  back: goBack,
  gunsmith: showGunsmith,
  training: showTraining,
  retry() {
    startRun(lastType, lastLevel, lastSeed);
  },
};

function syncCursor() {
  if (mode === 'run' && run && !run.ended && !run.dying && !run.paused) softCursor.setMode('hidden');
  else softCursor.setMode('menu');
}

function startRun(type, levelIndex, seed) {
  resumeAudio();
  enterImmersive();
  lastType = type;
  lastLevel = levelIndex;
  run = createRun({ profile, viewport, type, levelIndex, seed });
  setSoundscape(run.biome.id);
  lastSeed = run.seed;
  mode = 'run';
  overlays.hideAll();
  input.clearFireIntent();
  input.consume('pauseTap');
  input.consume('forcePause');
  queuedPointerTap = false;
  queuedReloadTap = false;
  loop.reset();
  syncCursor();
}

function leaveRun() {
  applyPwa();
  syncCursor();
}

function showHub() {
  mode = 'hub';
  run = null;
  setSoundscape('forest');
  overlays.show('hub');
  renderHub(overlays.hub, profile, { ...handlers, endlessBiome });
  leaveRun();
}

function showGunsmith() {
  mode = 'gunsmith';
  overlays.show('gunsmith');
  renderGunsmith(overlays.gunsmith, profile, handlers);
  leaveRun();
}

function showTraining() {
  mode = 'training';
  overlays.show('training');
  renderTraining(overlays.training, profile, handlers);
  leaveRun();
}

function showEnd() {
  if (!run || !run.ended) {
    showHub();
    return;
  }
  mode = 'end';
  overlays.show('end');
  renderEnd(overlays.end, {
    title: run.ended === 'extract' ? 'You made it' : 'You barely escape alive...',
    run,
    profile,
    handlers,
    extract: run.ended === 'extract',
  });
  leaveRun();
}

function goBack() {
  if (run && run.ended) showEnd();
  else showHub();
}

function settleRun() {
  if (!run || run.settled) return;
  run.settled = true;
  addRewards(profile, run.score.cash, run.score.xp);
  if (run.ended === 'extract' && !run.endless) {
    unlockLevel(profile, run.levelIndex + 1);
  }
  saveProfile(profile);
  showEnd();
}

let queuedPointerTap = false;
let queuedReloadTap = false;

const simInput = {
  pointerX: 0,
  pointerY: 0,
  pointerType: 'mouse',
  firing: false,
  reloadPressed: false,
  pointerTap: false,
};

function parkPage() {
  suspendAudio();
  if (run && !run.ended && !run.dying) run.paused = true;
  input.clearFireIntent();
}

window.addEventListener('pagehide', parkPage);
document.addEventListener('visibilitychange', () => {
  if (pageHidden()) {
    parkPage();
    return;
  }
  loop.reset();
  // Keep a paused run silent; hub / gunsmith / training get ambient back.
  if (!(mode === 'run' && run?.paused)) resumeAudio();
});

function frame(now) {
  if (pageHidden()) {
    requestAnimationFrame(frame);
    return;
  }
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

    if (!run.ended && !run.dying) {
      const portrait = input.state.portrait;
      if (portrait) run.portraitHold = true;
      if (run.paused) {
        if (portrait) {
          if (queuedPointerTap || pauseTap) {
            queuedPointerTap = false;
            queuedReloadTap = false;
            input.clearFireIntent();
            skipSim = true;
          }
        } else if (run.portraitHold) {
          run.portraitHold = false;
          run.paused = false;
          queuedPointerTap = false;
          queuedReloadTap = false;
          input.clearFireIntent();
          skipSim = true;
        } else if (queuedPointerTap || pauseTap) {
          run.paused = false;
          queuedPointerTap = false;
          queuedReloadTap = false;
          input.clearFireIntent();
          skipSim = true; // resume gesture is not a shot
        }
      } else if (forcePause || pauseTap || portrait) {
        run.paused = true;
        if (portrait) run.portraitHold = true;
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
        simInput.pointerX = input.state.pointerX;
        simInput.pointerY = input.state.pointerY;
        simInput.pointerType = input.state.pointerType;
        simInput.firing = firing;
        simInput.reloadPressed = i === 0 ? reloadPressed : false;
        simInput.pointerTap = i === 0 ? pointerTap : false;
        simulate(run, FIXED_DT, viewport, simInput);
      }
    } else if (!run.ended) {
      run.aim = resolveAimPoint(
        input.state.pointerX,
        input.state.pointerY,
        run.player,
        viewport,
        effectiveAimReach(run.stats, viewport),
        { fullScreen: usesFullScreenAim(run.stats) },
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
