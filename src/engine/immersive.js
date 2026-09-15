/** Best-effort immersive mode. Works on Android Chrome; iOS needs Add to Home Screen. */
export async function enterImmersive() {
  try {
    await screen.orientation?.lock?.('landscape');
  } catch {
    /* not a user-gesture, or already landscape */
  }

  if (document.fullscreenElement) return true;
  if (window.matchMedia('(display-mode: fullscreen)').matches) return true;

  const root = document.documentElement;
  try {
    if (root.requestFullscreen) {
      await root.requestFullscreen({ navigationUI: 'hide' });
      return true;
    }
    if (root.webkitRequestFullscreen) {
      root.webkitRequestFullscreen();
      return true;
    }
  } catch {
    /* user denied, missing gesture, or unsupported in this WebAPK */
  }
  return false;
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
