import { resumeAudio, setMasterVolume } from '../audio/synth.js';
import { effectiveVolume, loadSettings, saveSettings } from '../state/settings.js';

const HOLD_MS = 1600;

const COG_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true">
  <path fill="currentColor" d="M19.1 12.9a7.4 7.4 0 0 0 .1-.9 7.4 7.4 0 0 0-.1-.9l2-1.5a.5.5 0 0 0 .1-.6l-1.9-3.3a.5.5 0 0 0-.6-.2l-2.4 1a7 7 0 0 0-1.6-.9l-.4-2.5a.5.5 0 0 0-.5-.4h-3.8a.5.5 0 0 0-.5.4l-.4 2.5a7 7 0 0 0-1.6.9l-2.4-1a.5.5 0 0 0-.6.2L2.7 9a.5.5 0 0 0 .1.6l2 1.5a7.4 7.4 0 0 0-.1.9 7.4 7.4 0 0 0 .1.9l-2 1.5a.5.5 0 0 0-.1.6l1.9 3.3a.5.5 0 0 0 .6.2l2.4-1a7 7 0 0 0 1.6.9l.4 2.5a.5.5 0 0 0 .5.4h3.8a.5.5 0 0 0 .5-.4l.4-2.5a7 7 0 0 0 1.6-.9l2.4 1a.5.5 0 0 0 .6-.2l1.9-3.3a.5.5 0 0 0-.1-.6zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z"/>
</svg>`;

export function mountOptions(root, handlers) {
  const fab = document.createElement('button');
  fab.type = 'button';
  fab.className = 'opt-fab hidden';
  fab.setAttribute('aria-label', 'Options');
  fab.innerHTML = COG_SVG;

  const layer = document.createElement('div');
  layer.className = 'opt-layer hidden';
  layer.innerHTML = `<div class="opt-sheet" role="dialog" aria-labelledby="opt-title"></div>`;
  const sheet = layer.querySelector('.opt-sheet');

  root.append(fab, layer);

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
  }

  function open() {
    resumeAudio();
    view = 'menu';
    paint();
    layer.classList.remove('hidden');
    fab.setAttribute('aria-expanded', 'true');
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
      let holdPointer = null;
      const tick = (now) => {
        if (holdPointer == null) return;
        const p = Math.min(1, (now - holdFrom) / HOLD_MS);
        fill.style.transform = `scaleX(${p})`;
        if (p >= 1) {
          holdPointer = null;
          stopHold();
          close();
          handlers.resetProgress();
          return;
        }
        holdRaf = requestAnimationFrame(tick);
      };
      const startHold = (e) => {
        if (e.button != null && e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        stopHold();
        holdPointer = e.pointerId;
        holdFrom = performance.now();
        holdRaf = requestAnimationFrame(tick);
      };
      const endHold = (e) => {
        if (holdPointer == null) return;
        if (e && e.pointerId != null && e.pointerId !== holdPointer) return;
        holdPointer = null;
        stopHold();
      };
      hold.addEventListener('pointerdown', startHold);
      hold.addEventListener('pointerup', endHold);
      hold.addEventListener('pointercancel', endHold);
      hold.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
      hold.addEventListener('contextmenu', (e) => e.preventDefault());
      sheet.querySelector('.opt-cancel').onclick = () => {
        view = 'menu';
        paint();
      };
      return;
    }

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
    sheet.querySelector('[data-act="reset"]').onclick = () => {
      view = 'reset';
      paint();
    };
    sheet.querySelector('.opt-done').onclick = close;
  }

  fab.addEventListener('click', () => {
    if (layer.classList.contains('hidden')) open();
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
      fab.classList.toggle('hidden', !on);
      if (!on) close();
    },
    close,
  };
}
