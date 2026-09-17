const KEY = 'gunny.settings.v1';

function clamp01(n, fallback) {
  const v = Number(n);
  return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fallback;
}

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
    const legacy = clamp01(parsed.volume, 0.8);
    return {
      muted: !!parsed.muted,
      fullscreen: !!parsed.fullscreen,
      gunshot: clamp01(parsed.gunshot, legacy),
      footsteps: clamp01(parsed.footsteps, legacy),
      ambient: clamp01(parsed.ambient, Math.min(1, legacy * 0.7)),
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

export function effectiveVolume(settings) {
  if (!settings || settings.muted) return 0;
  return 1;
}
