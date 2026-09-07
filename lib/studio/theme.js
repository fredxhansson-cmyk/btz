// BTZ Design System — canvas bridge.
// Canvas (piano roll, knobs, meters) can't use CSS var(); it reads the same
// design tokens from :root here so there are no hardcoded colors anywhere.
// Values are cached and refreshed if the token set changes.

const FALLBACK = {
  '--accent': '#ff746e',
  '--accent-ink': '#1c0202',
  '--bg': '#080b12',
  '--panel': '#0f141d',
  '--panel2': '#03060b',
  '--surface': '#151b24',
  '--line': 'rgba(255,255,255,0.10)',
  '--line2': 'rgba(255,255,255,0.06)',
  '--text': '#eef2f9',
  '--dim': '#b0b8c5',
  '--green': '#85c425',
  '--blue': '#36b2ff',
  '--red': '#f1383e',
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
