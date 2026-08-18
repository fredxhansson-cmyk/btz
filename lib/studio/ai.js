// FLOW Brain — the built-in generator that learns locally.
//
// It is deliberately not a neural network in the cloud: it is an online
// statistical model over the synthesis parameters and step positions you
// actually keep. Everything is stored in this browser, nothing is uploaded,
// and the library grows for as long as you use the program.
import { STEP_TICKS, clamp, uid } from './constants';
import { INSTRUMENTS } from './audio/instruments';
import { DRUM_SOUNDS, INST_SOUNDS, LIBRARY, saveUserSound, loadUserSounds } from './library';
import { ROLES, inferRole } from './drums';

const KEY = 'flowstudio.brain.v1';
const PRIOR_WEIGHT = 3;      // how much the built-in library counts vs your own taste

export const CATEGORIES = [
  'Kick', 'Snare', 'Clap', 'Hihat', 'Perc', 'Tom', 'Cymbal',
  'Bass', 'Lead', 'Pad', 'Keys', 'FX',
];

const emptyBrain = () => ({
  version: 1,
  sounds: {},     // category -> { n, inst: {id: count}, params: {key: {n, mean, m2}}, choices: {key: {value: count}} }
  grooves: {},    // role -> { n, steps: number[16] }
  stats: { generated: 0, kept: 0, liked: 0, skipped: 0, projects: 0 },
  updated: 0,
});

export function loadBrain() {
  if (typeof window === 'undefined') return emptyBrain();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return emptyBrain();
    const b = JSON.parse(raw);
    return { ...emptyBrain(), ...b, sounds: b.sounds || {}, grooves: b.grooves || {}, stats: { ...emptyBrain().stats, ...(b.stats || {}) } };
  } catch (e) {
    return emptyBrain();
  }
}

export function saveBrain(brain) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...brain, updated: 1 }));
  } catch (e) { /* quota — keep the in-memory model */ }
  return brain;
}

export const resetBrain = () => saveBrain(emptyBrain());

/* ------------------------------------------------------------- learning */

/** Online mean/variance update (Welford) for one parameter. */
function observe(slot, value, weight = 1) {
  const s = slot || { n: 0, mean: value, m2: 0 };
  const n = s.n + weight;
  const delta = value - s.mean;
  const mean = s.mean + (delta * weight) / n;
  const m2 = s.m2 + weight * delta * (value - mean);
  return { n, mean, m2 };
}

const sd = (slot) => (slot && slot.n > 1 ? Math.sqrt(Math.max(0, slot.m2 / slot.n)) : 0);

/** Teaches the model one sound: an instrument id plus its parameters. */
export function learnSound(brain, { cat, inst, params }, weight = 1) {
  if (!cat || !inst || !params) return brain;
  const def = INSTRUMENTS[inst];
  if (!def) return brain;
  const bucket = brain.sounds[cat] || { n: 0, inst: {}, params: {}, choices: {} };
  bucket.n += weight;
  bucket.inst[inst] = (bucket.inst[inst] || 0) + weight;
  for (const [key, spec] of Object.entries(def.params)) {
    const value = params[key];
    if (value == null) continue;
    if (spec.kind === 'choice') {
      const c = bucket.choices[key] || {};
      c[value] = (c[value] || 0) + weight;
      bucket.choices[key] = c;
    } else if (typeof value === 'number') {
      bucket.params[key] = observe(bucket.params[key], value, weight);
    }
  }
  brain.sounds[cat] = bucket;
  brain.stats.kept += weight > 0 ? 1 : 0;
  return brain;
}

/** Teaches the model one drum lane: which 16th positions the role tends to hit. */
export function learnGroove(brain, role, stepIndices, weight = 1) {
  if (!role || !stepIndices || !stepIndices.length) return brain;
  const g = brain.grooves[role] || { n: 0, steps: new Array(16).fill(0) };
  const w = weight / Math.max(1, stepIndices.length / 8);   // normalise dense lanes
  for (const i of stepIndices) g.steps[((i % 16) + 16) % 16] += w;
  g.n += weight;
  brain.grooves[role] = g;
  return brain;
}

/** Learns from everything in a project: channel sounds and drum grooves. */
export function learnFromProject(brain, project, weight = 0.5) {
  const catOf = (ch) => {
    const role = inferRole(ch);
    if (role) {
      const map = {
        kick: 'Kick', snare: 'Snare', clap: 'Clap', chat: 'Hihat', ohat: 'Hihat',
        shaker: 'Hihat', tamb: 'Perc', rim: 'Perc', tomlo: 'Tom', tommid: 'Tom',
        tomhi: 'Tom', cym: 'Cymbal',
      };
      return map[role] || null;
    }
    const inst = INSTRUMENTS[ch.inst];
    if (!inst) return null;
    if (inst.cat === 'Synth') return 'Lead';
    return null;
  };

  for (const ch of project.channels) {
    const cat = catOf(ch);
    if (cat) learnSound(brain, { cat, inst: ch.inst, params: ch.params }, weight);
  }
  for (const pattern of project.patterns) {
    for (const ch of project.channels) {
      const role = inferRole(ch);
      if (!role) continue;
      const notes = (pattern.notes || {})[ch.id] || [];
      if (!notes.length) continue;
      learnGroove(brain, role, notes.map((n) => Math.round(n.t / STEP_TICKS)), weight);
    }
  }
  brain.stats.projects += 1;
  return brain;
}

/* ------------------------------------------------------------ generating */

const rnd = () => Math.random();
const gauss = () => {
  let u = 0;
  let v = 0;
  while (u === 0) u = rnd();
  while (v === 0) v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

const pickWeighted = (counts) => {
  const entries = Object.entries(counts || {});
  if (!entries.length) return null;
  const total = entries.reduce((a, [, c]) => a + c, 0);
  let r = rnd() * total;
  for (const [k, c] of entries) {
    r -= c;
    if (r <= 0) return k;
  }
  return entries[entries.length - 1][0];
};

/** Statistics of the built-in library for one category — the starting taste. */
function priorFor(cat) {
  const list = LIBRARY.filter((s) => s.cat === cat);
  const insts = {};
  const params = {};
  const choices = {};
  for (const sound of list) {
    insts[sound.inst] = (insts[sound.inst] || 0) + 1;
    const def = INSTRUMENTS[sound.inst];
    if (!def) continue;
    for (const [key, spec] of Object.entries(def.params)) {
      const v = sound.params[key];
      if (v == null) continue;
      if (spec.kind === 'choice') {
        choices[key] = choices[key] || {};
        choices[key][v] = (choices[key][v] || 0) + 1;
      } else if (typeof v === 'number') {
        params[key] = observe(params[key], v, 1);
      }
    }
  }
  return { insts, params, choices, n: list.length };
}

const ADJ_LOW = ['Deep', 'Sub', 'Dark', 'Tung'];
const ADJ_HIGH = ['Bright', 'Crisp', 'Ljus', 'Glass'];
const ADJ_DIRTY = ['Dirty', 'Rough', 'Rostig', 'Grov'];
const ADJ_SHORT = ['Tight', 'Snappy', 'Kort', 'Torr'];
const ADJ_LONG = ['Long', 'Boomy', 'Lang', 'Rymd'];
const ADJ_ANY = ['Soft', 'Round', 'Warm', 'Punchy', 'Neon', 'Iron', 'Velvet', 'Nordic', 'Studio', 'Midnatt'];

function nameFor(cat, inst, params) {
  const pool = [...ADJ_ANY];
  if (params.tune != null) {
    if (params.tune < 60) pool.push(...ADJ_LOW);
    if (params.tune > 1500) pool.push(...ADJ_HIGH);
  }
  if ((params.drive || 0) > 0.35) pool.push(...ADJ_DIRTY);
  if ((params.decay || 0) > 0.6) pool.push(...ADJ_LONG);
  if ((params.decay || 1) < 0.12) pool.push(...ADJ_SHORT);
  if ((params.cutoff || 0) > 6000) pool.push(...ADJ_HIGH);
  const adj = pool[Math.floor(rnd() * pool.length)];
  return `${adj} ${cat}`;
}

/**
 * Generates one new sound for a category, blending the built-in library with
 * everything the user has kept so far. `temperature` widens the search.
 */
export function generateSound(brain, cat, temperature = 1) {
  const prior = priorFor(cat);
  const learned = brain.sounds[cat];
  const counts = { ...prior.insts };
  if (learned) {
    for (const [id, c] of Object.entries(learned.inst)) counts[id] = (counts[id] || 0) + c * 2;
  }
  const inst = pickWeighted(counts) || (DRUM_SOUNDS.find((d) => d.cat === cat) || INST_SOUNDS[0]).inst;
  const def = INSTRUMENTS[inst];
  const params = {};

  for (const [key, spec] of Object.entries(def.params)) {
    if (spec.kind === 'choice') {
      const merged = { ...(prior.choices[key] || {}) };
      const lc = learned && learned.choices[key];
      if (lc) for (const [v, c] of Object.entries(lc)) merged[v] = (merged[v] || 0) + c * 2;
      params[key] = pickWeighted(merged) || spec.def;
      continue;
    }
    const p = prior.params[key];
    const l = learned && learned.params[key];
    const pn = p ? PRIOR_WEIGHT : 0;
    const ln = l ? l.n : 0;
    const mean = pn + ln > 0
      ? ((p ? p.mean * pn : 0) + (l ? l.mean * ln : 0)) / (pn + ln)
      : spec.def;
    const spread = Math.max(
      (spec.max - spec.min) * 0.06,
      ((p ? sd(p) : 0) * pn + (l ? sd(l) : 0) * ln) / Math.max(1, pn + ln),
    );
    let v = mean + gauss() * spread * temperature;
    if (spec.step) v = Math.round(v / spec.step) * spec.step;
    params[key] = clamp(v, spec.min, spec.max);
  }

  brain.stats.generated += 1;
  return {
    id: uid('ai'),
    name: nameFor(cat, inst, params),
    cat,
    inst,
    params,
    tags: ['ai', cat.toLowerCase()],
    kind: CATEGORIES.indexOf(cat) < 7 ? 'drum' : 'inst',
    ai: true,
  };
}

/** Keeps a generated sound: saves it to the library and teaches the model. */
export function keepSound(brain, sound, weight = 1) {
  learnSound(brain, sound, weight);
  saveUserSound({ ...sound, user: true, tags: [...(sound.tags || []), 'ai'] });
  return saveBrain(brain);
}

export const aiSoundCount = () => loadUserSounds().filter((s) => (s.tags || []).includes('ai')).length;

/* --------------------------------------------------------------- grooves */

/** Built-in feel per role, used until the model has learned enough. */
const GROOVE_PRIOR = {
  kick: [1, 0.02, 0.05, 0.06, 0.35, 0.03, 0.18, 0.05, 0.75, 0.03, 0.18, 0.08, 0.3, 0.04, 0.12, 0.06],
  snare: [0.02, 0.01, 0.03, 0.02, 0.9, 0.02, 0.05, 0.04, 0.03, 0.01, 0.04, 0.03, 0.9, 0.02, 0.08, 0.06],
  clap: [0.02, 0.01, 0.02, 0.02, 0.55, 0.02, 0.03, 0.02, 0.02, 0.01, 0.02, 0.02, 0.55, 0.02, 0.04, 0.03],
  chat: [0.8, 0.25, 0.7, 0.25, 0.8, 0.25, 0.7, 0.3, 0.8, 0.25, 0.7, 0.25, 0.8, 0.25, 0.7, 0.35],
  ohat: [0.03, 0.02, 0.18, 0.03, 0.03, 0.02, 0.2, 0.05, 0.03, 0.02, 0.18, 0.03, 0.03, 0.02, 0.25, 0.08],
  shaker: [0.2, 0.35, 0.2, 0.35, 0.2, 0.35, 0.2, 0.35, 0.2, 0.35, 0.2, 0.35, 0.2, 0.35, 0.2, 0.4],
  rim: [0.05, 0.03, 0.08, 0.03, 0.05, 0.03, 0.1, 0.04, 0.05, 0.03, 0.08, 0.03, 0.05, 0.03, 0.12, 0.05],
  tamb: [0.05, 0.03, 0.12, 0.03, 0.05, 0.03, 0.12, 0.04, 0.05, 0.03, 0.12, 0.03, 0.05, 0.03, 0.14, 0.05],
  tomlo: [0.03, 0.01, 0.02, 0.02, 0.02, 0.01, 0.03, 0.02, 0.03, 0.01, 0.02, 0.02, 0.04, 0.02, 0.06, 0.04],
  tommid: [0.02, 0.01, 0.02, 0.02, 0.02, 0.01, 0.03, 0.02, 0.02, 0.01, 0.02, 0.02, 0.03, 0.02, 0.06, 0.04],
  tomhi: [0.02, 0.01, 0.02, 0.02, 0.02, 0.01, 0.03, 0.02, 0.02, 0.01, 0.02, 0.02, 0.03, 0.02, 0.07, 0.05],
  cym: [0.4, 0.01, 0.01, 0.01, 0.02, 0.01, 0.01, 0.01, 0.05, 0.01, 0.01, 0.01, 0.02, 0.01, 0.02, 0.02],
};

/** Blended hit probability for one role at one 16th position. */
export function stepProbability(brain, role, step, amount = 1) {
  const prior = (GROOVE_PRIOR[role] || GROOVE_PRIOR.rim)[((step % 16) + 16) % 16];
  const g = brain.grooves[role];
  if (!g || g.n < 2) return clamp(prior * amount, 0, 1);
  const total = g.steps.reduce((a, b) => a + b, 0) || 1;
  const learned = (g.steps[((step % 16) + 16) % 16] / total) * 16 * 0.35;
  const w = clamp(g.n / (g.n + 6), 0, 0.8);          // trust grows with data
  return clamp((prior * (1 - w) + learned * w) * amount, 0, 1);
}

/** Generates a full drum pattern from the learned feel. */
export function generateGroove(brain, roles, steps, amount = 1) {
  const out = {};
  for (const role of roles) {
    const hits = [];
    for (let i = 0; i < steps; i++) {
      if (rnd() < stepProbability(brain, role, i, amount)) {
        hits.push({ step: i, vel: i % 4 === 0 ? 1 : 0.55 + rnd() * 0.4 });
      }
    }
    if (role === 'kick' && !hits.some((h) => h.step === 0)) hits.unshift({ step: 0, vel: 1 });
    out[role] = hits;
  }
  return out;
}

export const brainSummary = (brain) => ({
  sounds: Object.entries(brain.sounds).map(([cat, b]) => ({ cat, n: Math.round(b.n) })).filter((x) => x.n > 0),
  grooves: Object.entries(brain.grooves).map(([role, g]) => ({ role, n: Math.round(g.n) })).filter((x) => x.n > 0),
  stats: brain.stats,
  roles: ROLES.map((r) => r.id),
});
