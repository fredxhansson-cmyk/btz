/**
 * Featured sound packs — curated preset bundles shipped with the app so the
 * marketplace has real, usable content offline (no backend needed). Each pack is
 * a small set of synth presets (tiny JSON, instant, editable). Community packs
 * from the backend (see /api/market) appear alongside these.
 */
const D = (id, name, cat, inst, params, tags = []) => ({ id, name, cat, inst, params, tags, kind: 'drum' });
const M = (id, name, cat, inst, params, tags = []) => ({ id, name, cat, inst, params, tags, kind: 'inst' });

export const FEATURED_PACKS = [
  {
    id: 'pk-lofi-dust',
    name: 'Lo-Fi Dust',
    author: 'Fuse',
    desc: 'Warm, dusty boombap essentials — soft drums and mellow keys.',
    sounds: [
      D('pk_lf_kick', 'Dust Kick', 'Kick', 'kick', { tune: 47, punch: 4, pitchDecay: 0.05, decay: 0.5, click: 0.08, drive: 0.5 }, ['lofi', 'boombap']),
      D('pk_lf_snare', 'Vinyl Snare', 'Snare', 'snare', { tune: 172, tone: 0.5, decay: 0.32, snap: 1500, width: 1.2, drive: 0.3 }, ['lofi']),
      D('pk_lf_hat', 'Soft Hat', 'Hihat', 'hat', { tune: 40, hpf: 4600, decay: 0.06, metal: 0.3 }, ['lofi']),
      D('pk_lf_perc', 'Tape Click', 'Perc', 'perc', { tune: 1500, ratio: 1.8, decay: 0.05, noise: 0.2 }, ['lofi']),
      M('pk_lf_rhodes', 'Dusty Rhodes', 'Keys', 'rhodes', { tine: 0.4, ratio: 1, bark: 0.1, decay: 2.8, tone: 2800, velTine: 0.45, release: 0.4, drive: 0.06 }, ['lofi', 'soul']),
      M('pk_lf_bass', 'Round Bass', 'Bass', 'osc3', { wave1: 'sine', lvl1: 1, wave2: 'triangle', coarse2: -12, lvl2: 0.4, lvl3: 0, cutoff: 420, res: 1, envAmt: 0.6, fdecay: 0.3, attack: 0.006, decay: 0.35, sustain: 0.85, release: 0.2, drive: 0.1 }, ['lofi']),
      M('pk_lf_pad', 'Haze Pad', 'Pad', 'osc3', { wave1: 'sawtooth', wave2: 'triangle', fine2: 8, lvl2: 0.6, wave3: 'sine', coarse3: -12, lvl3: 0.5, cutoff: 1600, res: 1, envAmt: 0.7, fdecay: 1.8, attack: 0.7, decay: 1.4, sustain: 0.9, release: 1.7 }, ['lofi', 'ambient']),
      M('pk_lf_pluck', 'Music Box Lite', 'Keys', 'fm', { ratio: 6, index: 4.5, idecay: 0.4, attack: 0.001, decay: 1, sustain: 0.05, release: 0.5, cutoff: 10500 }, ['lofi', 'ambient']),
    ],
  },
  {
    id: 'pk-neon-drive',
    name: 'Neon Drive',
    author: 'Fuse',
    desc: 'Synthwave starter — punchy drums, saw bass and dreamy leads.',
    sounds: [
      D('pk_nd_kick', 'Gated Kick', 'Kick', 'kick', { tune: 52, punch: 10, pitchDecay: 0.03, decay: 0.5, click: 0.5, drive: 0.4 }, ['synthwave', '80s']),
      D('pk_nd_snare', 'Big Snare', 'Snare', 'snare', { tune: 190, tone: 0.45, decay: 0.5, snap: 2000, width: 0.7, drive: 0.2 }, ['synthwave', '80s']),
      D('pk_nd_tom', 'Electro Tom', 'Tom', 'tom', { tune: 120, bend: 1.8, decay: 0.4, noise: 0.05 }, ['synthwave']),
      M('pk_nd_bass', 'Drive Bass', 'Bass', 'osc3', { wave1: 'sawtooth', wave2: 'square', lvl2: 0.4, coarse3: -12, lvl3: 0.5, cutoff: 640, res: 3, envAmt: 1.4, fdecay: 0.4, sustain: 0.8, release: 0.2, drive: 0.15 }, ['synthwave', '80s']),
      M('pk_nd_lead', 'Neon Lead', 'Lead', 'osc3', { wave1: 'sawtooth', wave2: 'sawtooth', fine2: 12, lvl2: 0.9, wave3: 'sawtooth', fine3: -12, lvl3: 0.9, cutoff: 5600, res: 2, envAmt: 1.4, fdecay: 0.5, attack: 0.01, decay: 0.5, sustain: 0.85, release: 0.4 }, ['synthwave']),
      M('pk_nd_pad', 'Retro Pad', 'Pad', 'osc3', { wave1: 'sawtooth', wave2: 'square', fine2: 8, lvl2: 0.7, wave3: 'sawtooth', fine3: -8, lvl3: 0.7, cutoff: 2200, res: 1.5, envAmt: 1, fdecay: 1.8, attack: 0.5, decay: 1.5, sustain: 0.9, release: 1.7 }, ['synthwave', '80s']),
      M('pk_nd_arp', 'Neon Arp', 'Lead', 'pluck', { wave: 'sawtooth', spread: 11, sub: 0.2, cutoff: 4400, res: 6, envAmt: 2.6, decay: 0.6, body: 0.2 }, ['synthwave']),
      M('pk_nd_brass', 'Synth Brass', 'Lead', 'fm', { ratio: 1, index: 5, idecay: 0.5, attack: 0.02, decay: 0.5, sustain: 0.8, release: 0.25, cutoff: 5000 }, ['synthwave', '80s']),
    ],
  },
];
