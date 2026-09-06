// Mastering chain presets for the master bus.
// Targets are integrated loudness in LUFS — the level streaming platforms
// normalise to (roughly -14), versus what club playback expects (louder).
//
// Chain order follows a real mastering signal flow:
//   corrective EQ  →  glue compression  →  colour/saturation  →  stereo image
//   →  final brickwall-style limiter (last, so nothing downstream re-clips).
// Every loud preset ends in a limiter stage so the master is always safe.

/** A fast, ceiling-style limiter built from the compressor node. */
const LIMITER = (ceilingGain = 1.0) => ({
  type: 'comp',
  params: { threshold: -6, ratio: 14, attack: 0.002, release: 0.06, knee: 1.5, gain: ceilingGain },
});

export const MASTER_PRESETS = [
  {
    id: 'clean',
    name: 'Clean',
    target: -16,
    desc: 'No processing at all. Good while you are still building the track.',
    chain: [],
  },
  {
    id: 'streaming',
    name: 'Streaming −14',
    target: -14,
    desc: 'Balanced, transparent master for Spotify, Apple Music and YouTube.',
    chain: [
      { type: 'eq3', params: { low: 1, lowf: 90, mid: -1, midf: 420, midq: 0.9, high: 1.5, highf: 8000 } },
      { type: 'comp', params: { threshold: -18, ratio: 2.4, attack: 0.02, release: 0.22, knee: 12, gain: 1.2 } },
      { type: 'widener', params: { width: 1.2, mono: 130, gain: 1 } },
      LIMITER(1.05),
    ],
  },
  {
    id: 'pro',
    name: 'Mastering Pro',
    target: -12,
    desc: 'Full chain: EQ, multiband glue, saturation, stereo image and a limiter.',
    chain: [
      { type: 'eq3', params: { low: 1, lowf: 85, mid: -0.5, midf: 450, midq: 0.9, high: 1.5, highf: 9000 } },
      { type: 'multiband', params: { xLow: 180, xHigh: 3200, lowThr: -24, midThr: -22, highThr: -24, ratio: 2.5, attack: 0.02, release: 0.2, lowGain: 1.05, midGain: 1, highGain: 1.05, out: 1 } },
      { type: 'comp', params: { threshold: -18, ratio: 2, attack: 0.02, release: 0.24, knee: 12, gain: 1.15 } },
      { type: 'dist', params: { drive: 0.08, tone: 13000, level: 1, wet: 0.18 } },
      { type: 'widener', params: { width: 1.2, mono: 140, gain: 1 } },
      LIMITER(1.1),
    ],
  },
  {
    id: 'club',
    name: 'Club −9',
    target: -9,
    desc: 'Loud, punchy master with saturation for a big club system.',
    chain: [
      { type: 'eq3', params: { low: 2, lowf: 70, mid: -1.5, midf: 500, midq: 1, high: 2, highf: 9000 } },
      { type: 'comp', params: { threshold: -22, ratio: 4, attack: 0.008, release: 0.14, knee: 8, gain: 1.35 } },
      { type: 'dist', params: { drive: 0.12, tone: 15000, level: 1, wet: 0.28 } },
      { type: 'widener', params: { width: 1.3, mono: 150, gain: 1 } },
      LIMITER(1.15),
    ],
  },
  {
    id: 'trap',
    name: 'Trap / 808',
    target: -11,
    desc: 'Tight low end, crisp hats and hard limiting for 808-driven beats.',
    chain: [
      { type: 'eq3', params: { low: 2.5, lowf: 55, mid: -1, midf: 450, midq: 1, high: 2.5, highf: 11000 } },
      { type: 'comp', params: { threshold: -20, ratio: 3, attack: 0.006, release: 0.12, knee: 8, gain: 1.3 } },
      { type: 'dist', params: { drive: 0.1, tone: 14000, level: 1, wet: 0.22 } },
      { type: 'widener', params: { width: 1.25, mono: 170, gain: 1 } },
      LIMITER(1.15),
    ],
  },
  {
    id: 'hiphop',
    name: 'Hip-hop / lo-fi',
    target: -13,
    desc: 'Warm, glued and slightly rolled-off top — boom-bap and lo-fi.',
    chain: [
      { type: 'dist', params: { drive: 0.16, tone: 10500, level: 0.96, wet: 0.4 } },
      { type: 'eq3', params: { low: 1.5, lowf: 95, mid: 0.5, midf: 700, midq: 0.7, high: -1, highf: 9000 } },
      { type: 'comp', params: { threshold: -20, ratio: 2.2, attack: 0.03, release: 0.28, knee: 14, gain: 1.25 } },
      LIMITER(1.05),
    ],
  },
  {
    id: 'pop',
    name: 'Pop / vocal',
    target: -12,
    desc: 'Present midrange, controlled dynamics and an airy top for songs.',
    chain: [
      { type: 'eq3', params: { low: 0.5, lowf: 100, mid: 1.5, midf: 2500, midq: 0.8, high: 2.5, highf: 12000 } },
      { type: 'comp', params: { threshold: -19, ratio: 2.6, attack: 0.015, release: 0.2, knee: 12, gain: 1.3 } },
      { type: 'widener', params: { width: 1.15, mono: 120, gain: 1 } },
      LIMITER(1.08),
    ],
  },
  {
    id: 'tape',
    name: 'Tape / warm',
    target: -13,
    desc: 'Soft saturation, tamed treble and gentle glue compression.',
    chain: [
      { type: 'dist', params: { drive: 0.2, tone: 11000, level: 0.95, wet: 0.45 } },
      { type: 'eq3', params: { low: 1.5, lowf: 110, mid: 0.5, midf: 700, midq: 0.7, high: -1.5, highf: 9000 } },
      { type: 'comp', params: { threshold: -20, ratio: 2, attack: 0.03, release: 0.3, knee: 16, gain: 1.25 } },
      LIMITER(1.02),
    ],
  },
  {
    id: 'wide',
    name: 'Wide & airy',
    target: -14,
    desc: 'Wider stereo image with mono bass and a lift in the treble.',
    chain: [
      { type: 'eq3', params: { low: 0, lowf: 100, mid: -2, midf: 350, midq: 0.8, high: 3, highf: 10000 } },
      { type: 'widener', params: { width: 1.7, mono: 160, gain: 1 } },
      { type: 'comp', params: { threshold: -16, ratio: 2, attack: 0.02, release: 0.25, knee: 14, gain: 1.1 } },
      LIMITER(1.05),
    ],
  },
  {
    id: 'voice',
    name: 'Podcast / voice',
    target: -16,
    desc: 'Narrow focus, clear midrange and an even level.',
    chain: [
      { type: 'eq3', params: { low: -3, lowf: 120, mid: 2.5, midf: 2200, midq: 0.8, high: 1, highf: 7000 } },
      { type: 'comp', params: { threshold: -24, ratio: 3.5, attack: 0.01, release: 0.2, knee: 10, gain: 1.5 } },
      LIMITER(1.0),
    ],
  },
];

export const masterPreset = (id) => MASTER_PRESETS.find((p) => p.id === id) || MASTER_PRESETS[0];

/** Integrated loudness (LUFS, gated) of a decoded AudioBuffer — measured the
    same way as the live meter so you can A/B a reference track fairly. */
export function measureBufferLufs(buffer) {
  const block = Math.max(1, Math.floor(buffer.sampleRate * 0.4)); // 400 ms
  const chans = [];
  for (let c = 0; c < buffer.numberOfChannels; c++) chans.push(buffer.getChannelData(c));
  const nCh = Math.max(1, chans.length);
  const lufs = (ms) => (ms > 1e-10 ? -0.691 + 10 * Math.log10(ms) : -70);
  const blocks = [];
  for (let i = 0; i + block <= buffer.length; i += block) {
    let sum = 0;
    for (let c = 0; c < nCh; c++) {
      const d = chans[c];
      for (let j = i; j < i + block; j++) sum += d[j] * d[j];
    }
    blocks.push(sum / (block * nCh));
  }
  if (!blocks.length) return -70;
  const rough = lufs(blocks.reduce((a, b) => a + b, 0) / blocks.length);
  const gated = blocks.filter((ms) => lufs(ms) > rough - 10);
  const use = gated.length ? gated : blocks;
  return lufs(use.reduce((a, b) => a + b, 0) / use.length);
}

/** Gain change needed to hit the target loudness, as a linear multiplier. */
export function matchGain(currentVol, measuredLufs, targetLufs) {
  if (measuredLufs == null || !isFinite(measuredLufs) || measuredLufs < -60) return currentVol;
  const delta = targetLufs - measuredLufs;
  const next = currentVol * Math.pow(10, delta / 20);
  return Math.max(0.02, Math.min(1.4, next));
}

/* ------------------------------------------------------------ AI mastering */

/** One-pole low-pass, returns a filtered copy of the samples. */
function lowpass(data, sr, fc) {
  const a = Math.exp(-2 * Math.PI * (fc / sr));
  const out = new Float32Array(data.length);
  let y = 0;
  for (let i = 0; i < data.length; i++) { y = (1 - a) * data[i] + a * y; out[i] = y; }
  return out;
}
function rms(data) {
  let s = 0;
  for (let i = 0; i < data.length; i++) s += data[i] * data[i];
  return Math.sqrt(s / Math.max(1, data.length));
}
const toDb = (v) => (v > 1e-7 ? 20 * Math.log10(v) : -80);

/**
 * Measure the tonal balance of a rendered buffer as low / mid / high band
 * levels in dB, relative to the mid band. Positive = that band is louder than
 * the mids. This is the "ear" of the AI master.
 */
export function analyzeTonalBalance(buffer) {
  const n = buffer.length;
  const mono = new Float32Array(n);
  const nc = buffer.numberOfChannels;
  for (let c = 0; c < nc; c++) {
    const d = buffer.getChannelData(c);
    for (let i = 0; i < n; i++) mono[i] += d[i] / nc;
  }
  const sr = buffer.sampleRate;
  const low = lowpass(mono, sr, 200);
  const lowMid = lowpass(mono, sr, 4000);
  const mid = new Float32Array(n);
  const high = new Float32Array(n);
  for (let i = 0; i < n; i++) { mid[i] = lowMid[i] - low[i]; high[i] = mono[i] - lowMid[i]; }
  const midDb = toDb(rms(mid));
  return {
    lowRel: toDb(rms(low)) - midDb,
    highRel: toDb(rms(high)) - midDb,
    midDb,
  };
}

// Desired tilt of low/high relative to the mids, per style. Derived from typical
// modern masters — the AI nudges the mix toward these, gently.
export const AI_MASTER_STYLES = {
  balanced: { low: 1.5, high: 1.0, target: -14, warmth: 0 },
  loud: { low: 2.0, high: 1.5, target: -9, warmth: 0.15 },
  warm: { low: 2.0, high: -0.5, target: -13, warmth: 0.35 },
  bright: { low: 1.0, high: 3.0, target: -14, warmth: 0 },
};

/**
 * Turn a measured tonal balance into a full, safe master chain plus a plain
 * description of the moves — spectral matching, not just level. If a reference
 * balance is supplied we match toward it instead of the style curve.
 */
export function suggestMasterChain(balance, { style = 'balanced', target, refBalance } = {}) {
  const st = AI_MASTER_STYLES[style] || AI_MASTER_STYLES.balanced;
  const wantLow = refBalance ? refBalance.lowRel : st.low;
  const wantHigh = refBalance ? refBalance.highRel : st.high;
  const clamp = (v) => Math.max(-5, Math.min(5, v));
  // Move 60% of the way toward the target so it stays natural.
  const lowMove = Math.round(clamp((wantLow - balance.lowRel) * 0.6) * 10) / 10;
  const highMove = Math.round(clamp((wantHigh - balance.highRel) * 0.6) * 10) / 10;
  const midMove = Math.round(clamp(-Math.max(0, -(balance.lowRel + balance.highRel) / 2) * 0.3) * 10) / 10;
  const tgt = target == null ? st.target : target;

  const chain = [
    { type: 'eq3', params: { low: lowMove, lowf: 90, mid: midMove, midf: 500, midq: 0.9, high: highMove, highf: 9000 } },
    // Multiband glue: conservative, evens the bands without pumping the whole mix.
    { type: 'multiband', params: { xLow: 180, xHigh: 3200, lowThr: -24, midThr: -22, highThr: -24, ratio: 2.4, attack: 0.02, release: 0.2, lowGain: 1, midGain: 1, highGain: 1, out: 1 } },
    { type: 'comp', params: { threshold: -18, ratio: 2.3, attack: 0.02, release: 0.24, knee: 12, gain: 1.2 } },
  ];
  if (st.warmth > 0) chain.push({ type: 'dist', params: { drive: st.warmth, tone: 12000, level: 0.97, wet: 0.3 } });
  chain.push({ type: 'widener', params: { width: 1.2, mono: 140, gain: 1 } });
  chain.push(LIMITER(tgt >= -10 ? 1.15 : 1.06));

  return {
    chain, target: tgt, moves: { lowMove, midMove, highMove }, balance,
  };
}

/** Human-readable summary of the EQ moves the AI master applied. */
export function describeMoves(moves) {
  const part = (label, v) => {
    if (Math.abs(v) < 0.2) return `${label} oförändrad`;
    return `${label} ${v > 0 ? '+' : ''}${v.toFixed(1)} dB`;
  };
  return `${part('bas', moves.lowMove)}, ${part('mellan', moves.midMove)}, ${part('diskant', moves.highMove)}`;
}
