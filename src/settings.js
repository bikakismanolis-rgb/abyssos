// Settings model: reads/writes save.settings and applies each change to the running game.
import { save, saveNow, DEFAULT_SETTINGS } from './save.js';
import { SFX } from './audio/sfx.js';
import { setLang, deviceLang } from './i18n/index.js';
import { vibrate } from './native.js';

export function settings() { return save.settings; }

export function setSetting(key, value) {
  if (!(key in DEFAULT_SETTINGS)) return;
  save.settings[key] = value;
  saveNow();
  applySetting(key);
}

export function applySetting(key) {
  const s = save.settings;
  if (key === 'sfx') SFX.setVolume(s.sfx / 100);
  else if (key === 'lang') setLang(s.lang || deviceLang());
}

// Applies everything once at startup (after load()).
export function applyAllSettings() {
  for (const k in DEFAULT_SETTINGS) applySetting(k);
}

// Haptic feedback: the device's haptics in the app, navigator.vibrate in the browser (iOS Safari ignores it)
export function buzz(ms) {
  if (!save.settings.vibrate) return;
  vibrate(ms);
}
