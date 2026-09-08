import { DESIGN_H } from '../config.js';

export function createInput(canvas) {
  const state = {
    pointerX: 0,
    pointerY: 0,
    firing: false,
    pointerTap: false,
    reloadTap: false,
    pauseTap: false,
    forcePause: false,
    moved: false,
  };

  function toDesign(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return { x: state.pointerX, y: state.pointerY };
    const scale = rect.height / DESIGN_H;
    return {
      x: (clientX - rect.left) / scale,
      y: (clientY - rect.top) / scale,
    };
  }

  function placeDefault() {
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      const scale = rect.height / DESIGN_H;
      state.pointerX = (rect.width / scale) * 0.62;
      state.pointerY = DESIGN_H * 0.48;
    }
  }
  placeDefault();
  window.addEventListener('resize', () => {
    if (!state.moved) placeDefault();
  });
  window.visualViewport?.addEventListener('resize', () => {
    if (!state.moved) placeDefault();
  });
  window.visualViewport?.addEventListener('scroll', () => {
    if (!state.moved) placeDefault();
  });

  function toLocal(e) {
    const p = toDesign(e.clientX, e.clientY);
    state.pointerX = p.x;
    state.pointerY = p.y;
    state.moved = true;
  }

  function onPanel(e) {
    return !!e.target.closest('#overlay-root .panel:not(.hidden)');
  }

  function onDown(e) {
    if (onPanel(e)) return;
    if (!e.target.closest('#canvas-container')) return;
    toLocal(e);
    state.firing = true;
    state.pointerTap = true;
  }

  function endFire() {
    state.firing = false;
  }

  function onMove(e) {
    if (state.firing || e.target.closest('#canvas-container')) toLocal(e);
  }

  function requestPause() {
    state.firing = false;
    state.forcePause = true;
  }

  canvas.addEventListener(
    'pointerdown',
    (e) => {
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        /* some browsers reject capture mid-gesture */
      }
      onDown(e);
      e.preventDefault();
    },
    { passive: false },
  );
  window.addEventListener(
    'pointerdown',
    (e) => {
      if (e.target === canvas) return;
      onDown(e);
    },
    { passive: true },
  );
  window.addEventListener('pointermove', onMove, { passive: true });
  canvas.addEventListener('pointerup', endFire);
  canvas.addEventListener('lostpointercapture', endFire);
  canvas.addEventListener('pointercancel', endFire);
  window.addEventListener('pointerup', endFire);
  window.addEventListener('pointercancel', endFire);

  // Block iOS long-press callout / selection on the canvas surface.
  canvas.addEventListener(
    'touchstart',
    (e) => {
      if (onPanel(e)) return;
      e.preventDefault();
    },
    { passive: false },
  );

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    if (k === 'r') state.reloadTap = true;
    if (k === 'p' || k === 'escape') state.pauseTap = true;
    if (k === ' ' || k === 'enter') {
      // Resume / pause with keyboard when focused (desktop + bluetooth keyboards).
      state.pauseTap = true;
      e.preventDefault();
    }
  });

  window.addEventListener('blur', requestPause);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) requestPause();
  });
  window.addEventListener('pagehide', requestPause);

  return {
    state,
    consume(name) {
      const v = state[name];
      state[name] = false;
      return v;
    },
    /** Drop a resume/start tap so it does not also fire. */
    clearFireIntent() {
      state.firing = false;
      state.pointerTap = false;
    },
  };
}
