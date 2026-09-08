import { registerSW } from 'virtual:pwa-register';

let updateSW = null;
let pending = false;
let isSafeToReload = () => true;
let onUpdateAvailable = () => {};

/** Register the service worker. No-ops in builds without a SW. */
export function initPwa(hooks = {}) {
  if (hooks.isSafeToReload) isSafeToReload = hooks.isSafeToReload;
  if (hooks.onUpdateAvailable) onUpdateAvailable = hooks.onUpdateAvailable;

  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      pending = true;
      onUpdateAvailable();
      if (isSafeToReload()) applyPwaUpdate();
    },
    onRegisteredSW(swUrl, registration) {
      // Check for Pages deploys when the installed app is focused again.
      if (!registration) return;
      const check = () => registration.update().catch(() => {});
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) check();
      });
      setInterval(check, 60 * 60 * 1000);
    },
  });
}

export function hasPwaUpdate() {
  return pending;
}

/** Activate waiting SW and reload. Call only when not mid-run. */
export function applyPwaUpdate() {
  if (!pending || !updateSW) return false;
  pending = false;
  updateSW(true);
  return true;
}
