// Mastering chain presets for the master bus.
// Targets are integrated loudness in LUFS — the level streaming platforms
// normalise to (roughly -14), versus what club playback expects (louder).
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
    desc: 'Balanced chain for Spotify, YouTube and the like.',
    chain: [
      { type: 'eq3', params: { low: 1, lowf: 90, mid: -1, midf: 420, midq: 0.9, high: 1.5, highf: 8000 } },
      { type: 'comp', params: { threshold: -18, ratio: 2.4, attack: 0.02, release: 0.22, knee: 12, gain: 1.25 } },
      { type: 'widener', params: { width: 1.25, mono: 130, gain: 1 } },
    ],
  },
  {
    id: 'club',
    name: 'Club −9',
    target: -9,
    desc: 'Harder limiting and a touch of saturation for high levels on a club system.',
    chain: [
      { type: 'eq3', params: { low: 2, lowf: 70, mid: -1.5, midf: 500, midq: 1, high: 2, highf: 9000 } },
      { type: 'comp', params: { threshold: -22, ratio: 4, attack: 0.008, release: 0.14, knee: 8, gain: 1.5 } },
      { type: 'dist', params: { drive: 0.12, tone: 15000, level: 1, wet: 0.3 } },
      { type: 'widener', params: { width: 1.35, mono: 150, gain: 1 } },
    ],
  },
  {
    id: 'tape',
    name: 'Tape / warm',
    target: -13,
    desc: 'Soft saturation, tamed treble and a little glue compression.',
    chain: [
      { type: 'dist', params: { drive: 0.2, tone: 11000, level: 0.95, wet: 0.45 } },
      { type: 'eq3', params: { low: 1.5, lowf: 110, mid: 0.5, midf: 700, midq: 0.7, high: -1.5, highf: 9000 } },
      { type: 'comp', params: { threshold: -20, ratio: 2, attack: 0.03, release: 0.3, knee: 16, gain: 1.3 } },
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
      { type: 'comp', params: { threshold: -16, ratio: 2, attack: 0.02, release: 0.25, knee: 14, gain: 1.15 } },
    ],
  },
  {
    id: 'voice',
    name: 'Podcast / voice',
    target: -16,
    desc: 'Narrow focus, clear midrange and an even level.',
    chain: [
      { type: 'eq3', params: { low: -3, lowf: 120, mid: 2.5, midf: 2200, midq: 0.8, high: 1, highf: 7000 } },
      { type: 'comp', params: { threshold: -24, ratio: 3.5, attack: 0.01, release: 0.2, knee: 10, gain: 1.6 } },
    ],
  },
];

export const masterPreset = (id) => MASTER_PRESETS.find((p) => p.id === id) || MASTER_PRESETS[0];

/** Gain change needed to hit the target loudness, as a linear multiplier. */
export function matchGain(currentVol, measuredLufs, targetLufs) {
  if (measuredLufs == null || !isFinite(measuredLufs) || measuredLufs < -60) return currentVol;
  const delta = targetLufs - measuredLufs;
  const next = currentVol * Math.pow(10, delta / 20);
  return Math.max(0.02, Math.min(1.4, next));
}
