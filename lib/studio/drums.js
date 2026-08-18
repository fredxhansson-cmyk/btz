// Drum machine: pad roles, kit presets and rhythm tools.
// Pads map onto ordinary channels, so everything edited here also shows up in
// the Channel Rack, the Piano Roll and the Playlist.
import { STEP_TICKS, COLORS, uid } from './constants';

/** Pad roles in MPC-style layout order (bottom row first when rendered). */
export const ROLES = [
  { id: 'kick', name: 'Kick', key: 'z', choke: 0 },
  { id: 'snare', name: 'Snare', key: 'x', choke: 0 },
  { id: 'clap', name: 'Clap', key: 'c', choke: 0 },
  { id: 'chat', name: 'Closed Hat', key: 'v', choke: 1 },
  { id: 'rim', name: 'Rim', key: 'a', choke: 0 },
  { id: 'shaker', name: 'Shaker', key: 's', choke: 0 },
  { id: 'tamb', name: 'Tamb', key: 'd', choke: 0 },
  { id: 'ohat', name: 'Open Hat', key: 'f', choke: 1 },
  { id: 'tomlo', name: 'Low Tom', key: 'q', choke: 0 },
  { id: 'tommid', name: 'Mid Tom', key: 'w', choke: 0 },
  { id: 'tomhi', name: 'Hi Tom', key: 'e', choke: 0 },
  { id: 'cym', name: 'Cymbal', key: 'r', choke: 2 },
];

export const ROLE_IDS = ROLES.map((r) => r.id);
export const roleInfo = (id) => ROLES.find((r) => r.id === id) || null;

/** Visual grid: three rows of four, kick bottom-left like an MPC. */
export const PAD_ROWS = [
  ['tomlo', 'tommid', 'tomhi', 'cym'],
  ['rim', 'shaker', 'tamb', 'ohat'],
  ['kick', 'snare', 'clap', 'chat'],
];

const c = (i) => COLORS[i % COLORS.length];

/**
 * Kit presets. Each entry is `role: [instrumentId, params, colorIndex]`.
 * Every kit covers the same roles so switching a kit keeps the groove intact.
 */
export const KITS = [
  {
    id: 'tr808',
    name: 'FLOW-808',
    desc: 'Djup subbastrumma, tunn snare, metalliska hihats.',
    pads: {
      kick: ['kick', { tune: 45, punch: 6, pitchDecay: 0.06, decay: 0.9, click: 0.12, drive: 0.15 }, 0],
      snare: ['snare', { tune: 180, tone: 0.5, decay: 0.22, snap: 1800, width: 2.2, drive: 0.1 }, 1],
      clap: ['clap', { freq: 1150, width: 2.2, spread: 0.012, decay: 0.28 }, 2],
      rim: ['perc', { tune: 1400, ratio: 1.48, decay: 0.05, noise: 0.05 }, 5],
      chat: ['hat', { tune: 40, hpf: 7600, decay: 0.055, metal: 0.85 }, 3],
      ohat: ['hat', { tune: 40, hpf: 7600, decay: 0.42, metal: 0.85 }, 10],
      shaker: ['hat', { tune: 55, hpf: 5200, decay: 0.07, metal: 0.05 }, 13],
      tamb: ['perc', { tune: 2400, ratio: 1.9, decay: 0.09, noise: 0.7 }, 12],
      tomlo: ['tom', { tune: 90, bend: 1.6, decay: 0.5, noise: 0.1 }, 4],
      tommid: ['tom', { tune: 140, bend: 1.6, decay: 0.42, noise: 0.1 }, 4],
      tomhi: ['tom', { tune: 200, bend: 1.6, decay: 0.35, noise: 0.1 }, 4],
      cym: ['hat', { tune: 30, hpf: 4200, decay: 1.2, metal: 0.95 }, 14],
    },
  },
  {
    id: 'tr909',
    name: 'FLOW-909',
    desc: 'Punchig kick med klick, brusig snare, ljusa hats.',
    pads: {
      kick: ['kick', { tune: 55, punch: 9, pitchDecay: 0.028, decay: 0.42, click: 0.5, drive: 0.35 }, 0],
      snare: ['snare', { tune: 210, tone: 0.32, decay: 0.3, snap: 2600, width: 1.4, drive: 0.25 }, 1],
      clap: ['clap', { freq: 1500, width: 1.6, spread: 0.009, decay: 0.34 }, 2],
      rim: ['perc', { tune: 1700, ratio: 1.33, decay: 0.04, noise: 0.15 }, 5],
      chat: ['hat', { tune: 48, hpf: 8800, decay: 0.045, metal: 0.6 }, 3],
      ohat: ['hat', { tune: 48, hpf: 8800, decay: 0.5, metal: 0.6 }, 10],
      shaker: ['hat', { tune: 60, hpf: 6000, decay: 0.06, metal: 0.02 }, 13],
      tamb: ['perc', { tune: 2800, ratio: 2.2, decay: 0.08, noise: 0.85 }, 12],
      tomlo: ['tom', { tune: 100, bend: 2, decay: 0.42, noise: 0.25 }, 4],
      tommid: ['tom', { tune: 155, bend: 2, decay: 0.36, noise: 0.25 }, 4],
      tomhi: ['tom', { tune: 225, bend: 2, decay: 0.3, noise: 0.25 }, 4],
      cym: ['hat', { tune: 34, hpf: 5200, decay: 1.6, metal: 0.9 }, 14],
    },
  },
  {
    id: 'acoustic',
    name: 'FLOW Acoustic',
    desc: 'Mjukare, kortare och mer trumset-likt.',
    pads: {
      kick: ['kick', { tune: 62, punch: 5, pitchDecay: 0.02, decay: 0.3, click: 0.6, drive: 0.08 }, 0],
      snare: ['snare', { tune: 195, tone: 0.45, decay: 0.34, snap: 2100, width: 1, drive: 0.05 }, 1],
      clap: ['clap', { freq: 900, width: 1.2, spread: 0.016, decay: 0.24 }, 2],
      rim: ['perc', { tune: 1100, ratio: 1.7, decay: 0.045, noise: 0.2 }, 5],
      chat: ['hat', { tune: 44, hpf: 6800, decay: 0.06, metal: 0.35 }, 3],
      ohat: ['hat', { tune: 44, hpf: 6400, decay: 0.55, metal: 0.35 }, 10],
      shaker: ['hat', { tune: 50, hpf: 4800, decay: 0.09, metal: 0 }, 13],
      tamb: ['perc', { tune: 2100, ratio: 1.6, decay: 0.12, noise: 0.9 }, 12],
      tomlo: ['tom', { tune: 95, bend: 1.35, decay: 0.6, noise: 0.3 }, 4],
      tommid: ['tom', { tune: 135, bend: 1.35, decay: 0.52, noise: 0.3 }, 4],
      tomhi: ['tom', { tune: 190, bend: 1.35, decay: 0.44, noise: 0.3 }, 4],
      cym: ['hat', { tune: 28, hpf: 3600, decay: 2.2, metal: 0.75 }, 14],
    },
  },
  {
    id: 'trap',
    name: 'FLOW Trap',
    desc: 'Lang 808-kick, vassa claps och snabba hats.',
    pads: {
      kick: ['kick', { tune: 38, punch: 7, pitchDecay: 0.085, decay: 1.6, click: 0.2, drive: 0.3 }, 0],
      snare: ['snare', { tune: 245, tone: 0.22, decay: 0.18, snap: 3200, width: 1.8, drive: 0.2 }, 1],
      clap: ['clap', { freq: 1900, width: 1.4, spread: 0.007, decay: 0.22 }, 2],
      rim: ['perc', { tune: 2000, ratio: 1.25, decay: 0.035, noise: 0.1 }, 5],
      chat: ['hat', { tune: 52, hpf: 9600, decay: 0.03, metal: 0.7 }, 3],
      ohat: ['hat', { tune: 52, hpf: 9600, decay: 0.3, metal: 0.7 }, 10],
      shaker: ['hat', { tune: 64, hpf: 7000, decay: 0.045, metal: 0.1 }, 13],
      tamb: ['perc', { tune: 3200, ratio: 2.6, decay: 0.06, noise: 0.8 }, 12],
      tomlo: ['tom', { tune: 80, bend: 2.6, decay: 0.55, noise: 0.05 }, 4],
      tommid: ['tom', { tune: 120, bend: 2.6, decay: 0.45, noise: 0.05 }, 4],
      tomhi: ['tom', { tune: 175, bend: 2.6, decay: 0.38, noise: 0.05 }, 4],
      cym: ['hat', { tune: 36, hpf: 6000, decay: 1.1, metal: 1 }, 14],
    },
  },
  {
    id: 'lofi',
    name: 'FLOW LoFi',
    desc: 'Morkt, mattat och lite ur stamning.',
    pads: {
      kick: ['kick', { tune: 50, punch: 4, pitchDecay: 0.05, decay: 0.5, click: 0.08, drive: 0.45 }, 0],
      snare: ['snare', { tune: 168, tone: 0.55, decay: 0.26, snap: 1200, width: 3, drive: 0.35 }, 1],
      clap: ['clap', { freq: 800, width: 3, spread: 0.018, decay: 0.3 }, 2],
      rim: ['perc', { tune: 950, ratio: 1.9, decay: 0.06, noise: 0.3 }, 5],
      chat: ['hat', { tune: 38, hpf: 5200, decay: 0.07, metal: 0.4 }, 3],
      ohat: ['hat', { tune: 38, hpf: 5000, decay: 0.38, metal: 0.4 }, 10],
      shaker: ['hat', { tune: 46, hpf: 3800, decay: 0.1, metal: 0 }, 13],
      tamb: ['perc', { tune: 1700, ratio: 1.45, decay: 0.14, noise: 0.75 }, 12],
      tomlo: ['tom', { tune: 85, bend: 1.4, decay: 0.62, noise: 0.4 }, 4],
      tommid: ['tom', { tune: 125, bend: 1.4, decay: 0.54, noise: 0.4 }, 4],
      tomhi: ['tom', { tune: 172, bend: 1.4, decay: 0.46, noise: 0.4 }, 4],
      cym: ['hat', { tune: 26, hpf: 2800, decay: 1.8, metal: 0.6 }, 14],
    },
  },
];

export const kitById = (id) => KITS.find((k) => k.id === id) || KITS[0];

/** Best-effort role for channels made before the drum machine existed. */
export function inferRole(channel) {
  if (channel.role) return channel.role;
  const name = (channel.name || '').toLowerCase();
  for (const r of ROLES) {
    if (name.includes(r.id)) return r.id;
  }
  if (name.includes('open')) return 'ohat';
  switch (channel.inst) {
    case 'kick': return 'kick';
    case 'snare': return 'snare';
    case 'clap': return 'clap';
    case 'hat': return (channel.params && channel.params.decay > 0.2) ? 'ohat' : 'chat';
    case 'tom': return 'tomlo';
    case 'perc': return 'rim';
    default: return null;
  }
}

/** Channels that belong to the drum machine, keyed by role. */
export function padChannels(project) {
  const byRole = new Map();
  for (const ch of project.channels) {
    const role = inferRole(ch);
    if (role && !byRole.has(role)) byRole.set(role, ch);
  }
  return byRole;
}

/* ---------------------------------------------------------------- rhythms */

/** Even (Euclidean) distribution of `pulses` hits over `steps`. */
export function euclid(steps, pulses, rotate = 0) {
  const n = Math.max(1, steps);
  const k = Math.max(0, Math.min(pulses, n));
  const out = new Array(n).fill(0);
  let bucket = 0;
  for (let i = 0; i < n; i++) {
    bucket += k;
    if (bucket >= n) { bucket -= n; out[i] = 1; }
  }
  if (!rotate) return out;
  const r = ((rotate % n) + n) % n;
  return out.slice(n - r).concat(out.slice(0, n - r));
}

/** Chance that a role plays on a given 16th step — used by "Slumpa". */
const DENSITY = {
  kick: (i) => (i === 0 ? 1 : i % 8 === 0 ? 0.75 : i % 4 === 0 ? 0.3 : 0.12),
  snare: (i) => (i % 8 === 4 ? 0.9 : 0.05),
  clap: (i) => (i % 8 === 4 ? 0.5 : 0.04),
  rim: () => 0.08,
  chat: (i) => (i % 2 === 0 ? 0.8 : 0.3),
  ohat: (i) => (i % 4 === 2 ? 0.18 : 0.03),
  shaker: (i) => (i % 2 === 1 ? 0.25 : 0.08),
  tamb: (i) => (i % 4 === 2 ? 0.15 : 0.04),
  tomlo: () => 0.05,
  tommid: () => 0.04,
  tomhi: () => 0.04,
  cym: (i) => (i === 0 ? 0.5 : 0.01),
};

export function randomSteps(role, steps, amount = 1) {
  const fn = DENSITY[role] || (() => 0.1);
  const out = [];
  for (let i = 0; i < steps; i++) {
    if (Math.random() < fn(i) * amount) {
      out.push({ step: i, vel: i % 4 === 0 ? 1 : 0.6 + Math.random() * 0.3 });
    }
  }
  return out;
}

export const stepsToNotes = (list) => list.map(({ step, vel }) => ({
  id: uid('n'), t: step * STEP_TICKS, k: 60, d: STEP_TICKS, v: vel == null ? 0.9 : vel,
}));

/** Nudges timing and velocity so a programmed beat breathes a little. */
export function humanizeNotes(notes, timeAmount = 3, velAmount = 0.15) {
  return notes.map((n) => ({
    ...n,
    t: Math.max(0, Math.round(n.t + (Math.random() * 2 - 1) * timeAmount)),
    v: Math.max(0.08, Math.min(1, (n.v == null ? 0.85 : n.v) * (1 + (Math.random() * 2 - 1) * velAmount))),
  }));
}

/** Copies the first half of the pattern into the second half. */
export function doubleNotes(notes, halfTicks) {
  const first = notes.filter((n) => n.t < halfTicks);
  return [...notes.filter((n) => n.t < halfTicks), ...first.map((n) => ({ ...n, id: uid('n'), t: n.t + halfTicks }))];
}

/** Replaces one step with `count` evenly spaced hits (1 = plain, 2-4 = roll). */
export function rollNotes(step, count, vel = 0.9) {
  const from = step * STEP_TICKS;
  const n = Math.max(1, Math.min(6, count));
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({
      id: uid('n'),
      t: Math.round(from + (i * STEP_TICKS) / n),
      k: 60,
      d: Math.max(3, Math.round(STEP_TICKS / n)),
      v: Math.max(0.15, vel * (n === 1 ? 1 : 0.65 + (0.35 * i) / (n - 1))),
    });
  }
  return out;
}

export const notesInStep = (notes, step) => {
  const from = step * STEP_TICKS;
  return notes.filter((n) => n.t >= from && n.t < from + STEP_TICKS);
};

export const stepColor = (i) => c(i);
