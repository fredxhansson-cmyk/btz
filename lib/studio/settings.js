/**
 * Small persistent store for user/program preferences that are not part of a
 * project file — artist name, theme, and the flags the onboarding uses. Kept
 * separate from the project so they follow the person, not the song.
 */

const KEYS = {
  artist: 'btz.artistName',
  theme: 'btz.theme',
  onboarding: 'btz.onboarding.v1',
  project: 'flowstudio.project.v2',
  brain: 'btz.brain',
};

function read(key, fallback = '') {
  if (typeof window === 'undefined') return fallback;
  try { const v = window.localStorage.getItem(key); return v == null ? fallback : v; } catch (e) { return fallback; }
}
function write(key, value) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(key, value); } catch (e) { /* quota / private mode */ }
}

export const getArtistName = () => read(KEYS.artist, '');
export const setArtistName = (name) => write(KEYS.artist, name || '');

export const getTheme = () => read(KEYS.theme, 'dark');
export const setThemePref = (theme) => write(KEYS.theme, theme);

/** Wipe the guided-tour flag so it shows again on next open. */
export function forgetOnboarding() {
  if (typeof window === 'undefined') return;
  try { window.localStorage.removeItem(KEYS.onboarding); } catch (e) { /* ignore */ }
}

/**
 * Full reset: drop the autosaved project and the learned AI "brain" so the
 * studio starts clean. Preferences (name/theme) are kept unless clearPrefs.
 */
export function resetStudio({ clearPrefs = false } = {}) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(KEYS.project);
    window.localStorage.removeItem(KEYS.brain);
    window.localStorage.removeItem(KEYS.onboarding);
    if (clearPrefs) {
      window.localStorage.removeItem(KEYS.artist);
      window.localStorage.removeItem(KEYS.theme);
    }
  } catch (e) { /* ignore */ }
}
