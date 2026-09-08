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

  function toLocal(e) {
    const p = toDesign(e.clientX, e.clientY);
    state.pointerX = p.x;
    state.pointerY = p.y;
    state.moved = true;
  }

  function onDown(e) {
    if (e.target.closest('#overlay-root .panel:not(.hidden)')) return;
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

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    onDown(e);
    e.preventDefault();
  });
  window.addEventListener('pointerdown', (e) => {
    if (e.target === canvas) return;
    onDown(e);
  });
  window.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', endFire);
  canvas.addEventListener('lostpointercapture', endFire);
  canvas.addEventListener('pointercancel', endFire);
  window.addEventListener('pointerup', endFire);
  window.addEventListener('pointercancel', endFire);
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    if (k === 'r') state.reloadTap = true;
    if (k === 'p') state.pauseTap = true;
  });
  window.addEventListener('blur', () => {
    state.firing = false;
    state.forcePause = true;
  });

  return {
    state,
    consume(name) {
      const v = state[name];
      state[name] = false;
      return v;
    },
  };
}
