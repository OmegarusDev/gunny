/** Software cursor for camp / overlays. Hidden during active combat (canvas crosshair). */

export function mountSoftCursor() {
  let el = document.getElementById('soft-cursor');
  if (!el) {
    el = document.createElement('div');
    el.id = 'soft-cursor';
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
  }

  let mode = 'menu';
  let visible = false;

  function setMode(next) {
    mode = next;
    el.classList.toggle('is-crosshair', mode === 'crosshair');
    el.classList.toggle('is-menu', mode === 'menu');
    el.classList.toggle('is-hidden', mode === 'hidden' || !visible);
    document.documentElement.dataset.cursorMode = mode;
  }

  function move(clientX, clientY) {
    visible = true;
    el.style.transform = `translate3d(${clientX}px, ${clientY}px, 0)`;
    if (mode !== 'hidden') el.classList.remove('is-hidden');
  }

  window.addEventListener(
    'pointermove',
    (e) => {
      move(e.clientX, e.clientY);
    },
    { passive: true },
  );
  window.addEventListener(
    'pointerdown',
    (e) => {
      move(e.clientX, e.clientY);
    },
    { passive: true },
  );
  window.addEventListener('pointerleave', () => {
    visible = false;
    el.classList.add('is-hidden');
  });

  setMode('menu');
  return {
    setMode,
    el,
  };
}
