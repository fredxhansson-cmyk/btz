// Mixer insert effects. Each unit exposes {input, output, update(params, bpm)}
// so the same definitions run live and in the offline renderer.
import { clamp } from '../constants';
import { distortionCurve, impulseResponse } from './dsp';

const f = (label, min, max, def, opts = {}) => ({ label, min, max, def, kind: 'float', ...opts });
const choice = (label, options, def) => ({ label, options, def, kind: 'choice' });

const SYNC = { '1/1': 4, '1/2': 2, '1/4': 1, '1/4.': 1.5, '1/8': 0.5, '1/8.': 0.75, '1/8T': 1 / 3, '1/16': 0.25, '1/16T': 1 / 6 };

function wetDry(ctx) {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  input.connect(dry); dry.connect(output); wet.connect(output);
  return { input, output, dry, wet };
}

const filter = {
  id: 'filter', name: 'Fruity Filter',
  params: {
    type: choice('Type', ['lowpass', 'highpass', 'bandpass', 'notch'], 'lowpass'),
    cutoff: f('Cutoff', 30, 19000, 8000, { unit: 'Hz', curve: 'log' }),
    res: f('Reso', 0.1, 24, 1),
  },
  create(ctx) {
    const node = ctx.createBiquadFilter();
    return {
      input: node, output: node,
      update(p) {
        node.type = p.type;
        node.frequency.value = clamp(p.cutoff, 20, 20000);
        node.Q.value = p.res;
      },
    };
  },
};

const delay = {
  id: 'delay', name: 'Fruity Delay',
  params: {
    time: choice('Time', Object.keys(SYNC), '1/8'),
    feedback: f('Feedback', 0, 0.95, 0.42),
    damp: f('Damp', 400, 18000, 4500, { unit: 'Hz', curve: 'log' }),
    ping: f('Stereo', 0, 1, 0.4),
    wet: f('Wet', 0, 1, 0.28),
  },
  create(ctx) {
    const { input, output, dry, wet } = wetDry(ctx);
    const dl = ctx.createDelay(4);
    const dr = ctx.createDelay(4);
    const fb = ctx.createGain();
    const damp = ctx.createBiquadFilter(); damp.type = 'lowpass';
    const merger = ctx.createChannelMerger(2);
    input.connect(dl);
    dl.connect(damp); damp.connect(fb); fb.connect(dr); dr.connect(dl);
    dl.connect(merger, 0, 0); dr.connect(merger, 0, 1);
    merger.connect(wet);
    return {
      input, output,
      update(p, bpm) {
        const beats = SYNC[p.time] != null ? SYNC[p.time] : 0.5;
        const secs = clamp((60 / Math.max(20, bpm)) * beats, 0.001, 3.9);
        dl.delayTime.value = secs;
        dr.delayTime.value = clamp(secs * (1 + p.ping * 0.0), 0.001, 3.9);
        fb.gain.value = p.feedback;
        damp.frequency.value = clamp(p.damp, 100, 19000);
        wet.gain.value = p.wet;
        dry.gain.value = 1;
      },
    };
  },
};

const reverb = {
  id: 'reverb', name: 'Fruity Reeverb',
  params: {
    size: f('Size', 0.2, 6, 2.2, { unit: 's' }),
    decay: f('Decay', 0.5, 8, 3 ),
    damp: f('Damp', 500, 18000, 7000, { unit: 'Hz', curve: 'log' }),
    predelay: f('Pre-delay', 0, 0.2, 0.012, { unit: 's' }),
    wet: f('Wet', 0, 1, 0.3),
  },
  create(ctx) {
    const { input, output, dry, wet } = wetDry(ctx);
    const pre = ctx.createDelay(0.5);
    const conv = ctx.createConvolver();
    const damp = ctx.createBiquadFilter(); damp.type = 'lowpass';
    input.connect(pre); pre.connect(conv); conv.connect(damp); damp.connect(wet);
    let irKey = '';
    return {
      input, output,
      update(p) {
        const key = `${p.size.toFixed(2)}/${p.decay.toFixed(2)}`;
        if (key !== irKey) {
          irKey = key;
          conv.buffer = impulseResponse(ctx, clamp(p.size, 0.1, 8), p.decay);
        }
        pre.delayTime.value = clamp(p.predelay, 0, 0.45);
        damp.frequency.value = clamp(p.damp, 200, 19000);
        wet.gain.value = p.wet;
        dry.gain.value = 1;
      },
    };
  },
};

const chorus = {
  id: 'chorus', name: 'Fruity Chorus',
  params: {
    rate: f('Rate', 0.05, 8, 0.6, { unit: 'Hz' }),
    depth: f('Depth', 0.0005, 0.012, 0.0035, { unit: 's' }),
    spread: f('Spread', 0, 1, 0.8),
    wet: f('Wet', 0, 1, 0.4),
  },
  create(ctx) {
    const { input, output, dry, wet } = wetDry(ctx);
    const merger = ctx.createChannelMerger(2);
    const voices = [0, 1].map((i) => {
      const d = ctx.createDelay(0.1);
      d.delayTime.value = 0.012 + i * 0.005;
      const lfo = ctx.createOscillator(); lfo.type = 'sine';
      const amt = ctx.createGain();
      lfo.connect(amt); amt.connect(d.delayTime);
      lfo.start();
      input.connect(d);
      d.connect(merger, 0, i);
      return { d, lfo, amt, i };
    });
    merger.connect(wet);
    return {
      input, output,
      update(p) {
        voices.forEach((v) => {
          v.lfo.frequency.value = p.rate * (1 + v.i * 0.13 * p.spread);
          v.amt.gain.value = p.depth;
          v.d.delayTime.value = 0.012 + v.i * 0.006 * (0.2 + p.spread);
        });
        wet.gain.value = p.wet;
        dry.gain.value = 1 - p.wet * 0.35;
      },
    };
  },
};

const dist = {
  id: 'dist', name: 'Fruity Blood Overdrive',
  params: {
    drive: f('Drive', 0, 0.98, 0.35),
    tone: f('Tone', 300, 18000, 9000, { unit: 'Hz', curve: 'log' }),
    level: f('Level', 0, 2, 0.8),
    wet: f('Wet', 0, 1, 1),
  },
  create(ctx) {
    const { input, output, dry, wet } = wetDry(ctx);
    const ws = ctx.createWaveShaper(); ws.oversample = '4x';
    const tone = ctx.createBiquadFilter(); tone.type = 'lowpass';
    const lvl = ctx.createGain();
    input.connect(ws); ws.connect(tone); tone.connect(lvl); lvl.connect(wet);
    let last = -1;
    return {
      input, output,
      update(p) {
        if (p.drive !== last) { last = p.drive; ws.curve = distortionCurve(p.drive); }
        tone.frequency.value = clamp(p.tone, 100, 19000);
        lvl.gain.value = p.level;
        wet.gain.value = p.wet;
        dry.gain.value = 1 - p.wet;
      },
    };
  },
};

const eq3 = {
  id: 'eq3', name: 'Fruity Parametric EQ',
  params: {
    low: f('Low', -18, 18, 0, { unit: 'dB' }),
    lowf: f('Low Freq', 40, 500, 140, { unit: 'Hz', curve: 'log' }),
    mid: f('Mid', -18, 18, 0, { unit: 'dB' }),
    midf: f('Mid Freq', 200, 6000, 1200, { unit: 'Hz', curve: 'log' }),
    midq: f('Mid Q', 0.2, 8, 1),
    high: f('High', -18, 18, 0, { unit: 'dB' }),
    highf: f('High Freq', 2000, 16000, 7000, { unit: 'Hz', curve: 'log' }),
  },
  create(ctx) {
    const lo = ctx.createBiquadFilter(); lo.type = 'lowshelf';
    const mid = ctx.createBiquadFilter(); mid.type = 'peaking';
    const hi = ctx.createBiquadFilter(); hi.type = 'highshelf';
    lo.connect(mid); mid.connect(hi);
    return {
      input: lo, output: hi,
      update(p) {
        lo.frequency.value = p.lowf; lo.gain.value = p.low;
        mid.frequency.value = p.midf; mid.gain.value = p.mid; mid.Q.value = p.midq;
        hi.frequency.value = p.highf; hi.gain.value = p.high;
      },
    };
  },
};

const comp = {
  id: 'comp', name: 'Fruity Limiter',
  params: {
    threshold: f('Threshold', -60, 0, -14, { unit: 'dB' }),
    ratio: f('Ratio', 1, 20, 4),
    attack: f('Attack', 0.001, 0.3, 0.006, { unit: 's' }),
    release: f('Release', 0.01, 1, 0.18, { unit: 's' }),
    knee: f('Knee', 0, 40, 8, { unit: 'dB' }),
    gain: f('Gain', 0, 3, 1),
  },
  create(ctx) {
    const c = ctx.createDynamicsCompressor();
    const g = ctx.createGain();
    c.connect(g);
    return {
      input: c, output: g,
      update(p) {
        c.threshold.value = p.threshold;
        c.ratio.value = p.ratio;
        c.attack.value = p.attack;
        c.release.value = p.release;
        c.knee.value = p.knee;
        g.gain.value = p.gain;
      },
    };
  },
};

export const EFFECTS = { filter, delay, reverb, chorus, dist, eq3, comp };
export const EFFECT_LIST = Object.values(EFFECTS);

export function defaultFxParams(id) {
  const fx = EFFECTS[id];
  if (!fx) return {};
  const out = {};
  for (const [k, spec] of Object.entries(fx.params)) out[k] = spec.def;
  return out;
}

export function mergedFxParams(slot) {
  return { ...defaultFxParams(slot.type), ...(slot.params || {}) };
}
