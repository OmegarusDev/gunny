import { clamp01 } from '../util/math.js';

const KEY = 'gunny.settings.v1';

export function defaultSettings() {
  return {
    muted: false,
    fullscreen: false,
    gunshot: 0.8,
    footsteps: 0.8,
    ambient: 0.55,
  };
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSettings();
    const parsed = JSON.parse(raw);
    const d = defaultSettings();
    return {
      muted: !!parsed.muted,
      fullscreen: !!parsed.fullscreen,
      gunshot: clamp01(parsed.gunshot, d.gunshot),
      footsteps: clamp01(parsed.footsteps, d.footsteps),
      ambient: clamp01(parsed.ambient, d.ambient),
    };
  } catch {
    return defaultSettings();
  }
}

export function saveSettings(settings) {
  if (typeof localStorage === 'undefined') return settings;
  localStorage.setItem(KEY, JSON.stringify(settings));
  return settings;
}
