import { registerSW } from 'virtual:pwa-register';

/** Register the service worker. A new build applies on this visit — never mid-run. */
export function initPwa() {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateSW(true);
    },
  });
}
