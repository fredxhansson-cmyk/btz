/**
 * Prompt → editable beat. Turns a plain-language description ("dark trap, 140,
 * F minor, hard 808s and piano") into real drum channels, a groove, a bassline
 * and optional chords written into the active pattern. The output is ordinary
 * project data, so everything stays fully editable in the Drum Machine, Piano
 * Roll and Mixer afterwards — the anti-Suno differentiator: promptable BUT
 * editable, rendered by the app's own synths. Runs entirely in the browser and
 * costs nothing; an optional LLM path (pages/api/ai/beat) can refine the spec.
 */
import { clamp, COLORS, uid, BAR_TICKS, STEP_TICKS } from './constants';
import {
  kitById, padSpec, ROLE_IDS, roleInfo, padChannels, stepsToNotes,
} from './drums';
import { makeChannel } from './project';
import { defaultParams } from './audio/instruments';
import { generateGroove } from './ai';
import { scaleById } from './theory';
import { patternSteps } from './sequencer';

const NOTE_MAP = {
  c: 0, 'c#': 1, db: 1, d: 2, 'd#': 3, eb: 3, e: 4, f: 5, 'f#': 6,
  gb: 6, g: 7, 'g#': 8, ab: 8, a: 9, 'a#': 10, bb: 10, b: 11,
};

// Genre → kit + sensible tempo/feel defaults. First keyword hit wins.
const GENRES = [
  { keys: ['drill'], kit: 'trap', bpm: 142, density: 1.2, scale: 'harmonic' },
  { keys: ['trap'], kit: 'trap', bpm: 140, density: 1.2, scale: 'minor' },
  { keys: ['boom bap', 'boombap', 'boom-bap'], kit: 'boombap', bpm: 90, density: 0.9, scale: 'minor' },
  { keys: ['hip hop', 'hiphop', 'hip-hop', 'rap'], kit: 'boombap', bpm: 92, density: 0.95, scale: 'minor' },
  { keys: ['lo-fi', 'lofi', 'lo fi'], kit: 'lofi', bpm: 82, density: 0.7, scale: 'dorian' },
  { keys: ['deep house', 'house'], kit: 'tr909', bpm: 124, density: 1.0, scale: 'minor' },
  { keys: ['techno'], kit: 'techno', bpm: 130, density: 1.15, scale: 'minor' },
  { keys: ['big room', 'festival', 'edm'], kit: 'edm', bpm: 128, density: 1.2, scale: 'major' },
  { keys: ['minimal'], kit: 'minimal', bpm: 125, density: 0.75, scale: 'minor' },
  { keys: ['drum and bass', 'dnb', 'jungle'], kit: 'tr909', bpm: 174, density: 1.3, scale: 'minor' },
  { keys: ['afrobeat', 'afro'], kit: 'acoustic', bpm: 105, density: 1.0, scale: 'major' },
  { keys: ['reggaeton', 'dembow'], kit: 'trap', bpm: 95, density: 1.0, scale: 'minor' },
  { keys: ['ambient', 'cinematic'], kit: 'lofi', bpm: 80, density: 0.5, scale: 'minor' },
  { keys: ['pop'], kit: 'acoustic', bpm: 102, density: 0.9, scale: 'major' },
  { keys: ['909'], kit: 'tr909', bpm: 128, density: 1.05, scale: 'minor' },
  { keys: ['808'], kit: 'tr808', bpm: 130, density: 1.0, scale: 'minor' },
];

/** Parse a plain-language prompt into a beat spec. Deterministic, key-free. */
export function parsePrompt(text) {
  const t = (text || '').toLowerCase();
  const g = GENRES.find((x) => x.keys.some((k) => t.includes(k)))
    || { kit: 'tr808', bpm: 120, density: 1.0, scale: 'minor' };

  let bpm = g.bpm;
  const bpmMatch = t.match(/(\d{2,3})\s*(?:bpm|tempo)/) || t.match(/(?:@|at)\s*(\d{2,3})\b/);
  if (bpmMatch) bpm = clamp(parseInt(bpmMatch[1], 10), 40, 250);

  let scaleId = g.scale;
  let root = 0;
  const keyMatch = t.match(/\b([a-g])(#|b|♯|♭)?\s*(minor|major|moll|dur|min|maj)\b/);
  if (keyMatch) {
    let nn = keyMatch[1];
    const acc = keyMatch[2];
    if (acc === '#' || acc === '♯') nn += '#';
    else if (acc === 'b' || acc === '♭') nn += 'b';
    if (NOTE_MAP[nn] != null) root = NOTE_MAP[nn];
    const q = keyMatch[3];
    if (q === 'major' || q === 'dur' || q === 'maj') scaleId = 'major';
    else scaleId = scaleId === 'harmonic' ? 'harmonic' : 'minor';
  }
  if (/\bdorian\b/.test(t)) scaleId = 'dorian';
  if (/\bphrygian\b/.test(t)) scaleId = 'phrygian';
  if (/\bharmonic\b/.test(t)) scaleId = 'harmonic';
  if (/\bblues\b/.test(t)) scaleId = 'blues';
  if (/penta/.test(t)) scaleId = scaleId === 'major' ? 'pentaMajor' : 'pentaMinor';

  if (/dark|moody|sad|melanchol|emotional|somber|mörk|ledsen|sorg/.test(t) && scaleId === 'major') scaleId = 'minor';
  if (/happy|uplifting|bright|glad|ljus/.test(t) && scaleId === 'minor') scaleId = 'major';

  let density = g.density;
  if (/hard|aggressive|heavy|banging|hård|tung/.test(t)) density += 0.3;
  if (/busy|complex|intricate/.test(t)) density += 0.25;
  if (/simple|minimal|sparse|chill|lugn|enkel|laid.?back/.test(t)) density -= 0.3;
  density = clamp(density, 0.4, 1.9);

  const addBass = !/no bass|without bass|utan bas/.test(t);
  const addChords = /chord|keys|piano|pad|rhodes|harmony|melod|ackord|melodi|klaver/.test(t);

  return {
    kitId: g.kit, bpm, scaleId, root, density, addBass, addChords,
  };
}

/** Coerce a (possibly LLM-supplied) spec into safe, known values. */
export function sanitizeSpec(raw, fallback) {
  const base = fallback || parsePrompt('');
  const s = raw || {};
  const kit = kitById(s.kitId) ? s.kitId : base.kitId;
  const scale = scaleById(s.scaleId) && s.scaleId !== 'chromatic' ? s.scaleId : base.scaleId;
  return {
    kitId: kit,
    bpm: clamp(Number(s.bpm) || base.bpm, 40, 250),
    scaleId: scale,
    root: clamp(Number.isInteger(s.root) ? s.root : base.root, 0, 11),
    density: clamp(Number(s.density) || base.density, 0.4, 1.9),
    addBass: s.addBass == null ? base.addBass : !!s.addBass,
    addChords: s.addChords == null ? base.addChords : !!s.addChords,
  };
}

function applyKit(project, kitId) {
  const kit = kitById(kitId);
  const byRole = padChannels(project);
  let channels = [...project.channels];
  const added = [];
  ROLE_IDS.forEach((role, idx) => {
    const spec = padSpec(kit, role);
    if (!spec) return;
    const { inst, params } = spec;
    const info = roleInfo(role);
    const color = spec.color || COLORS[idx % COLORS.length];
    const existing = byRole.get(role);
    if (existing) {
      channels = channels.map((ch) => (ch.id === existing.id ? {
        ...ch, inst, role, choke: info.choke, color, params: { ...defaultParams(inst), ...params },
      } : ch));
    } else {
      const insert = project.inserts[(channels.length + added.length) % Math.max(1, project.inserts.length)];
      added.push(makeChannel(inst, info.name, {
        color, role, choke: info.choke, insert: insert ? insert.id : null, params,
      }));
    }
  });
  return { channels: [...channels, ...added], kitId: kit.id };
}

// Root-note offsets, per bar, that give a i–VI–iv–v style movement over any scale.
const PROGRESSION = [0, 5, 3, 4];

/** Build the full next project from a spec. Pure — returns a new project. */
export function buildBeat(project, brain, spec) {
  const { channels, kitId } = applyKit(project, spec.kitId);
  const next = { ...project, channels, kit: kitId, bpm: clamp(spec.bpm, 20, 300) };

  const pattern = next.patterns.find((p) => p.id === next.activePattern) || next.patterns[0];
  const barTicks = next.barTicks || BAR_TICKS;
  const steps = Math.max(16, patternSteps(pattern) || 16);
  const barSteps = Math.max(1, Math.round(barTicks / STEP_TICKS));
  const bars = Math.max(1, Math.round(steps / barSteps));

  const byRole = padChannels(next);
  const roleIds = ROLE_IDS.filter((r) => byRole.has(r));
  const groove = generateGroove(brain, roleIds, steps, spec.density) || {};

  const notes = { ...(pattern.notes || {}) };
  const kickSteps = [];
  roleIds.forEach((role) => {
    const list = groove[role] || [];
    notes[byRole.get(role).id] = stepsToNotes(list);
    if (role === 'kick') list.forEach((x) => kickSteps.push(typeof x === 'number' ? x : x.step));
  });

  const scale = scaleById(spec.scaleId).steps;
  const root = spec.root || 0;
  const scaleNote = (deg) => {
    const len = scale.length;
    const oct = Math.floor(deg / len);
    return oct * 12 + scale[((deg % len) + len) % len];
  };

  const added = [];

  if (spec.addBass) {
    const insert = next.inserts[channels.length % Math.max(1, next.inserts.length)];
    const bassCh = makeChannel('osc3', 'Bass', {
      color: COLORS[5 % COLORS.length], insert: insert ? insert.id : null,
      params: { octave: -1 },
    });
    const seq = kickSteps.length
      ? [...new Set(kickSteps)].sort((a, b) => a - b)
      : Array.from({ length: bars * 4 }, (_, i) => i * (barSteps / 4));
    notes[bassCh.id] = seq.map((step) => {
      const bar = Math.floor(step / barSteps);
      const deg = PROGRESSION[bar % PROGRESSION.length];
      return {
        id: uid('n'), t: Math.round(step * STEP_TICKS),
        k: clamp(36 + root + scaleNote(deg), 24, 60), d: STEP_TICKS * 2, v: 0.95,
      };
    });
    added.push(bassCh);
  }

  if (spec.addChords) {
    const insert = next.inserts[(channels.length + added.length) % Math.max(1, next.inserts.length)];
    const chordCh = makeChannel('rhodes', 'Chords', {
      color: COLORS[10 % COLORS.length], insert: insert ? insert.id : null,
    });
    const chordNotes = [];
    for (let b = 0; b < bars; b++) {
      const deg = PROGRESSION[b % PROGRESSION.length];
      [0, 2, 4].forEach((o) => {
        chordNotes.push({
          id: uid('n'), t: b * barTicks,
          k: clamp(60 + root + scaleNote(deg + o), 36, 96), d: barTicks, v: 0.6,
        });
      });
    }
    notes[chordCh.id] = chordNotes;
    added.push(chordCh);
  }

  const allChannels = [...channels, ...added];
  const patterns = next.patterns.map((p) => (p.id === pattern.id ? { ...p, notes } : p));
  const selectedChannel = added[0]
    ? added[0].id
    : (byRole.get('kick') ? byRole.get('kick').id : next.selectedChannel);

  return {
    ...next, channels: allChannels, patterns, selectedChannel,
  };
}

/** Short human summary of what a spec will produce, for the hint line. */
export function describeSpec(spec) {
  const kit = kitById(spec.kitId);
  const scale = scaleById(spec.scaleId);
  const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const parts = [`${kit.name} beat`, `${spec.bpm} BPM`, `${NAMES[spec.root]} ${scale.name}`];
  if (spec.addBass) parts.push('bass');
  if (spec.addChords) parts.push('chords');
  return parts.join(' · ');
}
