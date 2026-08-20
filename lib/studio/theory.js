// Musical helpers for the piano roll: scales, chords and note tools.
import { uid, clamp, MIN_KEY, MAX_KEY } from './constants';

export const SCALES = [
  { id: 'chromatic', name: 'Kromatisk', steps: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
  { id: 'major', name: 'Dur', steps: [0, 2, 4, 5, 7, 9, 11] },
  { id: 'minor', name: 'Naturlig moll', steps: [0, 2, 3, 5, 7, 8, 10] },
  { id: 'harmonic', name: 'Harmonisk moll', steps: [0, 2, 3, 5, 7, 8, 11] },
  { id: 'melodic', name: 'Melodisk moll', steps: [0, 2, 3, 5, 7, 9, 11] },
  { id: 'dorian', name: 'Dorisk', steps: [0, 2, 3, 5, 7, 9, 10] },
  { id: 'phrygian', name: 'Frygisk', steps: [0, 1, 3, 5, 7, 8, 10] },
  { id: 'lydian', name: 'Lydisk', steps: [0, 2, 4, 6, 7, 9, 11] },
  { id: 'mixolydian', name: 'Mixolydisk', steps: [0, 2, 4, 5, 7, 9, 10] },
  { id: 'locrian', name: 'Lokrisk', steps: [0, 1, 3, 5, 6, 8, 10] },
  { id: 'pentaMajor', name: 'Dur-pentatonisk', steps: [0, 2, 4, 7, 9] },
  { id: 'pentaMinor', name: 'Moll-pentatonisk', steps: [0, 3, 5, 7, 10] },
  { id: 'blues', name: 'Blues', steps: [0, 3, 5, 6, 7, 10] },
];

export const scaleById = (id) => SCALES.find((s) => s.id === id) || SCALES[0];

export function inScale(key, root, scaleId) {
  const steps = scaleById(scaleId).steps;
  return steps.includes((((key - root) % 12) + 12) % 12);
}

/** Nearest key that belongs to the scale. */
export function snapKeyToScale(key, root, scaleId) {
  if (inScale(key, root, scaleId)) return key;
  for (let d = 1; d <= 6; d++) {
    if (inScale(key - d, root, scaleId)) return key - d;
    if (inScale(key + d, root, scaleId)) return key + d;
  }
  return key;
}

export const CHORDS = [
  { id: 'none', name: 'Single note', iv: [0] },
  { id: 'maj', name: 'Major', iv: [0, 4, 7] },
  { id: 'min', name: 'Minor', iv: [0, 3, 7] },
  { id: 'dim', name: 'Dim', iv: [0, 3, 6] },
  { id: 'aug', name: 'Aug', iv: [0, 4, 8] },
  { id: 'sus2', name: 'Sus2', iv: [0, 2, 7] },
  { id: 'sus4', name: 'Sus4', iv: [0, 5, 7] },
  { id: 'maj7', name: 'Maj7', iv: [0, 4, 7, 11] },
  { id: 'min7', name: 'Min7', iv: [0, 3, 7, 10] },
  { id: 'dom7', name: '7', iv: [0, 4, 7, 10] },
  { id: 'm7b5', name: 'm7b5', iv: [0, 3, 6, 10] },
  { id: 'dim7', name: 'Dim7', iv: [0, 3, 6, 9] },
  { id: 'add9', name: 'Add9', iv: [0, 4, 7, 14] },
  { id: 'maj9', name: 'Maj9', iv: [0, 4, 7, 11, 14] },
  { id: 'min9', name: 'Min9', iv: [0, 3, 7, 10, 14] },
  { id: 'six', name: '6', iv: [0, 4, 7, 9] },
  { id: 'm6', name: 'm6', iv: [0, 3, 7, 9] },
  { id: 'power', name: 'Power (5)', iv: [0, 7, 12] },
];

export const chordById = (id) => CHORDS.find((c) => c.id === id) || CHORDS[0];

/** Chord voicing for a root key, optionally folded into a scale. */
export function chordKeys(root, chordId, scale) {
  const iv = chordById(chordId).iv;
  return iv.map((i) => {
    const k = root + i;
    return scale && scale.snap ? snapKeyToScale(k, scale.root, scale.id) : k;
  }).filter((k) => k >= MIN_KEY && k <= MAX_KEY);
}

/* ------------------------------------------------------------ note tools */

const groupByStart = (notes, tolerance = 6) => {
  const sorted = [...notes].sort((a, b) => a.t - b.t || a.k - b.k);
  const groups = [];
  for (const n of sorted) {
    const g = groups[groups.length - 1];
    if (g && Math.abs(n.t - g[0].t) <= tolerance) g.push(n);
    else groups.push([n]);
  }
  return groups;
};

export function quantizeNotes(notes, grid, strength = 1, alsoLength = false) {
  return notes.map((n) => {
    const target = Math.round(n.t / grid) * grid;
    const t = Math.max(0, Math.round(n.t + (target - n.t) * clamp(strength, 0, 1)));
    if (!alsoLength) return { ...n, t };
    const dTarget = Math.max(grid, Math.round(n.d / grid) * grid);
    return { ...n, t, d: Math.round(n.d + (dTarget - n.d) * clamp(strength, 0, 1)) };
  });
}

export const transposeNotes = (notes, semis) =>
  notes.map((n) => ({ ...n, k: clamp(n.k + semis, MIN_KEY, MAX_KEY) }));

export const nudgeNotes = (notes, ticks) =>
  notes.map((n) => ({ ...n, t: Math.max(0, n.t + ticks) }));

/** Spreads each chord out in time, like a strummed guitar. */
export function strumNotes(notes, spread = 12, down = true) {
  const groups = groupByStart(notes);
  const out = [];
  for (const g of groups) {
    const ordered = [...g].sort((a, b) => (down ? a.k - b.k : b.k - a.k));
    ordered.forEach((n, i) => {
      out.push({ ...n, t: Math.max(0, n.t + i * spread), d: Math.max(6, n.d - i * spread) });
    });
  }
  return out;
}

/** Turns each chord into a rolling arpeggio across its own length. */
export function arpeggiateNotes(notes, grid, mode = 'up', octaves = 1) {
  const groups = groupByStart(notes);
  const out = [];
  for (const g of groups) {
    if (g.length < 2) { out.push(...g); continue; }
    const span = Math.max(...g.map((n) => n.t + n.d)) - g[0].t;
    const keys = orderKeys(g.map((n) => n.k), mode, octaves);
    const count = Math.max(1, Math.round(span / grid));
    const vel = g[0].v == null ? 0.85 : g[0].v;
    for (let i = 0; i < count; i++) {
      out.push({
        id: uid('n'),
        t: g[0].t + i * grid,
        k: clamp(keys[i % keys.length], MIN_KEY, MAX_KEY),
        d: Math.max(4, Math.round(grid * 0.9)),
        v: vel,
      });
    }
  }
  return out;
}

export function orderKeys(keys, mode, octaves = 1) {
  const base = [...new Set(keys)].sort((a, b) => a - b);
  const spread = [];
  for (let o = 0; o < Math.max(1, octaves); o++) base.forEach((k) => spread.push(k + o * 12));
  switch (mode) {
    case 'down': return spread.slice().reverse();
    case 'updown': return [...spread, ...spread.slice(1, -1).reverse()];
    case 'random': return spread.slice().sort(() => Math.random() - 0.5);
    case 'chord': return spread;
    default: return spread;
  }
}

export const humanizeVelocity = (notes, amount = 0.18) =>
  notes.map((n) => ({
    ...n,
    v: clamp((n.v == null ? 0.85 : n.v) * (1 + (Math.random() * 2 - 1) * amount), 0.08, 1),
  }));

export const randomizeVelocity = (notes, lo = 0.5, hi = 1) =>
  notes.map((n) => ({ ...n, v: lo + Math.random() * (hi - lo) }));

/** Stretches every selected note so it reaches the next note in time. */
export function legatoNotes(notes, all) {
  const sorted = [...(all && all.length ? all : notes)].sort((a, b) => a.t - b.t);
  return notes.map((n) => {
    const next = sorted.find((m) => m.t > n.t);
    if (!next) return n;
    return { ...n, d: Math.max(6, next.t - n.t) };
  });
}

/** Flips the selection upside down around its own centre. */
export function invertNotes(notes) {
  if (!notes.length) return notes;
  const lo = Math.min(...notes.map((n) => n.k));
  const hi = Math.max(...notes.map((n) => n.k));
  return notes.map((n) => ({ ...n, k: clamp(lo + hi - n.k, MIN_KEY, MAX_KEY) }));
}

/** Reverses the selection in time inside its own span. */
export function reverseNotes(notes) {
  if (!notes.length) return notes;
  const start = Math.min(...notes.map((n) => n.t));
  const end = Math.max(...notes.map((n) => n.t + n.d));
  return notes.map((n) => ({ ...n, t: Math.max(0, start + (end - (n.t + n.d))) }));
}

export const cloneNotes = (notes, dt = 0) =>
  notes.map((n) => ({ ...n, id: uid('n'), t: Math.max(0, n.t + dt) }));
