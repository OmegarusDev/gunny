/** Tab in the background, app switcher, or lock screen — not portrait. */
export function pageHidden() {
  return typeof document !== 'undefined' && document.hidden;
}
