// BTZ Design System — canvas bridge.
// Canvas (piano roll, knobs, meters) can't use CSS var(); it reads the same
// design tokens from :root here so there are no hardcoded colors anywhere.
// Values are cached and refreshed if the token set changes.

const FALLBACK = {
  '--accent': '#c8f24c',
  '--accent-ink': '#16210a',
  '--bg': '#0a0b0e',
  '--panel': '#14161c',
  '--panel2': '#0f1116',
  '--surface': '#1b1e26',
  '--line': '#05060a',
  '--line2': '#262a33',
  '--text': '#e7ebf0',
  '--dim': '#8b93a1',
  '--green': '#8ce99a',
  '--blue': '#5b9dff',
  '--red': '#ff5a6a',
};

let cache = null;
function read() {
  if (cache) return cache;
  cache = { ...FALLBACK };
  if (typeof window !== 'undefined' && window.getComputedStyle) {
    const cs = getComputedStyle(document.documentElement);
    for (const k of Object.keys(FALLBACK)) {
      const v = cs.getPropertyValue(k).trim();
      if (v) cache[k] = v;
    }
  }
  return cache;
}

/** Invalidate the cache after tokens change at runtime (theme switch). */
export function refreshTheme() { cache = null; }

/** Resolve a token name, e.g. token('--accent'). */
export function token(name) { return read()[name] || FALLBACK[name] || '#000'; }

const hexToRgb = (hex) => {
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
};

/** rgba() string built from a token, e.g. tokenA('--accent', 0.12). */
export function tokenA(name, alpha) {
  const v = token(name);
  if (v.startsWith('rgb')) return v;
  const [r, g, b] = hexToRgb(v);
  return `rgba(${r},${g},${b},${alpha})`;
}

export const accent = () => token('--accent');
export const accentA = (a) => tokenA('--accent', a);
