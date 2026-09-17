/** A new build waits until camp — never reload mid-run or on the end screen. */
export function pwaUpdateBlocked(mode) {
  return mode !== 'hub';
}
