import { loadSettings } from '../state/settings.js';

/** Best-effort immersive mode. Fullscreen API needs a user gesture; do not await anything first. */
export function enterImmersive() {
  if (!wantsImmersive()) return Promise.resolve(false);

  const html = document.documentElement;
  const box = document.getElementById('canvas-container') || html;
  const current = document.fullscreenElement || document.webkitFullscreenElement;
  lockLandscape();
  if (current) return Promise.resolve(true);

  // Standalone WebAPK + navigationUI hide dismisses the Android status bar
  // and paints into the camera cutout. Browser/desktop skip this unless
  // Options → Fullscreen in all modes is on.
  return requestHide(box).then((ok) => (ok ? true : requestHide(html)));
}

export function wantsImmersive(settings = loadSettings(), env = detectEnv()) {
  if (settings?.fullscreen) return true;
  return !!(env.android && env.installed);
}

export function detectEnv() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  return {
    android: /Android/i.test(ua),
    installed: isStandaloneDisplay(),
  };
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
  if (!wantsImmersive()) return;
  try {
    const lock = screen.orientation?.lock?.('landscape');
    if (lock && typeof lock.catch === 'function') lock.catch(() => {});
  } catch {
    /* not a user-gesture, or already landscape */
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('fullscreenchange', lockLandscape);
  document.addEventListener('webkitfullscreenchange', lockLandscape);
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
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return (
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: standalone)').matches ||
    (typeof navigator !== 'undefined' && navigator.standalone === true)
  );
}
