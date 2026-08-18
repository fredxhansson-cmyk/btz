// Offline bounce: renders the pattern or the full song to a WAV blob.
import { PPQ, STEP_TICKS } from '../constants';
import { MixerGraph } from './graph';
import { triggerNote } from './trigger';
import { buildPatternMap, buildSongMap, patternTicks } from '../sequencer';

export async function renderProject(project, buffers, opts = {}) {
  const mode = opts.mode || 'song';
  const repeats = Math.max(1, opts.repeats || 1);
  const tail = opts.tail == null ? 2.5 : opts.tail;
  const sampleRate = opts.sampleRate || 44100;
  const spt = 60 / Math.max(20, project.bpm) / PPQ;

  let map;
  let length;
  if (mode === 'song') {
    const song = buildSongMap(project);
    map = song.map;
    length = song.length;
  } else {
    map = buildPatternMap(project, project.activePattern);
    length = patternTicks(project.patterns.find((p) => p.id === project.activePattern));
  }
  if (!length) throw new Error('Inget att rendera - lagg till noter forst.');

  const totalTicks = length * repeats;
  const duration = totalTicks * spt + tail;
  const OAC = typeof window !== 'undefined' && (window.OfflineAudioContext || window.webkitOfflineAudioContext);
  if (!OAC) throw new Error('OfflineAudioContext stods inte i den har webblasaren.');
  const ctx = new OAC(2, Math.ceil(sampleRate * duration), sampleRate);
  const graph = new MixerGraph(ctx, project, { analysers: false });

  const anySolo = project.channels.some((c) => c.solo);
  const chokes = new Map();
  const swing = project.swing || 0;
  const events = [];
  for (let r = 0; r < repeats; r++) {
    for (const [tick, list] of map) {
      for (const ev of list) events.push({ tick: tick + r * length, local: tick, ev });
    }
  }
  // Choke groups depend on order, so render strictly in time order.
  events.sort((a, b) => a.tick - b.tick);
  for (const item of events) {
    const ch = project.channels.find((c) => c.id === item.ev.channelId);
    if (!ch || ch.mute || (anySolo && !ch.solo)) continue;
    let time = item.tick * spt;
    if (swing > 0 && item.local % (STEP_TICKS * 2) === STEP_TICKS) {
      time += swing * 0.5 * STEP_TICKS * spt;
    }
    triggerNote(ctx, graph, ch, item.ev.note, time, spt, buffers, chokes);
  }
  return ctx.startRendering();
}

/** 16-bit PCM WAV encoder. */
export function encodeWav(buffer) {
  const channels = buffer.numberOfChannels;
  const frames = buffer.length;
  const bytes = frames * channels * 2;
  const view = new DataView(new ArrayBuffer(44 + bytes));
  const str = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  str(0, 'RIFF');
  view.setUint32(4, 36 + bytes, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  str(36, 'data');
  view.setUint32(40, bytes, true);

  const data = [];
  for (let c = 0; c < channels; c++) data.push(buffer.getChannelData(c));
  let off = 44;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < channels; c++) {
      const s = Math.max(-1, Math.min(1, data[c][i]));
      view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      off += 2;
    }
  }
  return new Blob([view.buffer], { type: 'audio/wav' });
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
}
