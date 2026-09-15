/** Best-effort immersive mode. Fullscreen API needs a user gesture; do not await anything first. */
export function enterImmersive() {
  const html = document.documentElement;
  const box = document.getElementById('canvas-container') || html;
  const current = document.fullscreenElement || document.webkitFullscreenElement;
  // Prefer the game box. If the document is already "fullscreen" from PWA display
  // mode, requesting the same node is rejected — switch node so Android can apply
  // short-edges cutout (the double-tap path that actually fills the camera hole).
  const target = current === box ? null : box;
  let pending = Promise.resolve(true);
  if (target) pending = requestHide(target).catch(() => requestHide(html).catch(() => false));
  lockLandscape();
  return pending;
}

function requestHide(el) {
  try {
    if (el.requestFullscreen) {
      return el
        .requestFullscreen({ navigationUI: 'hide' })
        .then(() => true)
        .catch(() => el.requestFullscreen().then(() => true).catch(() => false));
    }
    if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
      return Promise.resolve(true);
    }
  } catch {
    /* unsupported or gesture already consumed */
  }
  return Promise.resolve(false);
}

function lockLandscape() {
  try {
    const lock = screen.orientation?.lock?.('landscape');
    if (lock && typeof lock.catch === 'function') lock.catch(() => {});
  } catch {
    /* not a user-gesture, or already landscape */
  }
}

document.addEventListener('fullscreenchange', lockLandscape);
document.addEventListener('webkitfullscreenchange', lockLandscape);

export async function exitImmersive() {
  try {
    if (document.fullscreenElement && document.exitFullscreen) {
      await document.exitFullscreen();
    }
  } catch {
    /* ignore */
  }
}

export function isStandaloneDisplay() {
  return (
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari home-screen launch
    (typeof navigator !== 'undefined' && navigator.standalone === true)
  );
}
