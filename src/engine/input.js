export function createInput(canvas) {
  const state = {
    pointerX: 0,
    pointerY: 0,
    firing: false,
    pointerTap: false,
    reloadTap: false,
    pauseTap: false,
    moved: false,
  };

  function placeDefault() {
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0) {
      state.pointerX = rect.width * 0.62;
      state.pointerY = rect.height * 0.48;
    }
  }
  placeDefault();
  window.addEventListener('resize', () => {
    if (!state.moved) placeDefault();
  });

  function toLocal(e) {
    const rect = canvas.getBoundingClientRect();
    state.pointerX = e.clientX - rect.left;
    state.pointerY = e.clientY - rect.top;
    state.moved = true;
  }

  function onDown(e) {
    if (e.target.closest('#overlay-root .panel:not(.hidden)')) return;
    if (!e.target.closest('#canvas-container')) return;
    toLocal(e);
    state.firing = true;
    state.pointerTap = true;
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
  canvas.addEventListener('pointerup', () => {
    state.firing = false;
  });
  canvas.addEventListener('lostpointercapture', () => {
    state.firing = false;
  });
  canvas.addEventListener('pointercancel', () => {
    state.firing = false;
  });
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    if (k === 'r') state.reloadTap = true;
    if (k === 'p') state.pauseTap = true;
  });
  window.addEventListener('keyup', (e) => {
    if (e.key === ' ') e.preventDefault();
  });
  window.addEventListener('blur', () => {
    state.firing = false;
    state.pauseTap = true;
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
