// Turns project data (patterns, notes, playlist clips) into tick-indexed
// event maps that the scheduler can look up cheaply.
import { BAR_TICKS, STEP_TICKS, PPQ, clamp } from './constants';
import { orderKeys } from './theory';
import { valueAt } from './automation';

const ARP_RATES = {
  '1/4': PPQ, '1/8': PPQ / 2, '1/8T': PPQ / 3, '1/16': PPQ / 4, '1/16T': PPQ / 6, '1/32': PPQ / 8,
};

/**
 * Expands held chords into an arpeggio when a channel has its arpeggiator on.
 * Runs at event-map build time, so it applies to pattern playback, song
 * playback and the offline bounce alike.
 */
export function arpExpand(notes, arp) {
  if (!arp || !arp.on || !notes.length) return notes;
  const grid = ARP_RATES[arp.rate] || PPQ / 4;
  const gate = clamp(arp.gate == null ? 0.9 : arp.gate, 0.05, 1);
  const sorted = [...notes].sort((a, b) => a.t - b.t || a.k - b.k);
  const groups = [];
  for (const n of sorted) {
    const g = groups[groups.length - 1];
    if (g && Math.abs(n.t - g[0].t) <= 6) g.push(n);
    else groups.push([n]);
  }
  const out = [];
  for (const g of groups) {
    const start = g[0].t;
    const end = Math.max(...g.map((n) => n.t + n.d));
    const keys = orderKeys(g.map((n) => n.k), arp.mode || 'up', arp.octaves || 1);
    if (!keys.length) continue;
    const count = Math.max(1, Math.round((end - start) / grid));
    for (let i = 0; i < count; i++) {
      out.push({
        id: `${g[0].id}a${i}`,
        t: start + i * grid,
        k: keys[i % keys.length],
        d: Math.max(3, Math.round(grid * gate)),
        v: g[0].v == null ? 0.85 : g[0].v,
      });
    }
  }
  return out;
}

export const patternTicks = (pattern) =>
  Math.max(1, (pattern ? pattern.bars : 1)) * ((pattern && pattern.barTicks) || BAR_TICKS);
export const patternSteps = (pattern) => Math.round(patternTicks(pattern) / STEP_TICKS);

/** Map<tick, Array<{channelId, note}>> for a single pattern. */
export function buildPatternMap(project, patternId) {
  const map = new Map();
  const pattern = project.patterns.find((p) => p.id === patternId);
  if (!pattern) return map;
  const len = patternTicks(pattern);
  for (const ch of project.channels) {
    const raw = (pattern.notes && pattern.notes[ch.id]) || [];
    const notes = ch.arp && ch.arp.on ? arpExpand(raw, ch.arp) : raw;
    for (const n of notes) {
      if (n.t >= len) continue;
      const list = map.get(n.t) || [];
      list.push({ channelId: ch.id, note: n });
      map.set(n.t, list);
    }
  }
  return map;
}

/** Map<tick, events> for the whole playlist, plus the song length in ticks. */
export function buildSongMap(project) {
  const map = new Map();
  let end = 0;
  const patCache = new Map();
  const tMute = project.trackMute || {};
  const tSolo = project.trackSolo || {};
  const anySolo = Object.values(tSolo).some(Boolean);
  for (const clip of project.playlist) {
    if (tMute[clip.track]) continue;
    if (anySolo && !tSolo[clip.track]) continue;
    const pattern = project.patterns.find((p) => p.id === clip.patternId);
    if (!pattern) continue;
    const plen = patternTicks(pattern);
    if (!patCache.has(pattern.id)) patCache.set(pattern.id, buildPatternMap(project, pattern.id));
    const pmap = patCache.get(pattern.id);
    const clipLen = Math.max(1, clip.length || plen);
    end = Math.max(end, clip.start + clipLen);
    for (let off = 0; off < clipLen; off += plen) {
      const room = Math.min(plen, clipLen - off);
      for (const [t, evs] of pmap) {
        if (t >= room) continue;
        const abs = clip.start + off + t;
        const list = map.get(abs) || [];
        for (const e of evs) list.push(e);
        map.set(abs, list);
      }
    }
  }
  return { map, length: end };
}

export const songLength = (project) => {
  let end = 0;
  for (const clip of project.playlist) {
    const pattern = project.patterns.find((p) => p.id === clip.patternId);
    const plen = pattern ? patternTicks(pattern) : BAR_TICKS;
    end = Math.max(end, clip.start + Math.max(1, clip.length || plen));
  }
  return end;
};

/**
 * Collects automation evaluators for the current playback mode.
 * Each evaluator maps a playback position (in ticks) to a normalised value,
 * or null when the lane is not active at that position.
 */
export function collectAutomation(project, mode) {
  const evals = [];
  const targets = new Set();
  const addLane = (lane, start, clipLen, patLen) => {
    if (!lane || !lane.target || !lane.points || !lane.points.length) return;
    targets.add(lane.target);
    const points = [...lane.points].sort((a, b) => a.t - b.t);
    if (start == null) {
      evals.push({ target: lane.target, at: (pos) => valueAt(points, pos % Math.max(1, patLen)) });
    } else {
      const end = start + clipLen;
      evals.push({
        target: lane.target,
        at: (pos) => (pos >= start && pos < end ? valueAt(points, (pos - start) % Math.max(1, patLen)) : null),
      });
    }
  };

  if (mode === 'song') {
    for (const clip of project.playlist) {
      const pattern = project.patterns.find((p) => p.id === clip.patternId);
      if (!pattern || !pattern.automation) continue;
      const plen = patternTicks(pattern);
      const clipLen = Math.max(1, clip.length || plen);
      for (const lane of pattern.automation) addLane(lane, clip.start, clipLen, plen);
    }
  } else {
    const pattern = project.patterns.find((p) => p.id === project.activePattern);
    if (pattern && pattern.automation) {
      const plen = patternTicks(pattern);
      for (const lane of pattern.automation) addLane(lane, null, 0, plen);
    }
  }
  return { evals, targets };
}
