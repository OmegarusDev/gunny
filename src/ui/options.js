import { applyMixer, resumeAudio } from '../audio/synth.js';
import { INSTALL_DOWNLOAD } from '../config.js';
import { enterImmersive, exitImmersive, isStandaloneDisplay } from '../engine/immersive.js';
import { loadSettings, saveSettings } from '../state/settings.js';

const HOLD_MS = 1600;

export function mountOptions(root, handlers) {
  const layer = document.createElement('div');
  layer.className = 'opt-layer hidden';
  layer.innerHTML = `<div class="opt-sheet" role="dialog" aria-labelledby="opt-title"></div>`;
  const sheet = layer.querySelector('.opt-sheet');

  root.append(layer);

  let view = 'menu';
  let holdRaf = 0;
  let holdFrom = 0;

  function applyAudio() {
    applyMixer(loadSettings());
  }

  function close() {
    stopHold();
    view = 'menu';
    layer.classList.add('hidden');
  }

  function open(nextView = 'menu') {
    resumeAudio();
    view = nextView;
    paint();
    layer.classList.remove('hidden');
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
        <h2 id="opt-title">Install Gunny</h2>
        <p class="lede opt-copy">The app download is ${INSTALL_DOWNLOAD}. No extra packs after that.</p>
        <div class="opt-install">
          <p><strong>Chrome on Android</strong> — three-dot menu → <em>Install app</em> (sometimes <em>Install</em>). Confirm. That is the real install: fullscreen, no status bar. Do not use <em>Add to Home screen</em> — that is only a Chrome shortcut.</p>
          <p><strong>Safari on iPhone / iPad</strong> — Share → <em>Add to Home Screen</em> → Add. On iOS that <em>is</em> the install.</p>
          <p><strong>Chrome on desktop</strong> — install icon in the address bar, or three-dot menu → <em>Install Gunny</em>. Not a bookmark.</p>
        </div>
        <button class="ghost opt-done" type="button">Done</button>
      `;
      sheet.querySelector('.opt-done').onclick = close;
      return;
    }

    if (view === 'sound') {
      sheet.classList.remove('opt-sheet-wide');
      const bus = (key, label) => `
        <div class="opt-bus">
          <span class="ledger-label">${label}</span>
          <input class="opt-slider" data-bus="${key}" type="range" min="0" max="100" step="1" value="${Math.round(s[key] * 100)}" aria-label="${label}" ${s.muted ? 'disabled' : ''} />
        </div>`;
      sheet.innerHTML = `
        <h2 id="opt-title">Sound</h2>
        <div class="opt-volume">
          <div class="opt-volume-row">
            <span class="ledger-label">Output</span>
            <button class="opt-mute ${s.muted ? 'is-muted' : ''}" type="button" aria-pressed="${s.muted ? 'true' : 'false'}">${s.muted ? 'Muted' : 'Mute'}</button>
          </div>
          ${bus('gunshot', 'Gunshot')}
          ${bus('footsteps', 'Footsteps')}
          ${bus('ambient', 'Background')}
        </div>
        <button class="ghost opt-cancel" type="button">Back</button>
      `;
      sheet.querySelector('.opt-mute').onclick = () => {
        const next = loadSettings();
        next.muted = !next.muted;
        saveSettings(next);
        applyAudio();
        if (!next.muted) resumeAudio();
        paint();
      };
      sheet.querySelectorAll('[data-bus]').forEach((slider) => {
        slider.oninput = (e) => {
          const next = loadSettings();
          next[slider.dataset.bus] = Number(e.target.value) / 100;
          if (next[slider.dataset.bus] > 0) next.muted = false;
          saveSettings(next);
          applyAudio();
        };
      });
      sheet.querySelector('.opt-cancel').onclick = () => {
        view = 'menu';
        paint();
      };
      return;
    }

    sheet.classList.remove('opt-sheet-wide');
    sheet.innerHTML = `
      <h2 id="opt-title">Options</h2>
      <button type="button" data-act="sound">Sound</button>
      <label class="opt-check">
        <input type="checkbox" data-act="fullscreen" ${s.fullscreen ? 'checked' : ''} />
        Fullscreen in all modes
      </label>
      ${
        isStandaloneDisplay()
          ? ''
          : `<button type="button" data-act="install">Install app</button>`
      }
      <button class="opt-danger" type="button" data-act="reset">Reset progress</button>
      <button class="ghost opt-done" type="button">Done</button>
    `;
    sheet.querySelector('[data-act="sound"]').onclick = () => {
      view = 'sound';
      paint();
    };
    const install = sheet.querySelector('[data-act="install"]');
    if (install) {
      install.onclick = () => {
        view = 'install';
        paint();
      };
    }
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
      if (!on) close();
    },
    open,
    close,
  };
}
