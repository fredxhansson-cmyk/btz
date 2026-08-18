// Turns project data (patterns, notes, playlist clips) into tick-indexed
// event maps that the scheduler can look up cheaply.
import { BAR_TICKS, STEP_TICKS } from './constants';

export const patternTicks = (pattern) => Math.max(1, (pattern ? pattern.bars : 1)) * BAR_TICKS;
export const patternSteps = (pattern) => Math.round(patternTicks(pattern) / STEP_TICKS);

/** Map<tick, Array<{channelId, note}>> for a single pattern. */
export function buildPatternMap(project, patternId) {
  const map = new Map();
  const pattern = project.patterns.find((p) => p.id === patternId);
  if (!pattern) return map;
  const len = patternTicks(pattern);
  for (const ch of project.channels) {
    const notes = (pattern.notes && pattern.notes[ch.id]) || [];
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
  for (const clip of project.playlist) {
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
