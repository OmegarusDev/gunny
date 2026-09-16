import { resumeAudio, setMasterVolume } from '../audio/synth.js';
import { INSTALL_DOWNLOAD } from '../config.js';
import { enterImmersive, exitImmersive, isStandaloneDisplay } from '../engine/immersive.js';
import { effectiveVolume, loadSettings, saveSettings } from '../state/settings.js';

const HOLD_MS = 1600;

const COG_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true">
  <path fill="currentColor" d="M19.1 12.9a7.4 7.4 0 0 0 .1-.9 7.4 7.4 0 0 0-.1-.9l2-1.5a.5.5 0 0 0 .1-.6l-1.9-3.3a.5.5 0 0 0-.6-.2l-2.4 1a7 7 0 0 0-1.6-.9l-.4-2.5a.5.5 0 0 0-.5-.4h-3.8a.5.5 0 0 0-.5.4l-.4 2.5a7 7 0 0 0-1.6.9l-2.4-1a.5.5 0 0 0-.6.2L2.7 9a.5.5 0 0 0 .1.6l2 1.5a7.4 7.4 0 0 0-.1.9 7.4 7.4 0 0 0 .1.9l-2 1.5a.5.5 0 0 0-.1.6l1.9 3.3a.5.5 0 0 0 .6.2l2.4-1a7 7 0 0 0 1.6.9l.4 2.5a.5.5 0 0 0 .5-.4l.4 2.5a7 7 0 0 0 1.6-.9l2.4 1a.5.5 0 0 0 .6-.2l1.9-3.3a.5.5 0 0 0-.1-.6zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z"/>
</svg>`;

const INSTALL_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true">
  <path fill="currentColor" d="M11 3h2v10.2l3.2-3.2 1.4 1.4L12 17.2 6.4 11.4l1.4-1.4L11 13.2V3zM5 19h14v2H5z"/>
</svg>`;

export function mountOptions(root, handlers) {
  const fabs = document.createElement('div');
  fabs.className = 'opt-fabs hidden';

  const installFab = document.createElement('button');
  installFab.type = 'button';
  installFab.className = 'opt-fab install-fab';
  installFab.setAttribute('aria-label', 'Install app');
  installFab.innerHTML = INSTALL_SVG;

  const fab = document.createElement('button');
  fab.type = 'button';
  fab.className = 'opt-fab';
  fab.setAttribute('aria-label', 'Options');
  fab.innerHTML = COG_SVG;

  fabs.append(installFab, fab);

  const layer = document.createElement('div');
  layer.className = 'opt-layer hidden';
  layer.innerHTML = `<div class="opt-sheet" role="dialog" aria-labelledby="opt-title"></div>`;
  const sheet = layer.querySelector('.opt-sheet');

  root.append(fabs, layer);

  let view = 'menu';
  let holdRaf = 0;
  let holdFrom = 0;

  function applyAudio() {
    setMasterVolume(effectiveVolume(loadSettings()));
  }

  function close() {
    stopHold();
    view = 'menu';
    layer.classList.add('hidden');
    fab.setAttribute('aria-expanded', 'false');
    installFab.setAttribute('aria-expanded', 'false');
  }

  function open(nextView = 'menu') {
    resumeAudio();
    view = nextView;
    paint();
    layer.classList.remove('hidden');
    fab.setAttribute('aria-expanded', view === 'menu' || view === 'reset' ? 'true' : 'false');
    installFab.setAttribute('aria-expanded', view === 'install' ? 'true' : 'false');
  }

  function stopHold() {
    if (holdRaf) cancelAnimationFrame(holdRaf);
    holdRaf = 0;
    holdFrom = 0;
    const fill = sheet.querySelector('.hold-fill');
    if (fill) fill.style.transform = 'scaleX(0)';
  }

  function paint() {
    const s = loadSettings();
    if (view === 'reset') {
      sheet.classList.remove('opt-sheet-wide');
      sheet.innerHTML = `
        <p class="kicker">Danger</p>
        <h2 id="opt-title">Reset progress</h2>
        <p class="lede opt-copy">This deletes cash, XP, kit, skills, and road unlocks. It cannot be undone.</p>
        <button class="hold-reset" type="button">
          <span class="hold-fill"></span>
          <span class="hold-label">Hold to reset</span>
        </button>
        <button class="ghost opt-cancel" type="button">Cancel</button>
      `;
      const hold = sheet.querySelector('.hold-reset');
      const fill = sheet.querySelector('.hold-fill');
      let holding = false;
      let holdPointer = -1;
      const tick = (now) => {
        if (!holding) return;
        const p = Math.min(1, (now - holdFrom) / HOLD_MS);
        fill.style.transform = `scaleX(${p})`;
        if (p >= 1) {
          holding = false;
          holdPointer = -1;
          stopHold();
          close();
          handlers.resetProgress();
          return;
        }
        holdRaf = requestAnimationFrame(tick);
      };
      const pointerOnHold = (e) => {
        const r = hold.getBoundingClientRect();
        const pad = 20;
        return (
          e.clientX >= r.left - pad &&
          e.clientX <= r.right + pad &&
          e.clientY >= r.top - pad &&
          e.clientY <= r.bottom + pad
        );
      };
      const startHold = (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        if (holding && holdPointer === e.pointerId) return;
        stopHold();
        holding = true;
        holdPointer = e.pointerId;
        holdFrom = performance.now();
        try {
          hold.setPointerCapture(e.pointerId);
        } catch {
          /* not a mouse/touch we can capture */
        }
        holdRaf = requestAnimationFrame(tick);
      };
      const endHold = (e) => {
        if (!holding) return;
        if (e && e.pointerId != null && e.pointerId !== holdPointer) return;
        if (e?.type === 'lostpointercapture' && performance.now() - holdFrom < 80) return;
        holding = false;
        holdPointer = -1;
        stopHold();
      };
      const onMove = (e) => {
        if (!holding) return;
        if (e.pointerId != null && e.pointerId !== holdPointer) return;
        if (!pointerOnHold(e)) endHold(e);
      };
      hold.addEventListener('pointerdown', startHold);
      hold.addEventListener('pointermove', onMove);
      hold.addEventListener('pointerup', endHold);
      hold.addEventListener('pointercancel', endHold);
      hold.addEventListener('lostpointercapture', endHold);
      hold.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
      hold.addEventListener('contextmenu', (e) => e.preventDefault());
      sheet.querySelector('.opt-cancel').onclick = () => {
        view = 'menu';
        paint();
      };
      return;
    }

    if (view === 'install') {
      sheet.classList.add('opt-sheet-wide');
      sheet.innerHTML = `
        <p class="kicker">Install</p>
        <h2 id="opt-title">Add Gunny to your home screen</h2>
        <p class="lede opt-copy">The app download is ${INSTALL_DOWNLOAD}. No extra packs after that.</p>
        <div class="opt-install">
          <p><strong>Chrome on Android</strong> — open Gunny in Chrome, tap the three-dot menu, then <em>Install app</em> or <em>Add to Home screen</em>. Confirm. That installs the WebAPK so it opens fullscreen like a real app.</p>
          <p><strong>Safari on iPhone / iPad</strong> — open Gunny in Safari, tap Share, then <em>Add to Home Screen</em>, then Add. iOS does not use a WebAPK; the home-screen icon is the install.</p>
          <p><strong>Chrome on desktop</strong> — look for the install icon in the address bar, or the three-dot menu → <em>Install Gunny</em>.</p>
        </div>
        <button class="ghost opt-done" type="button">Done</button>
      `;
      sheet.querySelector('.opt-done').onclick = close;
      return;
    }

    sheet.classList.remove('opt-sheet-wide');
    sheet.innerHTML = `
      <p class="kicker">Camp</p>
      <h2 id="opt-title">Options</h2>
      <div class="opt-volume">
        <div class="opt-volume-row">
          <span class="ledger-label">Volume</span>
          <button class="opt-mute ${s.muted ? 'is-muted' : ''}" type="button" aria-pressed="${s.muted ? 'true' : 'false'}">${s.muted ? 'Muted' : 'Mute'}</button>
        </div>
        <input class="opt-slider" type="range" min="0" max="100" step="1" value="${Math.round(s.volume * 100)}" aria-label="Volume" ${s.muted ? 'disabled' : ''} />
      </div>
      <label class="opt-check">
        <input type="checkbox" data-act="fullscreen" ${s.fullscreen ? 'checked' : ''} />
        Fullscreen in all modes
      </label>
      <button class="opt-danger" type="button" data-act="reset">Reset progress</button>
      <button class="ghost opt-done" type="button">Done</button>
    `;
    sheet.querySelector('.opt-mute').onclick = () => {
      const next = loadSettings();
      next.muted = !next.muted;
      saveSettings(next);
      applyAudio();
      if (!next.muted) resumeAudio();
      paint();
    };
    sheet.querySelector('.opt-slider').oninput = (e) => {
      const next = loadSettings();
      next.volume = Number(e.target.value) / 100;
      if (next.volume > 0) next.muted = false;
      saveSettings(next);
      applyAudio();
    };
    sheet.querySelector('[data-act="fullscreen"]').onchange = (e) => {
      const next = loadSettings();
      next.fullscreen = e.target.checked;
      saveSettings(next);
      if (next.fullscreen) enterImmersive();
      else exitImmersive();
    };
    sheet.querySelector('[data-act="reset"]').onclick = () => {
      view = 'reset';
      paint();
    };
    sheet.querySelector('.opt-done').onclick = close;
  }

  fab.addEventListener('click', () => {
    if (layer.classList.contains('hidden') || view === 'install') open('menu');
    else close();
  });
  installFab.addEventListener('click', () => {
    if (layer.classList.contains('hidden') || view !== 'install') open('install');
    else close();
  });
  layer.addEventListener('click', (e) => {
    if (e.target === layer) close();
  });
  window.addEventListener(
    'keydown',
    (e) => {
      if (e.key !== 'Escape') return;
      if (layer.classList.contains('hidden')) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      close();
    },
    true,
  );

  applyAudio();

  return {
    setVisible(on) {
      fabs.classList.toggle('hidden', !on);
      installFab.classList.toggle('hidden', !on || isStandaloneDisplay());
      if (!on) close();
    },
    close,
  };
}
