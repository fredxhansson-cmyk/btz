// Single reducer over the whole project + undo/redo history.
import { STEP_TICKS, clamp, COLORS, uid } from './constants';
import { makeChannel, makePattern, makeFx, makeInsert, makeNote, normalizeProject } from './project';
import { patternTicks } from './sequencer';
import { ROLE_IDS, kitById, padChannels, roleInfo } from './drums';
import { makeLane, sortPoints } from './automation';
import { defaultParams } from './audio/instruments';

const HISTORY = 80;
const NO_HISTORY = new Set([
  'set', 'select.channel', 'select.insert', 'pattern.select', 'undo', 'redo', 'transport',
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

    case 'patch':
      return { ...project, ...action.patch };

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
        action.bars || 1, COLORS[project.patterns.length % COLORS.length]);
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
        const spec = kit.pads[role];
        if (!spec) return;
        const [inst, params, colorIdx] = spec;
        const info = roleInfo(role);
        const color = COLORS[colorIdx % COLORS.length];
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

    /* -------------------------------------------------------------- mixer */
    case 'insert.update':
      return { ...project, inserts: mapById(project.inserts, action.id, (i) => ({ ...i, ...action.patch })) };
    case 'insert.add':
      return { ...project, inserts: [...project.inserts, makeInsert(project.inserts.length + 1)] };
    case 'select.insert':
      return { ...project, selectedInsert: action.id };
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
      return {
        ...project,
        inserts: mapById(project.inserts, action.insertId, (i) => ({ ...i, fx: [...(i.fx || []), makeFx(action.fxType)] })),
      };
    case 'fx.remove':
      return {
        ...project,
        inserts: mapById(project.inserts, action.insertId, (i) => ({ ...i, fx: (i.fx || []).filter((f) => f.id !== action.fxId) })),
      };
    case 'fx.update':
      return {
        ...project,
        inserts: mapById(project.inserts, action.insertId, (i) => ({
          ...i, fx: mapById(i.fx || [], action.fxId, (f) => ({ ...f, ...action.patch })),
        })),
      };
    case 'fx.param':
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
