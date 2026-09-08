/** Best-effort immersive mode. Works on Android Chrome; iOS needs Add to Home Screen. */
export async function enterImmersive() {
  const root = document.documentElement;
  try {
    if (document.fullscreenElement) return true;
    if (root.requestFullscreen) {
      await root.requestFullscreen({ navigationUI: 'hide' });
      return true;
    }
    if (root.webkitRequestFullscreen) {
      root.webkitRequestFullscreen();
      return true;
    }
  } catch {
    /* user denied or unsupported */
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
