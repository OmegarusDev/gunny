import { registerSW } from 'virtual:pwa-register';
import { pwaUpdateBlocked } from './engine/pwaBusy.js';

export { pwaUpdateBlocked };

export function initPwa({ busy } = {}) {
  let waiting = false;
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      if (busy?.()) {
        waiting = true;
        return;
      }
      updateSW(true);
    },
  });
  return function applyWhenIdle() {
    if (!waiting || busy?.()) return;
    waiting = false;
    updateSW(true);
  };
}
