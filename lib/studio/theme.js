// BTZ Design System — canvas bridge.
// Canvas (piano roll, knobs, meters) can't use CSS var(); it reads the same
// design tokens from :root here so there are no hardcoded colors anywhere.
// Values are cached and refreshed if the token set changes.

const FALLBACK = {
  '--accent': '#d6ff3f',
  '--accent-ink': '#0c0c0b',
  '--bg': '#0c0c0b',
  '--panel': '#0f0f0e',
  '--panel2': '#0d0d0c',
  '--surface': '#161613',
  '--line': '#22221c',
  '--line2': '#2a2a23',
  '--text': '#edebe6',
  '--dim': '#b9b6ae',
  '--green': '#d6ff3f',
  '--blue': '#7fb2ff',
  '--red': '#ff5c36',
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

/** Resolve a token name, e.g. token('--accent'). Reads live on demand and caches. */
export function token(name) {
  const c = read();
  if (c[name] != null) return c[name];
  if (typeof window !== 'undefined' && window.getComputedStyle) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    if (v) { c[name] = v; return v; }
  }
  return FALLBACK[name] || '#000';
}

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
