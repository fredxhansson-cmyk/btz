// Project data model + the demo song loaded on first visit.
import { BAR_TICKS, STEP_TICKS, PPQ, COLORS, uid } from './constants';
import { defaultParams } from './audio/instruments';
import { defaultFxParams } from './audio/effects';

export const PROJECT_VERSION = 1;

export const makeNote = (t, k = 60, d = STEP_TICKS, v = 0.85) => ({ id: uid('n'), t, k, d, v });

export function makeChannel(inst, name, opts = {}) {
  return {
    id: uid('c'),
    name,
    inst,
    color: opts.color || COLORS[Math.floor(Math.random() * COLORS.length)],
    vol: opts.vol == null ? 0.8 : opts.vol,
    pan: opts.pan || 0,
    mute: false,
    solo: false,
    insert: opts.insert || null,
    role: opts.role || null,
    choke: opts.choke || 0,
    arp: opts.arp || { on: false, rate: '1/16', mode: 'up', octaves: 1, gate: 0.9 },
    params: { ...defaultParams(inst), ...(opts.params || {}) },
  };
}

export function makePattern(name, bars = 1, color = COLORS[3]) {
  return { id: uid('p'), name, bars, color, notes: {}, automation: [] };
}

export function makeInsert(index) {
  return {
    id: uid('i'),
    name: `Insert ${index}`,
    vol: 0.8,
    pan: 0,
    mute: false,
    solo: false,
    fx: [],
    sends: [],
  };
}

export function makeFx(type) {
  return { id: uid('f'), type, on: true, params: { ...defaultFxParams(type) } };
}

const stepNotes = (steps, key = 60, vel = 0.9, dur = STEP_TICKS) =>
  steps.map((s) => makeNote(s * STEP_TICKS, key, dur, vel));

export function createDefaultProject() {
  const inserts = [];
  for (let i = 1; i <= 8; i++) inserts.push(makeInsert(i));
  inserts[4].fx = [makeFx('eq3'), makeFx('comp')];
  inserts[5].fx = [makeFx('reverb')];
  inserts[6].fx = [makeFx('delay'), makeFx('reverb')];

  const kick = makeChannel('kick', 'Kick', { color: COLORS[0], insert: inserts[0].id, vol: 0.95, role: 'kick' });
  const clap = makeChannel('clap', 'Clap', { color: COLORS[2], insert: inserts[1].id, vol: 0.6, role: 'clap' });
  const hat = makeChannel('hat', 'Closed Hat', { color: COLORS[3], insert: inserts[2].id, vol: 0.4, role: 'chat', choke: 1 });
  const openhat = makeChannel('hat', 'Open Hat', {
    color: COLORS[10], insert: inserts[2].id, vol: 0.28, role: 'ohat', choke: 1,
    params: { decay: 0.34, hpf: 8200 },
  });
  const snare = makeChannel('snare', 'Snare', { color: COLORS[1], insert: inserts[3].id, vol: 0.5, role: 'snare' });
  const bass = makeChannel('osc3', 'Bass', {
    color: COLORS[6], insert: inserts[4].id, vol: 0.75,
    params: { wave1: 'sawtooth', wave2: 'square', lvl2: 0.4, coarse3: -12, lvl3: 0.6, cutoff: 520, res: 6, envAmt: 2.2, fdecay: 0.22, sustain: 0.5, release: 0.12, drive: 0.25 },
  });
  const chords = makeChannel('fm', 'Chords', {
    color: COLORS[7], insert: inserts[5].id, vol: 0.35,
    params: { ratio: 2, index: 3, idecay: 0.8, attack: 0.06, decay: 1.2, sustain: 0.55, release: 0.6, cutoff: 6000 },
  });
  const lead = makeChannel('pluck', 'Lead', {
    color: COLORS[8], insert: inserts[6].id, vol: 0.6,
    params: { wave: 'sawtooth', cutoff: 3200, res: 7, envAmt: 2.8, decay: 1.1, body: 0.3, sub: 0.3 },
  });

  const channels = [kick, clap, hat, openhat, snare, bass, chords, lead];

  const beat = makePattern('Beat', 1, COLORS[0]);
  beat.notes = {
    [kick.id]: stepNotes([0, 4, 8, 10, 14], 60, 1),
    [clap.id]: stepNotes([4, 12], 60, 0.9),
    [hat.id]: stepNotes([0, 2, 4, 6, 8, 10, 12, 14], 60, 0.7),
    [openhat.id]: stepNotes([7, 15], 60, 0.6),
    [snare.id]: stepNotes([15], 60, 0.5),
  };

  const bassPat = makePattern('Bass', 2, COLORS[6]);
  const bassSeq = [
    [0, 33], [3, 33], [6, 33], [8, 33], [11, 29], [14, 29],
    [16, 36], [19, 36], [22, 36], [24, 31], [27, 31], [30, 31],
  ];
  bassPat.notes = {
    [bass.id]: bassSeq.map(([s, k]) => makeNote(s * STEP_TICKS, k, STEP_TICKS * 1.6, 0.9)),
  };

  const chordPat = makePattern('Chords', 4, COLORS[7]);
  const prog = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
  chordPat.notes = {
    [chords.id]: prog.flatMap((chord, bar) =>
      chord.map((k) => makeNote(bar * BAR_TICKS, k, BAR_TICKS - PPQ / 4, 0.7))),
  };

  const leadPat = makePattern('Lead', 2, COLORS[8]);
  const melody = [
    [0, 69, 2], [2, 72, 2], [4, 76, 4], [8, 74, 2], [10, 72, 2], [12, 69, 4],
    [16, 67, 2], [18, 72, 2], [20, 74, 4], [24, 76, 2], [26, 79, 2], [28, 76, 4],
  ];
  leadPat.notes = {
    [lead.id]: melody.map(([s, k, len]) => makeNote(s * STEP_TICKS, k, STEP_TICKS * len, 0.85)),
  };

  const patterns = [beat, bassPat, chordPat, leadPat];

  const playlist = [
    { id: uid('cl'), patternId: chordPat.id, track: 0, start: 0, length: BAR_TICKS * 16 },
    { id: uid('cl'), patternId: beat.id, track: 1, start: BAR_TICKS * 4, length: BAR_TICKS * 12 },
    { id: uid('cl'), patternId: bassPat.id, track: 2, start: BAR_TICKS * 4, length: BAR_TICKS * 12 },
    { id: uid('cl'), patternId: leadPat.id, track: 3, start: BAR_TICKS * 8, length: BAR_TICKS * 8 },
  ];

  return {
    version: PROJECT_VERSION,
    name: 'FLOW Demo',
    bpm: 128,
    swing: 0,
    loop: true,
    master: { vol: 0.75 },
    channels,
    patterns,
    inserts,
    playlist,
    activePattern: beat.id,
    selectedChannel: kick.id,
    selectedInsert: inserts[0].id,
  };
}

export function createEmptyProject() {
  const inserts = [];
  for (let i = 1; i <= 8; i++) inserts.push(makeInsert(i));
  const channels = [
    makeChannel('kick', 'Kick', { color: COLORS[0], insert: inserts[0].id, vol: 0.95, role: 'kick' }),
    makeChannel('snare', 'Snare', { color: COLORS[1], insert: inserts[3].id, vol: 0.55, role: 'snare' }),
    makeChannel('clap', 'Clap', { color: COLORS[2], insert: inserts[1].id, vol: 0.6, role: 'clap' }),
    makeChannel('hat', 'Closed Hat', { color: COLORS[3], insert: inserts[2].id, vol: 0.4, role: 'chat', choke: 1 }),
  ];
  const pattern = makePattern('Pattern 1', 1, COLORS[3]);
  return {
    version: PROJECT_VERSION,
    name: 'Untitled',
    bpm: 130,
    swing: 0,
    loop: true,
    master: { vol: 0.75 },
    channels,
    patterns: [pattern],
    inserts,
    playlist: [],
    activePattern: pattern.id,
    selectedChannel: channels[0].id,
    selectedInsert: inserts[0].id,
  };
}

/** Defensive load so old/broken saves cannot crash the UI. */
export function normalizeProject(raw) {
  const base = createEmptyProject();
  if (!raw || typeof raw !== 'object') return base;
  const p = { ...base, ...raw };
  p.channels = Array.isArray(raw.channels) && raw.channels.length ? raw.channels : base.channels;
  p.patterns = Array.isArray(raw.patterns) && raw.patterns.length ? raw.patterns : base.patterns;
  p.inserts = Array.isArray(raw.inserts) && raw.inserts.length ? raw.inserts : base.inserts;
  p.playlist = Array.isArray(raw.playlist) ? raw.playlist : [];
  p.master = { vol: 0.75, ...(raw.master || {}) };
  p.channels = p.channels.map((c) => ({ ...makeChannel(c.inst || 'kick', c.name || 'Channel'), ...c }));
  p.patterns = p.patterns.map((pt) => ({ ...makePattern(pt.name || 'Pattern'), ...pt, notes: pt.notes || {}, automation: pt.automation || [] }));
  if (!p.patterns.find((x) => x.id === p.activePattern)) p.activePattern = p.patterns[0].id;
  if (!p.channels.find((x) => x.id === p.selectedChannel)) p.selectedChannel = p.channels[0].id;
  if (!p.inserts.find((x) => x.id === p.selectedInsert)) p.selectedInsert = p.inserts[0].id;
  p.bpm = Math.min(300, Math.max(20, Number(p.bpm) || 130));
  return p;
}
