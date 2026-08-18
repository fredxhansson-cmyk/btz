// Standard MIDI File export and import (format 1, PPQ resolution).
import { PPQ, BAR_TICKS, uid, clamp } from './constants';
import { patternTicks } from './sequencer';
import { inferRole } from './drums';

/* ------------------------------------------------------------------ write */

function varLen(n) {
  const bytes = [n & 0x7f];
  let v = n >> 7;
  while (v > 0) {
    bytes.unshift((v & 0x7f) | 0x80);
    v >>= 7;
  }
  return bytes;
}

const str = (text) => [...text].map((c) => c.charCodeAt(0) & 0x7f);

function chunk(id, data) {
  const out = [...str(id), (data.length >> 24) & 255, (data.length >> 16) & 255, (data.length >> 8) & 255, data.length & 255];
  return out.concat(data);
}

function trackChunk(events, name) {
  // events: [{tick, bytes: []}] sorted by tick
  const data = [];
  if (name) {
    const nm = str(name).slice(0, 127);
    data.push(0x00, 0xff, 0x03, nm.length, ...nm);
  }
  let last = 0;
  for (const ev of events) {
    data.push(...varLen(Math.max(0, Math.round(ev.tick - last))), ...ev.bytes);
    last = ev.tick;
  }
  data.push(0x00, 0xff, 0x2f, 0x00);
  return chunk('MTrk', data);
}

/** Note list per channel for the chosen mode. */
export function collectNotes(project, mode) {
  const perChannel = new Map();
  const push = (chId, note, offset) => {
    if (!perChannel.has(chId)) perChannel.set(chId, []);
    perChannel.get(chId).push({ ...note, t: note.t + offset });
  };
  if (mode === 'song') {
    for (const clip of project.playlist) {
      const pattern = project.patterns.find((p) => p.id === clip.patternId);
      if (!pattern) continue;
      const plen = patternTicks(pattern);
      const clipLen = Math.max(1, clip.length || plen);
      for (let off = 0; off < clipLen; off += plen) {
        const room = Math.min(plen, clipLen - off);
        for (const [chId, list] of Object.entries(pattern.notes || {})) {
          for (const n of list) if (n.t < room) push(chId, n, clip.start + off);
        }
      }
    }
  } else {
    const pattern = project.patterns.find((p) => p.id === project.activePattern);
    if (pattern) {
      for (const [chId, list] of Object.entries(pattern.notes || {})) {
        for (const n of list) push(chId, n, 0);
      }
    }
  }
  return perChannel;
}

export function exportMidi(project, mode = 'song') {
  const perChannel = collectNotes(project, mode);
  const tracks = [];

  const usPerQuarter = Math.round(60000000 / Math.max(20, project.bpm));
  const meta = [
    { tick: 0, bytes: [0xff, 0x51, 0x03, (usPerQuarter >> 16) & 255, (usPerQuarter >> 8) & 255, usPerQuarter & 255] },
    { tick: 0, bytes: [0xff, 0x58, 0x04, 4, 2, 24, 8] },
  ];
  tracks.push(trackChunk(meta, project.name || 'BTZ'));

  let midiCh = 0;
  for (const ch of project.channels) {
    const notes = perChannel.get(ch.id);
    if (!notes || !notes.length) continue;
    // Drum pads go out on the GM drum channel with their standard note numbers,
    // so the file reads correctly in other DAWs and round-trips back to pads.
    const role = inferRole(ch);
    const gm = role ? ROLE_TO_GM[role] : null;
    const c = gm ? 9 : (midiCh % 15) + (midiCh % 15 >= 9 ? 1 : 0);
    const events = [];
    for (const n of notes) {
      const vel = Math.max(1, Math.round((n.v == null ? 0.85 : n.v) * 127));
      const key = clamp(gm || n.k, 0, 127);
      events.push({ tick: n.t, bytes: [0x90 | c, key, vel], order: 1 });
      events.push({ tick: n.t + Math.max(1, n.d), bytes: [0x80 | c, key, 0], order: 0 });
    }
    events.sort((a, b) => a.tick - b.tick || a.order - b.order);
    tracks.push(trackChunk(events, ch.name));
    if (!gm) midiCh++;
  }

  const header = chunk('MThd', [0, 1, (tracks.length >> 8) & 255, tracks.length & 255, (PPQ >> 8) & 255, PPQ & 255]);
  return new Uint8Array([...header, ...tracks.flat()]);
}

/* ------------------------------------------------------------------- read */

function reader(bytes) {
  let pos = 0;
  return {
    get pos() { return pos; },
    set pos(v) { pos = v; },
    u8: () => bytes[pos++],
    u16: () => ((bytes[pos++] << 8) | bytes[pos++]),
    u32: () => (((bytes[pos++] << 24) >>> 0) + (bytes[pos++] << 16) + (bytes[pos++] << 8) + bytes[pos++]),
    str: (n) => { let out = ''; for (let i = 0; i < n; i++) out += String.fromCharCode(bytes[pos++]); return out; },
    varLen: () => {
      let v = 0;
      for (let i = 0; i < 4; i++) {
        const b = bytes[pos++];
        v = (v << 7) | (b & 0x7f);
        if (!(b & 0x80)) break;
      }
      return v;
    },
    skip: (n) => { pos += n; },
    get eof() { return pos >= bytes.length; },
  };
}

/**
 * Parses a Standard MIDI File into tracks of notes, rescaled to our PPQ.
 * Returns { tracks: [{name, isDrums, notes:[{t,k,d,v}]}], bpm, ticks }.
 */
export function parseMidi(bytes) {
  const r = reader(bytes);
  if (r.str(4) !== 'MThd') throw new Error('Not a MIDI file.');
  r.u32();
  r.u16();
  const ntrks = r.u16();
  const division = r.u16();
  if (division & 0x8000) throw new Error('SMPTE-based MIDI files are not supported.');
  const scale = PPQ / division;
  let bpm = 120;
  const tracks = [];

  for (let i = 0; i < ntrks && !r.eof; i++) {
    if (r.str(4) !== 'MTrk') break;
    const len = r.u32();
    const end = r.pos + len;
    let tick = 0;
    let status = 0;
    let name = '';
    const open = new Map();
    const notes = [];
    let drums = false;

    while (r.pos < end) {
      tick += r.varLen();
      let b = r.u8();
      if (b < 0x80) { r.pos -= 1; b = status; } else status = b;
      const type = b & 0xf0;
      const chan = b & 0x0f;

      if (b === 0xff) {
        const metaType = r.u8();
        const mlen = r.varLen();
        if (metaType === 0x03) name = r.str(mlen);
        else if (metaType === 0x51) {
          const us = (r.u8() << 16) | (r.u8() << 8) | r.u8();
          bpm = Math.round((60000000 / us) * 10) / 10;
        } else r.skip(mlen);
        continue;
      }
      if (b === 0xf0 || b === 0xf7) { r.skip(r.varLen()); continue; }

      if (type === 0x90 || type === 0x80) {
        const key = r.u8();
        const vel = r.u8();
        if (chan === 9) drums = true;
        const at = Math.round(tick * scale);
        if (type === 0x90 && vel > 0) {
          open.set(key, { t: at, v: vel / 127 });
        } else {
          const on = open.get(key);
          if (on) {
            notes.push({ id: uid('n'), t: on.t, k: key, d: Math.max(6, at - on.t), v: on.v });
            open.delete(key);
          }
        }
      } else if (type === 0xc0 || type === 0xd0) r.skip(1);
      else r.skip(2);
    }
    r.pos = end;
    for (const [key, on] of open) {
      notes.push({ id: uid('n'), t: on.t, k: key, d: PPQ, v: on.v });
    }
    if (notes.length) tracks.push({ name: name || `Track ${i}`, isDrums: drums, notes });
  }

  const ticks = tracks.reduce((m, t) => Math.max(m, ...t.notes.map((n) => n.t + n.d)), 0);
  return { tracks, bpm, ticks, bars: Math.max(1, Math.ceil(ticks / BAR_TICKS)) };
}

/** Our pad roles -> General MIDI drum notes. */
export const ROLE_TO_GM = {
  kick: 36, snare: 38, clap: 39, rim: 37, chat: 42, ohat: 46,
  shaker: 70, tamb: 54, tomlo: 41, tommid: 45, tomhi: 48, cym: 49,
};

/** General MIDI drum note -> our pad roles. */
export const GM_DRUMS = {
  35: 'kick', 36: 'kick', 37: 'rim', 38: 'snare', 39: 'clap', 40: 'snare',
  41: 'tomlo', 42: 'chat', 43: 'tomlo', 44: 'chat', 45: 'tommid', 46: 'ohat',
  47: 'tommid', 48: 'tomhi', 50: 'tomhi', 49: 'cym', 51: 'cym', 52: 'cym',
  54: 'tamb', 56: 'rim', 57: 'cym', 69: 'shaker', 70: 'shaker',
};
