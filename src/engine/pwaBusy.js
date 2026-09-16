/** A new build waits until camp — never reload mid-run. */
export function pwaUpdateBlocked(mode, run) {
  return mode === 'run' && !!run && !run.ended;
}
