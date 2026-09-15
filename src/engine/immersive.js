/** Best-effort immersive mode. Fullscreen API needs a user gesture; do not await anything first. */
export function enterImmersive() {
  if (document.fullscreenElement) {
    lockLandscape();
    return Promise.resolve(true);
  }

  const root = document.documentElement;
  let pending = Promise.resolve(false);
  try {
    if (root.requestFullscreen) {
      pending = root
        .requestFullscreen({ navigationUI: 'hide' })
        .then(() => true)
        .catch(() => root.requestFullscreen().then(() => true).catch(() => false));
    } else if (root.webkitRequestFullscreen) {
      root.webkitRequestFullscreen();
      pending = Promise.resolve(true);
    }
  } catch {
    pending = Promise.resolve(false);
  }
  lockLandscape();
  return pending;
}

function lockLandscape() {
  try {
    const lock = screen.orientation?.lock?.('landscape');
    if (lock && typeof lock.catch === 'function') lock.catch(() => {});
  } catch {
    /* not a user-gesture, or already landscape */
  }
}

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
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    // iOS Safari home-screen launch
    (typeof navigator !== 'undefined' && navigator.standalone === true)
  );
}
