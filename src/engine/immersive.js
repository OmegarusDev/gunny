import { loadSettings } from '../state/settings.js';

/** Best-effort immersive mode. Fullscreen API needs a user gesture; do not await anything first. */
export function enterImmersive() {
  const settings = loadSettings();
  const env = detectEnv();
  if (!wantsImmersive(settings, env)) return Promise.resolve(false);

  lockLandscape();

  // WebAPK display:fullscreen is what actually hides the Android status bar.
  // Requesting the HTML Fullscreen API on top of that is what brought the
  // clock/battery back. Only use the API when opted in, or when the install
  // is still standalone.
  if (!usesHtmlFullscreen(settings, env)) return Promise.resolve(true);

  const html = document.documentElement;
  const box = document.getElementById('canvas-container') || html;
  const current = document.fullscreenElement || document.webkitFullscreenElement;
  if (current) return Promise.resolve(true);
  return requestHide(box).then((ok) => (ok ? true : requestHide(html)));
}

export function wantsImmersive(settings = loadSettings(), env = detectEnv()) {
  if (settings?.fullscreen) return true;
  return !!(env.android && env.installed);
}

export function usesHtmlFullscreen(settings = loadSettings(), env = detectEnv()) {
  if (settings?.fullscreen) return true;
  if (!(env.android && env.installed)) return false;
  return !env.displayFullscreen;
}

export function detectEnv() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  return {
    android: /Android/i.test(ua),
    installed: isStandaloneDisplay(),
    displayFullscreen: isDisplayFullscreen(),
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

export function isDisplayFullscreen() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: fullscreen)').matches
  );
}

export function isStandaloneDisplay() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return (
    isDisplayFullscreen() ||
    window.matchMedia('(display-mode: standalone)').matches ||
    (typeof navigator !== 'undefined' && navigator.standalone === true)
  );
}
