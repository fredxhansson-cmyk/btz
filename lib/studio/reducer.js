// Single reducer over the whole project + undo/redo history.
import { STEP_TICKS, BAR_TICKS, clamp, COLORS, uid, barTicksOf, beatTicksOf } from './constants';
import { makeChannel, makePattern, makeFx, makeInsert, makeNote, normalizeProject } from './project';
import { patternTicks } from './sequencer';
import { ROLE_IDS, kitById, padChannels, roleInfo, padSpec } from './drums';
import { soundColor } from './library';
import { makeLane, sortPoints } from './automation';
import { GM_DRUMS } from './midi';
import { defaultParams } from './audio/instruments';
import { defaultFxParams } from './audio/effects';

const HISTORY = 80;
const NO_HISTORY = new Set([
  'set', 'select.channel', 'select.insert', 'pattern.select', 'undo', 'redo', 'transport', 'automation.record',
]);

const mapById = (arr, id, fn) => arr.map((x) => (x.id === id ? fn(x) : x));

function patternNotes(project, patternId, channelId) {
  const pat = project.patterns.find((p) => p.id === patternId);
  if (!pat) return [];
  return (pat.notes && pat.notes[channelId]) || [];
}

function withNotes(project, patternId, channelId, notes) {
  return {
    ...project,
    patterns: mapById(project.patterns, patternId, (p) => ({
      ...p,
      notes: { ...(p.notes || {}), [channelId]: notes },
    })),
  };
}

export function projectReducer(project, action) {
  switch (action.type) {
    case 'set':
      return normalizeProject(action.project);

    case 'patch': {
      const next = { ...project, ...action.patch };
      if (action.patch.sig) {
        next.barTicks = barTicksOf(next.sig);
        next.beatTicks = beatTicksOf(next.sig);
        next.patterns = next.patterns.map((p) => ({ ...p, barTicks: next.barTicks }));
      }
      return next;
    }

    case 'master':
      return { ...project, master: { ...project.master, ...action.patch } };

    /* ------------------------------------------------------------ channels */
    case 'channel.add': {
      const insert = project.inserts[project.channels.length % project.inserts.length];
      const ch = makeChannel(action.inst, action.name || action.inst, {
        color: COLORS[project.channels.length % COLORS.length],
        insert: insert ? insert.id : null,
      });
      return { ...project, channels: [...project.channels, ch], selectedChannel: ch.id };
    }
    case 'channel.clone': {
      const src = project.channels.find((c) => c.id === action.id);
      if (!src) return project;
      const copy = { ...src, id: uid('c'), name: `${src.name} #`, params: { ...src.params } };
      const idx = project.channels.findIndex((c) => c.id === action.id);
      const channels = [...project.channels];
      channels.splice(idx + 1, 0, copy);
      const patterns = project.patterns.map((p) => {
        const notes = (p.notes || {})[src.id];
        if (!notes || !notes.length) return p;
        return { ...p, notes: { ...p.notes, [copy.id]: notes.map((n) => ({ ...n, id: uid('n') })) } };
      });
      return { ...project, channels, patterns, selectedChannel: copy.id };
    }
    case 'channel.remove': {
      if (project.channels.length <= 1) return project;
      const channels = project.channels.filter((c) => c.id !== action.id);
      const patterns = project.patterns.map((p) => {
        if (!p.notes || !p.notes[action.id]) return p;
        const notes = { ...p.notes };
        delete notes[action.id];
        return { ...p, notes };
      });
      const selectedChannel = project.selectedChannel === action.id ? channels[0].id : project.selectedChannel;
      return { ...project, channels, patterns, selectedChannel };
    }
    case 'channel.update':
      return { ...project, channels: mapById(project.channels, action.id, (c) => ({ ...c, ...action.patch })) };
    case 'channel.param':
      return {
        ...project,
        channels: mapById(project.channels, action.id, (c) => ({
          ...c, params: { ...c.params, [action.key]: action.value },
        })),
      };
    case 'channel.move': {
      const idx = project.channels.findIndex((c) => c.id === action.id);
      const to = clamp(idx + action.dir, 0, project.channels.length - 1);
      if (idx < 0 || to === idx) return project;
      const channels = [...project.channels];
      const [it] = channels.splice(idx, 1);
      channels.splice(to, 0, it);
      return { ...project, channels };
    }
    case 'select.channel':
      return { ...project, selectedChannel: action.id };

    /* ------------------------------------------------------------ patterns */
    case 'pattern.add': {
      const pat = makePattern(action.name || `Pattern ${project.patterns.length + 1}`,
        action.bars || 1, COLORS[project.patterns.length % COLORS.length], project.barTicks || BAR_TICKS);
      return { ...project, patterns: [...project.patterns, pat], activePattern: pat.id };
    }
    case 'pattern.clone': {
      const src = project.patterns.find((p) => p.id === action.id);
      if (!src) return project;
      const notes = {};
      for (const [chId, list] of Object.entries(src.notes || {})) {
        notes[chId] = list.map((n) => ({ ...n, id: uid('n') }));
      }
      const copy = { ...src, id: uid('p'), name: `${src.name} copy`, notes };
      return { ...project, patterns: [...project.patterns, copy], activePattern: copy.id };
    }
    case 'pattern.remove': {
      if (project.patterns.length <= 1) return project;
      const patterns = project.patterns.filter((p) => p.id !== action.id);
      return {
        ...project,
        patterns,
        playlist: project.playlist.filter((c) => c.patternId !== action.id),
        activePattern: project.activePattern === action.id ? patterns[0].id : project.activePattern,
      };
    }
    case 'pattern.update':
      return { ...project, patterns: mapById(project.patterns, action.id, (p) => ({ ...p, ...action.patch })) };
    case 'pattern.select':
      return { ...project, activePattern: action.id };
    case 'pattern.clearChannel':
      return withNotes(project, action.patternId, action.channelId, []);

    /* --------------------------------------------------------------- notes */
    case 'notes.set':
      return withNotes(project, action.patternId, action.channelId, action.notes);
    case 'note.add':
      return withNotes(project, action.patternId, action.channelId,
        [...patternNotes(project, action.patternId, action.channelId), action.note]);
    case 'note.remove': {
      const ids = new Set(action.ids);
      return withNotes(project, action.patternId, action.channelId,
        patternNotes(project, action.patternId, action.channelId).filter((n) => !ids.has(n.id)));
    }
    case 'note.update':
      return withNotes(project, action.patternId, action.channelId,
        patternNotes(project, action.patternId, action.channelId)
          .map((n) => (n.id === action.id ? { ...n, ...action.patch } : n)));
    case 'step.toggle': {
      const notes = patternNotes(project, action.patternId, action.channelId);
      const from = action.step * STEP_TICKS;
      const to = from + STEP_TICKS;
      const hit = notes.filter((n) => n.t >= from && n.t < to);
      if (hit.length && action.force !== 'on') {
        const ids = new Set(hit.map((n) => n.id));
        return withNotes(project, action.patternId, action.channelId, notes.filter((n) => !ids.has(n.id)));
      }
      if (hit.length) return project;
      const note = makeNote(from, action.key == null ? 60 : action.key, STEP_TICKS, action.vel || 0.85);
      return withNotes(project, action.patternId, action.channelId, [...notes, note]);
    }

    case 'step.pitch': {
      // Set the pitch of the note(s) at one step — lets a melodic channel
      // (bass, lead…) play a chosen note per step instead of a fixed pitch.
      const notes = patternNotes(project, action.patternId, action.channelId);
      const from = action.step * STEP_TICKS;
      const to = from + STEP_TICKS;
      return withNotes(project, action.patternId, action.channelId,
        notes.map((n) => ((n.t >= from && n.t < to)
          ? { ...n, k: clamp(action.key != null ? action.key : n.k + (action.delta || 0), 0, 127) }
          : n)));
    }

    case 'notes.setMany':
      return {
        ...project,
        patterns: mapById(project.patterns, action.patternId, (p) => ({
          ...p, notes: { ...(p.notes || {}), ...action.byChannel },
        })),
      };
    case 'step.write': {
      const notes = patternNotes(project, action.patternId, action.channelId);
      const from = action.step * STEP_TICKS;
      const to = from + STEP_TICKS;
      const kept = notes.filter((n) => n.t < from || n.t >= to);
      return withNotes(project, action.patternId, action.channelId, [...kept, ...(action.notes || [])]);
    }

    /* ---------------------------------------------------------- midi import */
    case 'midi.import': {
      const kit = kitById(project.kit);
      const pattern = makePattern(action.name || 'MIDI', clamp(action.bars || 1, 1, 64),
        COLORS[project.patterns.length % COLORS.length], project.barTicks || BAR_TICKS);
      let channels = [...project.channels];
      const byRole = padChannels(project);
      const notes = {};

      const ensureRole = (role) => {
        const existing = byRole.get(role);
        if (existing) return existing.id;
        const spec = padSpec(kit, role);
        const info = roleInfo(role);
        if (!spec || !info) return null;
        const insert = project.inserts[channels.length % project.inserts.length];
        const ch = makeChannel(spec.inst, info.name, {
          color: spec.color || COLORS[channels.length % COLORS.length],
          role,
          choke: info.choke,
          insert: insert ? insert.id : null,
          params: spec.params,
        });
        channels.push(ch);
        byRole.set(role, ch);
        return ch.id;
      };

      for (const track of action.tracks) {
        if (track.isDrums) {
          for (const n of track.notes) {
            const role = GM_DRUMS[n.k];
            if (!role) continue;
            const id = ensureRole(role);
            if (!id) continue;
            notes[id] = [...(notes[id] || []), { ...n, k: 60 }];
          }
        } else {
          const insert = project.inserts[channels.length % project.inserts.length];
          const ch = makeChannel('osc3', (track.name || 'MIDI').slice(0, 22), {
            color: COLORS[channels.length % COLORS.length],
            insert: insert ? insert.id : null,
          });
          channels.push(ch);
          notes[ch.id] = track.notes;
        }
      }
      pattern.notes = notes;
      return {
        ...project,
        bpm: action.bpm ? clamp(action.bpm, 20, 300) : project.bpm,
        channels,
        patterns: [...project.patterns, pattern],
        activePattern: pattern.id,
      };
    }

    case 'sound.add': {
      const sound = action.sound;
      const insert = project.inserts[project.channels.length % project.inserts.length];
      const ch = makeChannel(sound.inst, action.name || sound.name, {
        color: soundColor(sound, project.channels.length),
        insert: insert ? insert.id : null,
        params: sound.params,
        role: action.role || null,
        choke: action.choke || 0,
      });
      return { ...project, channels: [...project.channels, ch], selectedChannel: ch.id };
    }

    /* ------------------------------------------------------------- samples */
    case 'sample.add': {
      const samples = { ...(project.samples || {}), [action.sample.id]: action.sample };
      if (action.newChannel) {
        const insert = project.inserts[project.channels.length % project.inserts.length];
        const ch = makeChannel('sampler', action.sample.name.replace(/\.[^.]+$/, '').slice(0, 22), {
          color: COLORS[project.channels.length % COLORS.length],
          insert: insert ? insert.id : null,
          sampleId: action.sample.id,
        });
        return { ...project, samples, channels: [...project.channels, ch], selectedChannel: ch.id };
      }
      return {
        ...project,
        samples,
        channels: mapById(project.channels, action.channelId, (c) => ({
          ...c,
          inst: 'sampler',
          sampleId: action.sample.id,
          params: c.inst === 'sampler' ? c.params : { ...defaultParams('sampler') },
        })),
      };
    }
    case 'sample.remove': {
      const samples = { ...(project.samples || {}) };
      delete samples[action.sampleId];
      return {
        ...project,
        samples,
        channels: project.channels.map((c) => (c.sampleId === action.sampleId ? { ...c, sampleId: null } : c)),
      };
    }

    /* ---------------------------------------------------------- automation */
    case 'auto.add': {
      const lane = makeLane(action.target, action.label, action.color);
      return {
        ...project,
        patterns: mapById(project.patterns, action.patternId, (p) => ({
          ...p, automation: [...(p.automation || []), lane],
        })),
      };
    }
    case 'auto.remove':
      return {
        ...project,
        patterns: mapById(project.patterns, action.patternId, (p) => ({
          ...p, automation: (p.automation || []).filter((l) => l.id !== action.laneId),
        })),
      };
    case 'auto.points':
      return {
        ...project,
        patterns: mapById(project.patterns, action.patternId, (p) => ({
          ...p,
          automation: mapById(p.automation || [], action.laneId, (l) => ({ ...l, points: sortPoints(action.points) })),
        })),
      };
    case 'auto.update':
      return {
        ...project,
        patterns: mapById(project.patterns, action.patternId, (p) => ({
          ...p, automation: mapById(p.automation || [], action.laneId, (l) => ({ ...l, ...action.patch })),
        })),
      };

    /* -------------------------------------------------------- drum machine */
    case 'kit.apply': {
      const kit = kitById(action.kitId);
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
            ...ch,
            inst,
            role,
            choke: info.choke,
            color,
            params: { ...defaultParams(inst), ...params },
          } : ch));
        } else {
          const insert = project.inserts[(channels.length + added.length) % project.inserts.length];
          added.push(makeChannel(inst, info.name, {
            color, role, choke: info.choke, insert: insert ? insert.id : null, params,
          }));
        }
      });
      return { ...project, channels: [...channels, ...added], kit: kit.id };
    }

    /* ------------------------------------------------------------ playlist */
    case 'clip.add': {
      const pat = project.patterns.find((p) => p.id === action.patternId);
      const len = action.length || (pat ? patternTicks(pat) : STEP_TICKS * 16);
      const clip = {
        id: uid('cl'), patternId: action.patternId, track: action.track, start: Math.max(0, action.start), length: len,
      };
      return { ...project, playlist: [...project.playlist, clip] };
    }
    case 'clip.update':
      return { ...project, playlist: mapById(project.playlist, action.id, (c) => ({ ...c, ...action.patch })) };
    case 'clip.remove':
      return { ...project, playlist: project.playlist.filter((c) => c.id !== action.id) };
    case 'clip.clear':
      return { ...project, playlist: [] };
    case 'track.mute':
      return { ...project, trackMute: { ...(project.trackMute || {}), [action.track]: !(project.trackMute && project.trackMute[action.track]) } };
    case 'track.solo':
      return { ...project, trackSolo: { ...(project.trackSolo || {}), [action.track]: !(project.trackSolo && project.trackSolo[action.track]) } };
    case 'automation.record': {
      // Live automation write: add a normalised point at the playhead into the
      // target's lane (creating the lane if needed). Kept out of undo history.
      const pat = project.patterns.find((p) => p.id === project.activePattern);
      if (!pat) return project;
      const lanes = pat.automation || [];
      const t = Math.max(0, Math.round(action.tick));
      const v = clamp(action.value, 0, 1);
      const write = (pts) => sortPoints([...pts.filter((pp) => Math.abs(pp.t - t) > 3), { t, v }]);
      const exists = lanes.some((l) => l.target === action.target);
      const nextLanes = exists
        ? lanes.map((l) => (l.target === action.target ? { ...l, points: write(l.points) } : l))
        : [...lanes, { ...makeLane(action.target, action.label || action.target, action.color || '#4dabf7'), points: write([{ t: 0, v }]) }];
      return { ...project, patterns: mapById(project.patterns, project.activePattern, (p) => ({ ...p, automation: nextLanes })) };
    }
    case 'track.rename':
      return { ...project, trackNames: { ...(project.trackNames || {}), [action.track]: action.name } };
    case 'marker.add':
      return { ...project, markers: [...(project.markers || []), { id: uid('mk'), tick: Math.max(0, action.tick), name: action.name || `Marker ${(project.markers || []).length + 1}` }] };
    case 'marker.update':
      return { ...project, markers: (project.markers || []).map((m) => (m.id === action.id ? { ...m, ...action.patch } : m)) };
    case 'marker.remove':
      return { ...project, markers: (project.markers || []).filter((m) => m.id !== action.id) };
    case 'clip.split': {
      const clip = project.playlist.find((c) => c.id === action.id);
      if (!clip) return project;
      const at = action.at;
      if (at <= clip.start || at >= clip.start + clip.length) return project;
      const first = { ...clip, length: at - clip.start };
      const second = { ...clip, id: uid('cl'), start: at, length: clip.start + clip.length - at };
      return { ...project, playlist: [...project.playlist.filter((c) => c.id !== clip.id), first, second] };
    }

    /* -------------------------------------------------------------- mixer */
    case 'insert.update':
      return { ...project, inserts: mapById(project.inserts, action.id, (i) => ({ ...i, ...action.patch })) };
    case 'insert.add':
      return { ...project, inserts: [...project.inserts, makeInsert(project.inserts.length + 1)] };
    case 'select.insert':
      return { ...project, selectedInsert: action.id };
    case 'master.preset': {
      const chain = (action.chain || []).map((c) => ({ ...makeFx(c.type), params: { ...defaultFxParams(c.type), ...c.params } }));
      return { ...project, master: { ...project.master, chain, preset: action.presetId, target: action.target } };
    }
    case 'send.set':
      return {
        ...project,
        inserts: mapById(project.inserts, action.insertId, (i) => {
          const sends = (i.sends || []).filter((sd) => sd.to !== action.to);
          if (action.amount > 0.001) sends.push({ to: action.to, amount: action.amount });
          return { ...i, sends };
        }),
      };
    case 'fx.add':
      if (action.insertId === 'master') {
        return {
          ...project,
          master: { ...project.master, chain: [...(project.master.chain || []), makeFx(action.fxType)] },
        };
      }
      return {
        ...project,
        inserts: mapById(project.inserts, action.insertId, (i) => ({ ...i, fx: [...(i.fx || []), makeFx(action.fxType)] })),
      };
    case 'fx.remove':
      if (action.insertId === 'master') {
        return {
          ...project,
          master: { ...project.master, chain: (project.master.chain || []).filter((f) => f.id !== action.fxId) },
        };
      }
      return {
        ...project,
        inserts: mapById(project.inserts, action.insertId, (i) => ({ ...i, fx: (i.fx || []).filter((f) => f.id !== action.fxId) })),
      };
    case 'fx.update':
      if (action.insertId === 'master') {
        return {
          ...project,
          master: { ...project.master, chain: mapById(project.master.chain || [], action.fxId, (f) => ({ ...f, ...action.patch })) },
        };
      }
      return {
        ...project,
        inserts: mapById(project.inserts, action.insertId, (i) => ({
          ...i, fx: mapById(i.fx || [], action.fxId, (f) => ({ ...f, ...action.patch })),
        })),
      };
    case 'fx.param':
      if (action.insertId === 'master') {
        return {
          ...project,
          master: {
            ...project.master,
            chain: mapById(project.master.chain || [], action.fxId, (f) => ({
              ...f, params: { ...f.params, [action.key]: action.value },
            })),
          },
        };
      }
      return {
        ...project,
        inserts: mapById(project.inserts, action.insertId, (i) => ({
          ...i,
          fx: mapById(i.fx || [], action.fxId, (f) => ({ ...f, params: { ...f.params, [action.key]: action.value } })),
        })),
      };

    default:
      return project;
  }
}

export function historyReducer(state, action) {
  if (action.type === 'undo') {
    if (!state.past.length) return state;
    const past = [...state.past];
    const prev = past.pop();
    return { project: prev, past, future: [state.project, ...state.future].slice(0, HISTORY), liveKey: null };
  }
  if (action.type === 'redo') {
    if (!state.future.length) return state;
    const [next, ...future] = state.future;
    return { project: next, past: [...state.past, state.project].slice(-HISTORY), future, liveKey: null };
  }
  const project = projectReducer(state.project, action);
  if (project === state.project) return state;
  if (NO_HISTORY.has(action.type)) return { ...state, project };

  const liveKey = action.live
    ? (action.gesture || `${action.type}:${action.id || ''}:${action.key || ''}:${action.fxId || ''}`)
    : null;
  if (liveKey && state.liveKey === liveKey) return { ...state, project };
  return {
    project,
    past: [...state.past, state.project].slice(-HISTORY),
    future: [],
    liveKey,
  };
}

export const initHistory = (project) => ({ project, past: [], future: [], liveKey: null });
