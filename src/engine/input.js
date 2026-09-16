import { DESIGN_H } from '../config.js';

const HUD = '#overlay-root .panel, #overlay-root .opt-fabs, #overlay-root .opt-fab, #overlay-root .opt-layer';

export function createInput(canvas) {
  const state = {
    pointerX: 0,
    pointerY: 0,
    firing: false,
    pointerTap: false,
    pointerType: 'mouse',
    reloadTap: false,
    pauseTap: false,
    forcePause: false,
    moved: false,
    fireId: null,
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
  const relayout = () => {
    if (!state.moved) placeDefault();
  };
  window.addEventListener('resize', relayout);
  window.visualViewport?.addEventListener('resize', relayout);
  window.visualViewport?.addEventListener('scroll', relayout);

  function toLocal(e) {
    const p = toDesign(e.clientX, e.clientY);
    state.pointerX = p.x;
    state.pointerY = p.y;
    state.moved = true;
  }

  function onHud(e) {
    return !!e.target.closest(HUD);
  }

  function onDown(e) {
    if (onHud(e)) return false;
    if (!e.target.closest('#canvas-container')) return false;
    toLocal(e);
    state.firing = true;
    state.pointerTap = true;
    state.pointerType = e.pointerType || 'mouse';
    state.fireId = e.pointerId;
    return true;
  }

  function endFire(e) {
    if (e && state.fireId != null && e.pointerId !== state.fireId) return;
    state.firing = false;
    state.fireId = null;
  }

  function onMove(e) {
    if (onHud(e)) return;
    if (state.firing || e.target === canvas) toLocal(e);
  }

  function requestPause() {
    state.firing = false;
    state.fireId = null;
    state.forcePause = true;
  }

  canvas.addEventListener(
    'pointerdown',
    (e) => {
      if (onHud(e)) return;
      if (e.pointerType !== 'touch') {
        try {
          canvas.setPointerCapture(e.pointerId);
        } catch {
          /* some browsers reject capture mid-gesture */
        }
      }
      onDown(e);
      e.preventDefault();
    },
    { passive: false },
  );
  window.addEventListener(
    'pointerdown',
    (e) => {
      if (e.target === canvas || onHud(e)) return;
      onDown(e);
    },
    { passive: true },
  );
  window.addEventListener('pointermove', onMove, { passive: true });
  canvas.addEventListener('pointerup', endFire);
  canvas.addEventListener('pointercancel', endFire);
  window.addEventListener('pointerup', endFire);
  window.addEventListener('pointercancel', endFire);

  canvas.addEventListener(
    'touchstart',
    (e) => {
      if (onHud(e)) return;
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
    clearFireIntent() {
      state.firing = false;
      state.fireId = null;
      state.pointerTap = false;
    },
  };
}
