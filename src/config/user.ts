// NoirChord v1.0.0 — user settings helper (Phase B)
import { DEFAULT_SETTINGS, USER_KEYS, type UserSettings } from '../types';

function readBool(key: string, def: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return def;
    return v === '1' || v === 'true';
  } catch {
    return def;
  }
}

function writeBool(key: string, val: boolean) {
  try {
    localStorage.setItem(key, val ? '1' : '0');
  } catch {}
}

function readString<T extends string>(key: string, def: T): T {
  try {
    const v = localStorage.getItem(key);
    return (v ?? def) as T;
  } catch {
    return def;
  }
}

function writeString(key: string, val: string) {
  try {
    localStorage.setItem(key, val);
  } catch {}
}

export function loadSettings(): UserSettings {
  return {
    showLowFit: readBool(USER_KEYS.showLowFit, DEFAULT_SETTINGS.showLowFit),
    hideMascot: readBool(USER_KEYS.hideMascot, DEFAULT_SETTINGS.hideMascot),
    character: readString(USER_KEYS.character, DEFAULT_SETTINGS.character),
  };
}

export function saveSettings(s: UserSettings) {
  writeBool(USER_KEYS.showLowFit, s.showLowFit);
  writeBool(USER_KEYS.hideMascot, s.hideMascot);
  writeString(USER_KEYS.character, s.character);
}

export function setSetting<K extends keyof UserSettings>(key: K, value: UserSettings[K]) {
  const s = loadSettings();
  (s as any)[key] = value;
  saveSettings(s);
  return s;
}
