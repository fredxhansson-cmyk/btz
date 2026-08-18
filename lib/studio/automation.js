// Automation lanes: parameter curves stored per pattern.
// A lane targets a mixer/channel parameter, an effect parameter or an
// instrument parameter, and holds normalised (0..1) points over pattern time.
import { clamp, uid } from './constants';
import { INSTRUMENTS } from './audio/instruments';
import { EFFECTS } from './audio/effects';

export const AUTO_STEP = 4;   // ticks between automation updates (~20 ms)

export const makeLane = (targetId, label, color = '#4dabf7') => ({
  id: uid('al'),
  target: targetId,
  label,
  color,
  points: [{ t: 0, v: 0.5 }],
});

const MIX_SPECS = {
  vol: { min: 0, max: 1.2, def: 0.8, label: 'Volume' },
  pan: { min: -1, max: 1, def: 0, label: 'Pan' },
};

/** Every parameter that can be automated in the current project. */
export function listTargets(project) {
  const out = [];
  out.push({ id: 'mix|master||vol', group: 'Master', label: 'Master – Volume', spec: { min: 0, max: 1.4, def: 0.75 } });
  for (const ch of project.channels) {
    out.push({ id: `mix|channel|${ch.id}|vol`, group: 'Channels', label: `${ch.name} – Volume`, spec: MIX_SPECS.vol });
    out.push({ id: `mix|channel|${ch.id}|pan`, group: 'Channels', label: `${ch.name} – Pan`, spec: MIX_SPECS.pan });
    const inst = INSTRUMENTS[ch.inst];
    if (inst) {
      for (const [key, spec] of Object.entries(inst.params)) {
        if (spec.kind === 'choice') continue;
        out.push({
          id: `param|${ch.id}||${key}`,
          group: 'Instrument',
          label: `${ch.name} – ${spec.label}`,
          spec,
          perNote: true,
        });
      }
    }
  }
  for (const ins of project.inserts) {
    out.push({ id: `mix|insert|${ins.id}|vol`, group: 'Mixer', label: `${ins.name} – Volume`, spec: MIX_SPECS.vol });
    out.push({ id: `mix|insert|${ins.id}|pan`, group: 'Mixer', label: `${ins.name} – Pan`, spec: MIX_SPECS.pan });
    for (const slot of ins.fx || []) {
      const def = EFFECTS[slot.type];
      if (!def) continue;
      for (const [key, spec] of Object.entries(def.params)) {
        if (spec.kind === 'choice') continue;
        out.push({
          id: `fx|${ins.id}|${slot.id}|${key}`,
          group: 'Effects',
          label: `${ins.name} · ${def.name} – ${spec.label}`,
          spec,
        });
      }
    }
  }
  return out;
}

export function findTarget(project, id) {
  return listTargets(project).find((t) => t.id === id) || null;
}

export const parseTarget = (id) => {
  const [kind, a, b, param] = String(id).split('|');
  return { kind, a, b, param };
};

/** Normalised 0..1 -> real parameter value. */
export function denorm(spec, v) {
  if (!spec) return v;
  const n = clamp(v, 0, 1);
  if (spec.curve === 'log') {
    const lo = Math.log(Math.max(1e-4, spec.min));
    const hi = Math.log(Math.max(1e-3, spec.max));
    return Math.exp(lo + (hi - lo) * n);
  }
  return spec.min + (spec.max - spec.min) * n;
}

export function norm(spec, value) {
  if (!spec) return value;
  if (spec.curve === 'log') {
    const lo = Math.log(Math.max(1e-4, spec.min));
    const hi = Math.log(Math.max(1e-3, spec.max));
    return clamp((Math.log(Math.max(1e-4, value)) - lo) / (hi - lo), 0, 1);
  }
  return clamp((value - spec.min) / (spec.max - spec.min), 0, 1);
}

/** Linear interpolation between points, holding the ends. */
export function valueAt(points, tick) {
  if (!points || !points.length) return null;
  const sorted = points;
  if (tick <= sorted[0].t) return sorted[0].v;
  const last = sorted[sorted.length - 1];
  if (tick >= last.t) return last.v;
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1];
    const b = sorted[i];
    if (tick <= b.t) {
      const span = b.t - a.t;
      if (span <= 0) return b.v;
      return a.v + ((b.v - a.v) * (tick - a.t)) / span;
    }
  }
  return last.v;
}

export const sortPoints = (points) => [...points].sort((a, b) => a.t - b.t);

/** Generates a shape across `length` ticks — used by the LFO fill buttons. */
export function shapePoints(shape, length, cycles = 4, lo = 0, hi = 1) {
  const pts = [];
  const per = Math.max(1, Math.round(length / Math.max(1, cycles)));
  if (shape === 'up' || shape === 'down') {
    return shape === 'up'
      ? [{ t: 0, v: lo }, { t: length, v: hi }]
      : [{ t: 0, v: hi }, { t: length, v: lo }];
  }
  for (let c = 0; c < cycles; c++) {
    const t0 = c * per;
    if (shape === 'saw') {
      pts.push({ t: t0, v: hi }, { t: t0 + per - 1, v: lo });
    } else if (shape === 'square') {
      pts.push({ t: t0, v: hi }, { t: t0 + per / 2 - 1, v: hi }, { t: t0 + per / 2, v: lo }, { t: t0 + per - 1, v: lo });
    } else if (shape === 'pump') {
      pts.push({ t: t0, v: lo }, { t: t0 + per * 0.55, v: hi }, { t: t0 + per - 1, v: hi });
    } else {
      const steps = 8;
      for (let i = 0; i <= steps; i++) {
        const ph = i / steps;
        pts.push({ t: Math.round(t0 + ph * per), v: lo + (hi - lo) * (0.5 - 0.5 * Math.cos(ph * Math.PI * 2)) });
      }
    }
  }
  pts.push({ t: length, v: pts[pts.length - 1].v });
  return sortPoints(pts.map((p) => ({ t: Math.max(0, Math.round(p.t)), v: clamp(p.v, 0, 1) })));
}
