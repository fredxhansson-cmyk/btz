// Low level Web Audio helpers shared by the live engine and the offline renderer.
import { clamp } from '../constants';

const noiseCache = new WeakMap();

/** Deterministic-ish white noise buffer, cached per AudioContext. */
export function noiseBuffer(ctx, seconds = 2) {
  let map = noiseCache.get(ctx);
  if (!map) { map = new Map(); noiseCache.set(ctx, map); }
  const key = seconds;
  if (map.has(key)) return map.get(key);
  const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let seed = 22222;
  for (let i = 0; i < len; i++) {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    d[i] = (seed / 2147483648) - 1;
  }
  map.set(key, buf);
  return buf;
}

export function noiseSource(ctx, seconds = 2) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, seconds);
  src.loop = true;
  return src;
}

const curveCache = new Map();
/** Soft-clipping curve. amount 0..1 */
export function distortionCurve(amount) {
  const a = clamp(amount, 0, 0.999);
  const key = Math.round(a * 200);
  if (curveCache.has(key)) return curveCache.get(key);
  const k = (2 * a) / (1 - a);
  const n = 1024;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
  }
  curveCache.set(key, curve);
  return curve;
}

/** Generated impulse response for the reverb unit. */
export function impulseResponse(ctx, seconds = 2.2, decay = 3, spread = 1) {
  const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let seed = 9301 + ch * 4931;
    for (let i = 0; i < len; i++) {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      const r = (seed / 1073741824) - 1;
      const early = i < ctx.sampleRate * 0.01 ? 1 : spread;
      d[i] = r * Math.pow(1 - i / len, decay) * early;
    }
  }
  return buf;
}

/**
 * Schedules an ADSR on a gain AudioParam.
 * `dur` is the note length in seconds; pass Infinity for a held (live) note.
 * Returns the time the voice can safely be disposed.
 */
export function applyADSR(param, t, peak, env, dur) {
  const a = Math.max(0.001, env.attack);
  const d = Math.max(0.001, env.decay);
  const s = clamp(env.sustain, 0, 1);
  const r = Math.max(0.005, env.release);
  const sus = Math.max(0.0001, peak * s);
  param.setValueAtTime(0.0001, t);
  param.linearRampToValueAtTime(Math.max(0.0001, peak), t + a);
  param.exponentialRampToValueAtTime(sus, t + a + d);
  if (!isFinite(dur)) return Infinity;
  const off = Math.max(t + a + 0.002, t + dur);
  param.setValueAtTime(Math.max(0.0001, valueAt(peak, s, a, d, dur)), off);
  param.exponentialRampToValueAtTime(0.0001, off + r);
  return off + r + 0.02;
}

/** Analytic envelope value at `time` seconds after note-on (for correct releases). */
export function valueAt(peak, sustain, a, d, time) {
  if (time <= a) return Math.max(0.0001, (peak * time) / a);
  const sus = Math.max(0.0001, peak * sustain);
  if (time >= a + d) return sus;
  const k = (time - a) / d;
  return Math.max(0.0001, peak * Math.pow(sus / Math.max(0.0001, peak), k));
}

/** Release a held voice at time `t`. */
export function releaseADSR(param, t, release, currentGuess) {
  const r = Math.max(0.005, release);
  try {
    if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(t);
    else {
      param.cancelScheduledValues(t);
      param.setValueAtTime(Math.max(0.0001, currentGuess), t);
    }
  } catch (e) {
    param.cancelScheduledValues(t);
    param.setValueAtTime(Math.max(0.0001, currentGuess), t);
  }
  param.exponentialRampToValueAtTime(0.0001, t + r);
  return t + r + 0.02;
}

/** Stops and disconnects a list of nodes at `time`. */
export function stopAll(nodes, time) {
  for (const n of nodes) {
    try { n.stop(time); } catch (e) { /* not a source */ }
  }
}

export function equalPowerPan(ctx) {
  const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  if (p) return p;
  const panner = ctx.createPanner();
  panner.panningModel = 'equalpower';
  return panner;
}
