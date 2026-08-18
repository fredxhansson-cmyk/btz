// Instrument (generator) definitions. Every instrument is a pure factory that
// renders one voice into `out` at an absolute AudioContext time, so the same
// code drives both realtime playback and the offline WAV renderer.
import { midiToFreq, clamp } from '../constants';
import { noiseSource, distortionCurve, applyADSR, releaseADSR, valueAt, stopAll } from './dsp';

const f = (label, min, max, def, opts = {}) => ({ label, min, max, def, kind: 'float', ...opts });
const choice = (label, options, def) => ({ label, options, def, kind: 'choice' });

const WAVES = ['sine', 'triangle', 'sawtooth', 'square'];

function shaper(ctx, amount) {
  if (amount <= 0.001) return null;
  const ws = ctx.createWaveShaper();
  ws.curve = distortionCurve(amount);
  ws.oversample = '2x';
  return ws;
}

/** Connects src -> [optional shaper] -> out and returns the head node to feed. */
function driveChain(ctx, out, amount) {
  const ws = shaper(ctx, amount);
  if (!ws) return out;
  const trim = ctx.createGain();
  trim.gain.value = 1 / (1 + amount * 1.4);
  ws.connect(trim);
  trim.connect(out);
  return ws;
}

function percEnv(ctx, t, peak, decay, hold = 0.0015) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(Math.max(0.0001, peak), t + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t + hold + Math.max(0.01, decay));
  return g;
}

/* ------------------------------------------------------------------ drums */

const kick = {
  id: 'kick', name: 'FlowKick', cat: 'Drums', poly: false, color: '#ff6b6b',
  params: {
    tune: f('Tune', 25, 120, 48, { unit: 'Hz' }),
    punch: f('Punch', 1, 16, 7),
    pitchDecay: f('Pitch Dec', 0.005, 0.3, 0.045, { unit: 's' }),
    decay: f('Decay', 0.05, 2, 0.42, { unit: 's' }),
    click: f('Click', 0, 1, 0.25),
    drive: f('Drive', 0, 0.95, 0.2),
  },
  play(ctx, out, ev, p) {
    const t = ev.time;
    const head = driveChain(ctx, out, p.drive);
    const base = clamp(p.tune * Math.pow(2, (ev.key - 60) / 12), 15, 400);
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(base * p.punch, t);
    osc.frequency.exponentialRampToValueAtTime(base, t + p.pitchDecay);
    const amp = percEnv(ctx, t, ev.vel, p.decay, 0.003);
    osc.connect(amp); amp.connect(head);
    osc.start(t); osc.stop(t + p.decay + 0.1);
    if (p.click > 0.001) {
      const n = noiseSource(ctx, 0.5);
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1200;
      const cg = percEnv(ctx, t, ev.vel * p.click * 0.6, 0.012, 0.001);
      n.connect(hp); hp.connect(cg); cg.connect(head);
      n.start(t); n.stop(t + 0.06);
    }
    return null;
  },
};

const snare = {
  id: 'snare', name: 'FlowSnare', cat: 'Drums', poly: false, color: '#ffa94d',
  params: {
    tune: f('Tune', 90, 400, 190, { unit: 'Hz' }),
    tone: f('Tone', 0, 1, 0.45),
    decay: f('Decay', 0.03, 1.2, 0.22, { unit: 's' }),
    snap: f('Snap', 200, 8000, 1900, { unit: 'Hz' }),
    width: f('Width', 0.3, 12, 2.4, { unit: 'Q' }),
    drive: f('Drive', 0, 0.95, 0.12),
  },
  play(ctx, out, ev, p) {
    const t = ev.time;
    const head = driveChain(ctx, out, p.drive);
    const base = clamp(p.tune * Math.pow(2, (ev.key - 60) / 12), 40, 2000);
    const body = ctx.createOscillator();
    body.type = 'triangle';
    body.frequency.setValueAtTime(base * 1.6, t);
    body.frequency.exponentialRampToValueAtTime(base, t + 0.03);
    const bg = percEnv(ctx, t, ev.vel * p.tone, p.decay * 0.6);
    body.connect(bg); bg.connect(head);
    body.start(t); body.stop(t + p.decay + 0.1);

    const n = noiseSource(ctx, 1);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = p.snap; bp.Q.value = p.width;
    const ng = percEnv(ctx, t, ev.vel * (1.1 - p.tone * 0.5), p.decay);
    n.connect(bp); bp.connect(ng); ng.connect(head);
    n.start(t); n.stop(t + p.decay + 0.1);
    return null;
  },
};

const clap = {
  id: 'clap', name: 'FlowClap', cat: 'Drums', poly: false, color: '#ffd43b',
  params: {
    freq: f('Colour', 400, 4000, 1150, { unit: 'Hz' }),
    width: f('Width', 0.5, 12, 2.2, { unit: 'Q' }),
    spread: f('Spread', 0.004, 0.05, 0.012, { unit: 's' }),
    decay: f('Decay', 0.05, 1.2, 0.28, { unit: 's' }),
  },
  play(ctx, out, ev, p) {
    const t = ev.time;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = p.freq; bp.Q.value = p.width;
    bp.connect(out);
    for (let i = 0; i < 3; i++) {
      const n = noiseSource(ctx, 1);
      const g = percEnv(ctx, t + i * p.spread, ev.vel * 0.7, 0.02, 0.001);
      n.connect(g); g.connect(bp);
      n.start(t + i * p.spread); n.stop(t + i * p.spread + 0.05);
    }
    const tail = noiseSource(ctx, 1);
    const tg = percEnv(ctx, t + 3 * p.spread, ev.vel * 0.85, p.decay, 0.002);
    tail.connect(tg); tg.connect(bp);
    tail.start(t + 3 * p.spread); tail.stop(t + p.decay + 0.2);
    return null;
  },
};

const HAT_RATIOS = [2, 3, 4.16, 5.43, 6.79, 8.21];
const hat = {
  id: 'hat', name: 'FlowHat', cat: 'Drums', poly: false, color: '#a9e34b',
  params: {
    tune: f('Tune', 20, 120, 40, { unit: 'Hz' }),
    hpf: f('HPF', 2000, 12000, 7200, { unit: 'Hz' }),
    decay: f('Decay', 0.01, 1.5, 0.07, { unit: 's' }),
    metal: f('Metal', 0, 1, 0.7),
  },
  play(ctx, out, ev, p) {
    const t = ev.time;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = p.hpf;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass';
    bp.frequency.value = clamp(p.hpf * 1.4, 200, 18000); bp.Q.value = 1.2;
    const g = percEnv(ctx, t, ev.vel * 0.6, p.decay, 0.001);
    hp.connect(bp); bp.connect(g); g.connect(out);
    const base = p.tune * Math.pow(2, (ev.key - 60) / 12);
    const stopT = t + p.decay + 0.1;
    for (const r of HAT_RATIOS) {
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = clamp(base * r, 30, 18000);
      const og = ctx.createGain(); og.gain.value = p.metal / HAT_RATIOS.length;
      o.connect(og); og.connect(hp);
      o.start(t); o.stop(stopT);
    }
    if (p.metal < 1) {
      const n = noiseSource(ctx, 1);
      const ng = ctx.createGain(); ng.gain.value = (1 - p.metal) * 0.8;
      n.connect(ng); ng.connect(hp);
      n.start(t); n.stop(stopT);
    }
    return null;
  },
};

const tom = {
  id: 'tom', name: 'FlowTom', cat: 'Drums', poly: false, color: '#4dd4ac',
  params: {
    tune: f('Tune', 50, 400, 130, { unit: 'Hz' }),
    bend: f('Bend', 1, 4, 1.6),
    decay: f('Decay', 0.05, 2, 0.45, { unit: 's' }),
    noise: f('Noise', 0, 1, 0.15),
  },
  play(ctx, out, ev, p) {
    const t = ev.time;
    const base = clamp(p.tune * Math.pow(2, (ev.key - 60) / 12), 30, 1200);
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(base * p.bend, t);
    o.frequency.exponentialRampToValueAtTime(base, t + p.decay * 0.5);
    const g = percEnv(ctx, t, ev.vel, p.decay);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + p.decay + 0.1);
    if (p.noise > 0.001) {
      const n = noiseSource(ctx, 1);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = base * 6;
      const ng = percEnv(ctx, t, ev.vel * p.noise * 0.5, p.decay * 0.3);
      n.connect(lp); lp.connect(ng); ng.connect(out);
      n.start(t); n.stop(t + p.decay + 0.1);
    }
    return null;
  },
};

const perc = {
  id: 'perc', name: 'FlowPerc', cat: 'Drums', poly: false, color: '#66d9e8',
  params: {
    tune: f('Tune', 200, 3000, 1150, { unit: 'Hz' }),
    ratio: f('Ratio', 1, 4, 1.48),
    decay: f('Decay', 0.01, 0.6, 0.09, { unit: 's' }),
    noise: f('Noise', 0, 1, 0.1),
  },
  play(ctx, out, ev, p) {
    const t = ev.time;
    const base = clamp(p.tune * Math.pow(2, (ev.key - 60) / 12), 80, 8000);
    for (const mul of [1, p.ratio]) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = clamp(base * mul, 40, 16000);
      const g = percEnv(ctx, t, ev.vel * 0.55, p.decay, 0.001);
      o.connect(g); g.connect(out);
      o.start(t); o.stop(t + p.decay + 0.05);
    }
    if (p.noise > 0.001) {
      const n = noiseSource(ctx, 1);
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = base;
      const ng = percEnv(ctx, t, ev.vel * p.noise * 0.5, p.decay * 0.5, 0.001);
      n.connect(hp); hp.connect(ng); ng.connect(out);
      n.start(t); n.stop(t + p.decay + 0.05);
    }
    return null;
  },
};

/* ---------------------------------------------------------------- synths */

const osc3 = {
  id: 'osc3', name: 'Triple Osc', cat: 'Synth', poly: true, color: '#748ffc',
  params: {
    wave1: choice('OSC1 Shape', WAVES, 'sawtooth'),
    coarse1: f('OSC1 Coarse', -24, 24, 0, { step: 1, unit: 'st' }),
    fine1: f('OSC1 Fine', -100, 100, 0, { unit: 'ct' }),
    lvl1: f('OSC1 Level', 0, 1, 1),
    wave2: choice('OSC2 Shape', WAVES, 'sawtooth'),
    coarse2: f('OSC2 Coarse', -24, 24, 0, { step: 1, unit: 'st' }),
    fine2: f('OSC2 Fine', -100, 100, 9, { unit: 'ct' }),
    lvl2: f('OSC2 Level', 0, 1, 0.75),
    wave3: choice('OSC3 Shape', WAVES, 'square'),
    coarse3: f('OSC3 Coarse', -24, 24, -12, { step: 1, unit: 'st' }),
    fine3: f('OSC3 Fine', -100, 100, -7, { unit: 'ct' }),
    lvl3: f('OSC3 Level', 0, 1, 0.45),
    cutoff: f('Cutoff', 40, 18000, 3200, { unit: 'Hz', curve: 'log' }),
    res: f('Reso', 0.1, 22, 3),
    envAmt: f('Filter Env', -4, 5, 1.8, { unit: 'oct' }),
    fdecay: f('Filter Dec', 0.02, 3, 0.35, { unit: 's' }),
    attack: f('Attack', 0.001, 2, 0.006, { unit: 's' }),
    decay: f('Decay', 0.01, 3, 0.35, { unit: 's' }),
    sustain: f('Sustain', 0, 1, 0.65),
    release: f('Release', 0.01, 4, 0.25, { unit: 's' }),
    drive: f('Drive', 0, 0.95, 0),
  },
  play(ctx, out, ev, p) {
    const t = ev.time;
    const head = driveChain(ctx, out, p.drive);
    const amp = ctx.createGain();
    amp.gain.value = 0.0001;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.Q.value = p.res;
    const co = clamp(p.cutoff, 30, 19000);
    const peakF = clamp(co * Math.pow(2, p.envAmt), 30, 19000);
    filt.frequency.setValueAtTime(peakF, t);
    filt.frequency.exponentialRampToValueAtTime(co, t + p.fdecay);
    filt.connect(amp); amp.connect(head);

    const oscs = [];
    for (let i = 1; i <= 3; i++) {
      const lvl = p[`lvl${i}`];
      if (lvl <= 0.001) continue;
      const o = ctx.createOscillator();
      o.type = p[`wave${i}`];
      o.frequency.value = midiToFreq(ev.key);
      o.detune.value = p[`coarse${i}`] * 100 + p[`fine${i}`];
      const g = ctx.createGain();
      g.gain.value = lvl * 0.3;
      o.connect(g); g.connect(filt);
      o.start(t);
      oscs.push(o);
    }
    const env = { attack: p.attack, decay: p.decay, sustain: p.sustain, release: p.release };
    const end = applyADSR(amp.gain, t, ev.vel * 0.8, env, ev.dur);
    if (isFinite(end)) stopAll(oscs, end);
    return {
      release(rt) {
        const el = Math.max(0, rt - t);
        const guess = valueAt(ev.vel * 0.8, p.sustain, p.attack, p.decay, el);
        const done = releaseADSR(amp.gain, rt, p.release, guess);
        stopAll(oscs, done);
      },
    };
  },
};

const fm = {
  id: 'fm', name: 'FlowFM', cat: 'Synth', poly: true, color: '#b197fc',
  params: {
    ratio: f('Ratio', 0.25, 12, 2, { step: 0.25 }),
    index: f('Index', 0, 24, 5),
    idecay: f('Idx Decay', 0.01, 3, 0.35, { unit: 's' }),
    feedback: f('Fine', -50, 50, 0, { unit: 'ct' }),
    attack: f('Attack', 0.001, 2, 0.004, { unit: 's' }),
    decay: f('Decay', 0.01, 3, 0.5, { unit: 's' }),
    sustain: f('Sustain', 0, 1, 0.4, {}),
    release: f('Release', 0.01, 4, 0.3, { unit: 's' }),
    cutoff: f('Cutoff', 40, 18000, 12000, { unit: 'Hz', curve: 'log' }),
  },
  play(ctx, out, ev, p) {
    const t = ev.time;
    const freq = midiToFreq(ev.key);
    const amp = ctx.createGain(); amp.gain.value = 0.0001;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = clamp(p.cutoff, 30, 19000);
    const car = ctx.createOscillator(); car.type = 'sine';
    car.frequency.value = freq; car.detune.value = p.feedback;
    const mod = ctx.createOscillator(); mod.type = 'sine';
    mod.frequency.value = freq * p.ratio;
    const mg = ctx.createGain();
    mg.gain.setValueAtTime(freq * p.index, t);
    mg.gain.exponentialRampToValueAtTime(Math.max(0.01, freq * p.index * 0.05), t + p.idecay);
    mod.connect(mg); mg.connect(car.frequency);
    car.connect(lp); lp.connect(amp); amp.connect(out);
    car.start(t); mod.start(t);
    const env = { attack: p.attack, decay: p.decay, sustain: p.sustain, release: p.release };
    const end = applyADSR(amp.gain, t, ev.vel * 0.8, env, ev.dur);
    if (isFinite(end)) stopAll([car, mod], end);
    return {
      release(rt) {
        const guess = valueAt(ev.vel * 0.8, p.sustain, p.attack, p.decay, Math.max(0, rt - t));
        const done = releaseADSR(amp.gain, rt, p.release, guess);
        stopAll([car, mod], done);
      },
    };
  },
};

const pluck = {
  id: 'pluck', name: 'FlowPluck', cat: 'Synth', poly: true, color: '#f783ac',
  params: {
    wave: choice('Shape', WAVES, 'sawtooth'),
    spread: f('Spread', 0, 40, 11, { unit: 'ct' }),
    sub: f('Sub', 0, 1, 0.35),
    cutoff: f('Cutoff', 100, 16000, 2600, { unit: 'Hz', curve: 'log' }),
    res: f('Reso', 0.1, 18, 6),
    envAmt: f('Filter Env', 0, 5, 2.6, { unit: 'oct' }),
    decay: f('Decay', 0.05, 4, 0.9, { unit: 's' }),
    body: f('Body', 0.02, 1.5, 0.35, { unit: 's' }),
  },
  play(ctx, out, ev, p) {
    const t = ev.time;
    const freq = clamp(midiToFreq(ev.key), 20, 8000);
    const amp = ctx.createGain();
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.Q.value = p.res;
    const co = clamp(p.cutoff, 60, 18000);
    filt.frequency.setValueAtTime(clamp(co * Math.pow(2, p.envAmt), 60, 19000), t);
    filt.frequency.exponentialRampToValueAtTime(co, t + Math.max(0.02, p.body));
    filt.connect(amp);
    amp.connect(out);

    const oscs = [];
    for (const det of [-p.spread, p.spread]) {
      const o = ctx.createOscillator();
      o.type = p.wave;
      o.frequency.value = freq;
      o.detune.value = det;
      const g = ctx.createGain();
      g.gain.value = 0.32;
      o.connect(g); g.connect(filt);
      o.start(t);
      oscs.push(o);
    }
    if (p.sub > 0.001) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq / 2;
      const g = ctx.createGain();
      g.gain.value = p.sub * 0.4;
      o.connect(g); g.connect(filt);
      o.start(t);
      oscs.push(o);
    }

    const len = Math.max(0.05, p.decay);
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.linearRampToValueAtTime(ev.vel * 0.8, t + 0.004);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + len);
    const end = t + len + 0.05;
    stopAll(oscs, end);
    return {
      release(rt) {
        if (rt < end) stopAll(oscs, Math.min(end, rt + 0.4));
      },
    };
  },
};

const sampler = {
  id: 'sampler', name: 'FlowSampler', cat: 'Sampler', poly: true, color: '#ffd8a8',
  needsSample: true,
  params: {
    start: f('Start', 0, 1, 0),
    end: f('End', 0, 1, 1),
    pitch: f('Pitch', -24, 24, 0, { step: 1, unit: 'st' }),
    gain: f('Gain', 0, 2, 1),
    attack: f('Attack', 0.001, 1, 0.002, { unit: 's' }),
    decay: f('Decay', 0.01, 4, 4, { unit: 's' }),
    sustain: f('Sustain', 0, 1, 1),
    release: f('Release', 0.005, 3, 0.05, { unit: 's' }),
    reverse: f('Reverse', 0, 1, 0, { step: 1 }),
    loop: f('Loop', 0, 1, 0, { step: 1 }),
    cutoff: f('Cutoff', 40, 18000, 18000, { unit: 'Hz', curve: 'log' }),
  },
  play(ctx, out, ev, p, sample) {
    const set = sample && sample.fwd ? sample : null;
    const buffer = set ? (p.reverse >= 0.5 ? set.rev : set.fwd) : null;
    if (!buffer) return null;
    const t = ev.time;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = Math.pow(2, (ev.key - 60 + p.pitch) / 12);
    const from = clamp(Math.min(p.start, p.end), 0, 0.999) * buffer.duration;
    const to = clamp(Math.max(p.start, p.end), 0.001, 1) * buffer.duration;
    if (p.loop >= 0.5) {
      src.loop = true;
      src.loopStart = from;
      src.loopEnd = Math.max(from + 0.01, to);
    }
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = clamp(p.cutoff, 30, 19000);
    const amp = ctx.createGain();
    amp.gain.value = 0.0001;
    const trim = ctx.createGain();
    trim.gain.value = p.gain == null ? 1 : p.gain;
    src.connect(lp); lp.connect(amp); amp.connect(trim); trim.connect(out);
    src.start(t, from);
    const env = { attack: p.attack, decay: p.decay, sustain: p.sustain, release: p.release };
    const end = applyADSR(amp.gain, t, ev.vel, env, ev.dur);
    const natural = t + Math.max(0.02, (to - from) / Math.max(0.01, src.playbackRate.value)) + 0.05;
    if (isFinite(end)) stopAll([src], p.loop >= 0.5 ? end : Math.min(end, natural));
    else if (p.loop < 0.5) src.stop(natural);
    return {
      release(rt) {
        const guess = valueAt(ev.vel, p.sustain, p.attack, p.decay, Math.max(0, rt - t));
        const done = releaseADSR(amp.gain, rt, p.release, guess);
        stopAll([src], done);
      },
    };
  },
};

export const INSTRUMENTS = { kick, snare, clap, hat, tom, perc, osc3, fm, pluck, sampler };
export const INSTRUMENT_LIST = Object.values(INSTRUMENTS);

export function defaultParams(instId) {
  const inst = INSTRUMENTS[instId];
  if (!inst) return {};
  const out = {};
  for (const [k, spec] of Object.entries(inst.params)) out[k] = spec.def;
  return out;
}

export function mergedParams(channel) {
  return { ...defaultParams(channel.inst), ...(channel.params || {}) };
}

/** Plays a single note of `channel` into `out`. Returns a voice handle or null. */
export function playNote(ctx, out, channel, ev, buffers) {
  const inst = INSTRUMENTS[channel.inst];
  if (!inst) return null;
  const p = mergedParams(channel);
  try {
    return inst.play(ctx, out, ev, p, buffers && buffers[channel.sampleId || channel.id]);
  } catch (e) {
    if (typeof console !== 'undefined') console.warn('voice failed', channel.inst, e);
    return null;
  }
}
