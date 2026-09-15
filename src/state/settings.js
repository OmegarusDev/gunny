const KEY = 'gunny.settings.v1';

export function defaultSettings() {
  return { volume: 0.8, muted: false };
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSettings();
    const parsed = JSON.parse(raw);
    const volume = Math.max(0, Math.min(1, Number(parsed.volume)));
    return {
      volume: Number.isFinite(volume) ? volume : 0.8,
      muted: !!parsed.muted,
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
  return Math.max(0, Math.min(1, settings.volume));
}
