// Core musical constants for FLOW Studio.
export const PPQ = 96;                      // ticks per quarter note
export const STEP_TICKS = PPQ / 4;          // 16th note = one step in the rack
export const BEATS_PER_BAR = 4;
export const BAR_TICKS = PPQ * BEATS_PER_BAR;

export const MIN_KEY = 12;
export const MAX_KEY = 119;
export const DEFAULT_KEY = 60;              // C5 in FL numbering, C4 in MIDI

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const IS_BLACK = [false, true, false, true, false, false, true, false, true, false, true, false];

export const keyName = (k) => `${NOTE_NAMES[((k % 12) + 12) % 12]}${Math.floor(k / 12) - 1}`;
export const midiToFreq = (k) => 440 * Math.pow(2, (k - 69) / 12);

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const dbToGain = (db) => (db <= -60 ? 0 : Math.pow(10, db / 20));
export const gainToDb = (g) => (g <= 0.001 ? -60 : 20 * Math.log10(g));

export const COLORS = [
  '#ff5a5a', '#ff9f43', '#ffd93d', '#8ce99a', '#4dd4ac',
  '#4dabf7', '#748ffc', '#b197fc', '#f783ac', '#ff8787',
  '#63e6be', '#a9e34b', '#ffa8a8', '#66d9e8', '#e599f7', '#ffc078',
];

// Snap options used by the piano roll / playlist.
export const SNAPS = [
  { id: 'none', label: 'None', ticks: 1 },
  { id: '1/1', label: 'Bar', ticks: BAR_TICKS },
  { id: '1/2', label: '1/2', ticks: PPQ * 2 },
  { id: '1/4', label: '1/4 (beat)', ticks: PPQ },
  { id: '1/8', label: '1/8', ticks: PPQ / 2 },
  { id: '1/16', label: '1/16 (step)', ticks: STEP_TICKS },
  { id: '1/32', label: '1/32', ticks: STEP_TICKS / 2 },
  { id: '1/3', label: '1/8 triplet', ticks: PPQ / 3 },
];
export const snapTicks = (id) => (SNAPS.find((s) => s.id === id) || SNAPS[5]).ticks;

export const ticksToBBT = (tick) => {
  const bar = Math.floor(tick / BAR_TICKS) + 1;
  const beat = Math.floor((tick % BAR_TICKS) / PPQ) + 1;
  const t = Math.floor(tick % PPQ);
  return `${String(bar).padStart(3, '0')}:${beat}:${String(t).padStart(2, '0')}`;
};

export const uid = (() => {
  let n = 0;
  return (prefix = 'id') => `${prefix}${(n++).toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
})();
