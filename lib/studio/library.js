// BTZ Sound Library.
//
// Every sound in the library is a parameter set for the built-in synthesis
// engine — no audio files, no licensing, a few hundred bytes each. That is why
// the whole library loads instantly, works offline and stays fully editable:
// a preset is a starting point, not a locked recording.

const D = (id, name, cat, inst, params, tags = []) => ({ id, name, cat, inst, params, tags, kind: 'drum' });
const M = (id, name, cat, inst, params, tags = []) => ({ id, name, cat, inst, params, tags, kind: 'inst' });

/* ------------------------------------------------------------- drum sounds */

export const DRUM_SOUNDS = [
  // kicks
  D('k808', '808 Deep', 'Kick', 'kick', { tune: 42, punch: 6, pitchDecay: 0.07, decay: 1.1, click: 0.1, drive: 0.15 }, ['808', 'sub', 'trap']),
  D('k909', '909 Punch', 'Kick', 'kick', { tune: 56, punch: 9, pitchDecay: 0.028, decay: 0.42, click: 0.5, drive: 0.35 }, ['house', 'techno']),
  D('kacoustic', 'Acoustic Kick', 'Kick', 'kick', { tune: 62, punch: 5, pitchDecay: 0.02, decay: 0.3, click: 0.6, drive: 0.08 }, ['live', 'rock']),
  D('ktrap', 'Trap 808 Long', 'Kick', 'kick', { tune: 36, punch: 7, pitchDecay: 0.09, decay: 1.9, click: 0.18, drive: 0.28 }, ['trap', 'sub']),
  D('klofi', 'LoFi Thump', 'Kick', 'kick', { tune: 50, punch: 4, pitchDecay: 0.05, decay: 0.5, click: 0.06, drive: 0.5 }, ['lofi', 'boombap']),
  D('ktechno', 'Techno Hard', 'Kick', 'kick', { tune: 52, punch: 12, pitchDecay: 0.02, decay: 0.55, click: 0.35, drive: 0.6 }, ['techno', 'hard']),
  D('kclick', 'Click Kick', 'Kick', 'kick', { tune: 60, punch: 4, pitchDecay: 0.012, decay: 0.22, click: 0.95, drive: 0.2 }, ['minimal', 'tight']),
  D('ksub', 'Sub Boom', 'Kick', 'kick', { tune: 30, punch: 3, pitchDecay: 0.12, decay: 2, click: 0.05, drive: 0.1 }, ['sub', 'drill']),

  // snares
  D('s808', '808 Snare', 'Snare', 'snare', { tune: 180, tone: 0.5, decay: 0.22, snap: 1800, width: 2.2, drive: 0.1 }, ['808']),
  D('s909', '909 Snare', 'Snare', 'snare', { tune: 210, tone: 0.32, decay: 0.3, snap: 2600, width: 1.4, drive: 0.25 }, ['house', 'techno']),
  D('sacoustic', 'Acoustic Snare', 'Snare', 'snare', { tune: 195, tone: 0.45, decay: 0.36, snap: 2100, width: 1, drive: 0.05 }, ['live']),
  D('srim', 'Tight Rimshot', 'Snare', 'snare', { tune: 260, tone: 0.6, decay: 0.12, snap: 3000, width: 4, drive: 0.15 }, ['tight']),
  D('sfat', 'Fat Backbeat', 'Snare', 'snare', { tune: 165, tone: 0.55, decay: 0.42, snap: 1400, width: 0.8, drive: 0.3 }, ['boombap', 'lofi']),
  D('snoise', 'Noise Crack', 'Snare', 'snare', { tune: 240, tone: 0.12, decay: 0.16, snap: 3600, width: 1.6, drive: 0.2 }, ['trap', 'drill']),

  // claps
  D('c808', '808 Clap', 'Clap', 'clap', { freq: 1150, width: 2.2, spread: 0.012, decay: 0.28 }, ['808']),
  D('ctight', 'Tight Clap', 'Clap', 'clap', { freq: 1900, width: 1.4, spread: 0.007, decay: 0.2 }, ['trap']),
  D('cwide', 'Wide Clap', 'Clap', 'clap', { freq: 1300, width: 0.9, spread: 0.022, decay: 0.42 }, ['house']),
  D('croom', 'Room Clap', 'Clap', 'clap', { freq: 800, width: 3, spread: 0.018, decay: 0.5 }, ['lofi', 'live']),

  // hats
  D('hclosed', 'Closed Hat', 'Hihat', 'hat', { tune: 40, hpf: 7600, decay: 0.05, metal: 0.85 }, ['808']),
  D('hopen', 'Open Hat', 'Hihat', 'hat', { tune: 40, hpf: 7600, decay: 0.42, metal: 0.85 }, ['808']),
  D('h909c', '909 Closed', 'Hihat', 'hat', { tune: 48, hpf: 8800, decay: 0.04, metal: 0.6 }, ['house']),
  D('h909o', '909 Open', 'Hihat', 'hat', { tune: 48, hpf: 8800, decay: 0.55, metal: 0.6 }, ['house']),
  D('htrap', 'Trap Tick', 'Hihat', 'hat', { tune: 54, hpf: 9800, decay: 0.026, metal: 0.7 }, ['trap', 'roll']),
  D('hshaker', 'Shaker', 'Hihat', 'hat', { tune: 58, hpf: 5200, decay: 0.08, metal: 0.04 }, ['organic']),
  D('hlofi', 'LoFi Hat', 'Hihat', 'hat', { tune: 38, hpf: 4800, decay: 0.07, metal: 0.35 }, ['lofi']),

  // percussion
  D('prim', 'Rimshot', 'Perc', 'perc', { tune: 1400, ratio: 1.48, decay: 0.05, noise: 0.05 }, ['808']),
  D('pclave', 'Clave', 'Perc', 'perc', { tune: 2200, ratio: 1.33, decay: 0.06, noise: 0 }, ['latin']),
  D('pcowbell', 'Cowbell', 'Perc', 'perc', { tune: 800, ratio: 1.5, decay: 0.28, noise: 0.02 }, ['808', 'latin']),
  D('ptamb', 'Tambourine', 'Perc', 'perc', { tune: 2600, ratio: 2.2, decay: 0.1, noise: 0.85 }, ['organic']),
  D('pwood', 'Woodblock', 'Perc', 'perc', { tune: 1700, ratio: 1.9, decay: 0.045, noise: 0.15 }, ['latin']),
  D('pconga', 'Conga', 'Perc', 'tom', { tune: 220, bend: 1.3, decay: 0.3, noise: 0.2 }, ['latin', 'organic']),
  D('pbongo', 'Bongo', 'Perc', 'tom', { tune: 330, bend: 1.25, decay: 0.2, noise: 0.25 }, ['latin']),
  D('psleigh', 'Sleigh Bells', 'Perc', 'hat', { tune: 64, hpf: 5400, decay: 0.3, metal: 1 }, ['organic', 'gfunk', 'jingle']),
  D('pagogohi', 'Agogo High', 'Perc', 'perc', { tune: 1600, ratio: 1.5, decay: 0.18, noise: 0 }, ['latin', 'gfunk']),
  D('pagogolo', 'Agogo Low', 'Perc', 'perc', { tune: 1050, ratio: 1.5, decay: 0.22, noise: 0 }, ['latin', 'gfunk']),
  D('pcabasa', 'Cabasa', 'Perc', 'hat', { tune: 60, hpf: 6800, decay: 0.06, metal: 0.03 }, ['organic', 'latin']),
  D('ptri', 'Triangle', 'Perc', 'perc', { tune: 2400, ratio: 3.1, decay: 0.6, noise: 0 }, ['organic', 'jingle']),
  D('ptambhit', 'Tambourine Hit', 'Perc', 'perc', { tune: 2800, ratio: 2.4, decay: 0.18, noise: 0.9 }, ['organic', 'gfunk']),

  // toms
  D('tlow', 'Low Tom', 'Tom', 'tom', { tune: 90, bend: 1.6, decay: 0.5, noise: 0.1 }, ['808']),
  D('tmid', 'Mid Tom', 'Tom', 'tom', { tune: 140, bend: 1.6, decay: 0.42, noise: 0.1 }, ['808']),
  D('thigh', 'High Tom', 'Tom', 'tom', { tune: 205, bend: 1.6, decay: 0.35, noise: 0.1 }, ['808']),
  D('tfloor', 'Floor Tom', 'Tom', 'tom', { tune: 75, bend: 1.35, decay: 0.75, noise: 0.35 }, ['live']),

  // cymbals
  D('cycrash', 'Crash', 'Cymbal', 'hat', { tune: 30, hpf: 4200, decay: 1.6, metal: 0.95 }, ['live']),
  D('cyride', 'Ride', 'Cymbal', 'hat', { tune: 36, hpf: 6400, decay: 0.9, metal: 0.9 }, ['live']),
  D('cyrev', 'Short Splash', 'Cymbal', 'hat', { tune: 44, hpf: 7200, decay: 0.45, metal: 1 }, ['edm']),

  /* ------------------------------------------------ expansion: more drums */
  // kicks
  D('kdeephouse', 'Deep House Kick', 'Kick', 'kick', { tune: 48, punch: 7, pitchDecay: 0.03, decay: 0.5, click: 0.4, drive: 0.3 }, ['house', 'deep']),
  D('kdrill', 'Drill Kick', 'Kick', 'kick', { tune: 34, punch: 8, pitchDecay: 0.1, decay: 1.6, click: 0.2, drive: 0.35 }, ['drill', 'uk']),
  D('kboombap', 'Boombap Kick', 'Kick', 'kick', { tune: 54, punch: 5, pitchDecay: 0.02, decay: 0.35, click: 0.5, drive: 0.4 }, ['boombap', 'hiphop']),
  D('kpunchy', 'Punchy Kick', 'Kick', 'kick', { tune: 58, punch: 11, pitchDecay: 0.02, decay: 0.4, click: 0.7, drive: 0.45 }, ['edm']),
  D('kdusty', 'Dusty Kick', 'Kick', 'kick', { tune: 46, punch: 4, pitchDecay: 0.04, decay: 0.44, click: 0.1, drive: 0.55 }, ['lofi', 'dusty']),
  D('kraw909', 'Raw 909', 'Kick', 'kick', { tune: 55, punch: 10, pitchDecay: 0.024, decay: 0.5, click: 0.45, drive: 0.7 }, ['techno', 'raw']),
  D('khouseclick', 'House Click', 'Kick', 'kick', { tune: 57, punch: 6, pitchDecay: 0.016, decay: 0.3, click: 0.85, drive: 0.28 }, ['house', 'tech']),
  // snares
  D('sclapsn', 'Clap Snare', 'Snare', 'snare', { tune: 200, tone: 0.4, decay: 0.26, snap: 2400, width: 2, drive: 0.15 }, ['house']),
  D('sdrill', 'Drill Snare', 'Snare', 'snare', { tune: 230, tone: 0.25, decay: 0.18, snap: 3200, width: 2.4, drive: 0.2 }, ['drill']),
  D('spiccolo', 'Piccolo Snare', 'Snare', 'snare', { tune: 280, tone: 0.55, decay: 0.2, snap: 2800, width: 1, drive: 0.1 }, ['live']),
  D('sdusty', 'Dusty Snare', 'Snare', 'snare', { tune: 175, tone: 0.5, decay: 0.3, snap: 1600, width: 1.2, drive: 0.35 }, ['lofi', 'boombap']),
  D('sgated', 'Gated Snare', 'Snare', 'snare', { tune: 190, tone: 0.4, decay: 0.5, snap: 2000, width: 0.6, drive: 0.2 }, ['80s']),
  D('sbrush', 'Brush Snare', 'Snare', 'snare', { tune: 210, tone: 0.2, decay: 0.28, snap: 2200, width: 1.8, drive: 0.05 }, ['jazz']),
  // claps
  D('cdrill', 'Drill Clap', 'Clap', 'clap', { freq: 2100, width: 1.2, spread: 0.005, decay: 0.16 }, ['drill']),
  D('creverb', 'Reverb Clap', 'Clap', 'clap', { freq: 1100, width: 1.6, spread: 0.03, decay: 0.7 }, ['ambient']),
  D('cstack', 'Stacked Clap', 'Clap', 'clap', { freq: 1500, width: 2.6, spread: 0.014, decay: 0.32 }, ['edm']),
  // hats
  D('hswing', 'Swing Hat', 'Hihat', 'hat', { tune: 44, hpf: 8200, decay: 0.06, metal: 0.75 }, ['jazz']),
  D('hdrillroll', 'Drill Roll', 'Hihat', 'hat', { tune: 56, hpf: 10200, decay: 0.02, metal: 0.65 }, ['drill', 'roll']),
  D('hwideopen', 'Wide Open', 'Hihat', 'hat', { tune: 42, hpf: 7000, decay: 0.7, metal: 0.8 }, ['edm']),
  D('hticky', 'Ticky Hat', 'Hihat', 'hat', { tune: 60, hpf: 11000, decay: 0.02, metal: 0.8 }, ['trap']),
  D('hana', 'Analog Hat', 'Hihat', 'hat', { tune: 46, hpf: 7800, decay: 0.08, metal: 0.55 }, ['techno']),
  // perc
  D('psoftshaker', 'Soft Shaker', 'Perc', 'hat', { tune: 56, hpf: 5600, decay: 0.06, metal: 0.02 }, ['organic']),
  D('platinrim', 'Latin Rim', 'Perc', 'perc', { tune: 1600, ratio: 1.4, decay: 0.05, noise: 0.08 }, ['latin']),
  D('ptabla', 'Tabla', 'Perc', 'tom', { tune: 280, bend: 1.4, decay: 0.24, noise: 0.15 }, ['world']),
  D('ptempleblock', 'Temple Block', 'Perc', 'perc', { tune: 1300, ratio: 1.7, decay: 0.06, noise: 0.05 }, ['world']),
  D('pfingersnap', 'Finger Snap', 'Perc', 'clap', { freq: 2200, width: 0.7, spread: 0.004, decay: 0.12 }, ['organic']),
  // toms
  D('trototom', 'Roto Tom', 'Tom', 'tom', { tune: 170, bend: 2, decay: 0.4, noise: 0.05 }, ['live']),
  D('tsubtom', 'Sub Tom', 'Tom', 'tom', { tune: 65, bend: 1.5, decay: 0.9, noise: 0.1 }, ['trap']),
  // cymbals
  D('cywash', 'Crash Wash', 'Cymbal', 'hat', { tune: 28, hpf: 3800, decay: 2.2, metal: 0.9 }, ['live']),
  D('cychina', 'China', 'Cymbal', 'hat', { tune: 34, hpf: 5000, decay: 1.1, metal: 1 }, ['metal']),
  D('cyreverse', 'Reverse Cymbal', 'Cymbal', 'hat', { tune: 40, hpf: 6000, decay: 1.4, metal: 0.95 }, ['transition']),
];

/* -------------------------------------------------------------- instruments */

export const INST_SOUNDS = [
  // bass
  M('bsub', 'Sub Bass', 'Bass', 'osc3', { wave1: 'sine', lvl1: 1, wave2: 'sine', coarse2: -12, lvl2: 0.5, lvl3: 0, cutoff: 400, res: 1, envAmt: 0.5, fdecay: 0.2, attack: 0.005, decay: 0.3, sustain: 0.9, release: 0.15, drive: 0.1 }, ['trap', '808']),
  M('bsaw', 'Saw Bass', 'Bass', 'osc3', { wave1: 'sawtooth', wave2: 'square', lvl2: 0.4, coarse3: -12, lvl3: 0.6, cutoff: 620, res: 6, envAmt: 2.2, fdecay: 0.22, sustain: 0.5, release: 0.12, drive: 0.25 }, ['house', 'techno']),
  M('bacid', 'Acid Line', 'Bass', 'osc3', { wave1: 'sawtooth', lvl1: 1, lvl2: 0, lvl3: 0, cutoff: 280, res: 18, envAmt: 3.4, fdecay: 0.16, attack: 0.002, decay: 0.14, sustain: 0.2, release: 0.08, drive: 0.5 }, ['acid', 'techno']),
  M('breese', 'Reese', 'Bass', 'osc3', { wave1: 'sawtooth', wave2: 'sawtooth', fine2: 22, lvl2: 1, wave3: 'sawtooth', fine3: -19, lvl3: 1, cutoff: 700, res: 4, envAmt: 1, fdecay: 0.5, sustain: 0.9, release: 0.2, drive: 0.3 }, ['dnb', 'dubstep']),
  M('bfm', 'FM Bass', 'Bass', 'fm', { ratio: 1, index: 6, idecay: 0.18, attack: 0.002, decay: 0.25, sustain: 0.5, release: 0.12, cutoff: 3000 }, ['funk']),
  M('bpluckb', 'Pluck Bass', 'Bass', 'pluck', { wave: 'sawtooth', spread: 4, sub: 0.7, cutoff: 900, res: 8, envAmt: 2.4, decay: 0.5, body: 0.15 }, ['house']),
  M('bgrowl', 'Growl', 'Bass', 'fm', { ratio: 2.5, index: 14, idecay: 0.5, attack: 0.01, decay: 0.6, sustain: 0.7, release: 0.2, cutoff: 2400 }, ['dubstep']),
  M('bwarm', 'Warm Analog', 'Bass', 'osc3', { wave1: 'triangle', wave2: 'sawtooth', lvl2: 0.55, coarse3: -12, lvl3: 0.35, cutoff: 520, res: 2, envAmt: 1.2, fdecay: 0.4, attack: 0.01, decay: 0.4, sustain: 0.7, release: 0.25, drive: 0.12 }, ['lofi']),

  // leads
  M('lsuper', 'Supersaw Lead', 'Lead', 'osc3', { wave1: 'sawtooth', wave2: 'sawtooth', fine2: 14, lvl2: 0.9, wave3: 'sawtooth', fine3: -13, lvl3: 0.9, cutoff: 5200, res: 2, envAmt: 1.4, fdecay: 0.4, attack: 0.01, decay: 0.5, sustain: 0.8, release: 0.35 }, ['edm', 'trance']),
  M('lsquare', 'Square Lead', 'Lead', 'osc3', { wave1: 'square', lvl1: 1, wave2: 'square', coarse2: 12, lvl2: 0.3, lvl3: 0, cutoff: 4200, res: 4, envAmt: 1.6, fdecay: 0.25, attack: 0.004, decay: 0.3, sustain: 0.7, release: 0.2 }, ['chiptune']),
  M('lbell', 'FM Bell', 'Lead', 'fm', { ratio: 3.5, index: 8, idecay: 0.6, attack: 0.002, decay: 1.2, sustain: 0.15, release: 0.8, cutoff: 12000 }, ['ambient']),
  M('lpluck', 'Pluck Lead', 'Lead', 'pluck', { wave: 'sawtooth', spread: 11, sub: 0.3, cutoff: 3200, res: 7, envAmt: 2.8, decay: 0.9, body: 0.3 }, ['house']),
  M('lstab', 'Stab', 'Lead', 'osc3', { wave1: 'sawtooth', wave2: 'square', lvl2: 0.7, coarse3: 7, lvl3: 0.4, cutoff: 2600, res: 8, envAmt: 2.6, fdecay: 0.14, attack: 0.002, decay: 0.16, sustain: 0.1, release: 0.12, drive: 0.2 }, ['house', 'garage']),
  M('lflute', 'Soft Flute', 'Lead', 'osc3', { wave1: 'sine', lvl1: 1, wave2: 'triangle', lvl2: 0.3, lvl3: 0, cutoff: 3200, res: 1, envAmt: 0.6, fdecay: 0.5, attack: 0.08, decay: 0.4, sustain: 0.85, release: 0.35 }, ['ambient']),
  M('lacid', 'Acid Lead', 'Lead', 'osc3', { wave1: 'sawtooth', lvl1: 1, lvl2: 0, lvl3: 0, cutoff: 900, res: 16, envAmt: 3, fdecay: 0.22, attack: 0.002, decay: 0.2, sustain: 0.3, release: 0.1, drive: 0.45 }, ['acid']),
  M('lhard', 'Hardstyle Screech', 'Lead', 'fm', { ratio: 4.75, index: 18, idecay: 0.9, attack: 0.005, decay: 0.8, sustain: 0.6, release: 0.25, cutoff: 9000 }, ['hard']),

  // pads
  M('pwarm', 'Warm Pad', 'Pad', 'osc3', { wave1: 'sawtooth', wave2: 'sawtooth', fine2: 9, lvl2: 0.8, wave3: 'triangle', coarse3: -12, lvl3: 0.6, cutoff: 1800, res: 1, envAmt: 1, fdecay: 1.6, attack: 0.6, decay: 1.2, sustain: 0.85, release: 1.4 }, ['ambient']),
  M('pglass', 'Glass Pad', 'Pad', 'fm', { ratio: 2, index: 2.5, idecay: 1.6, attack: 0.5, decay: 1.6, sustain: 0.7, release: 1.6, cutoff: 8000 }, ['ambient']),
  M('pstring', 'Strings', 'Pad', 'osc3', { wave1: 'sawtooth', wave2: 'sawtooth', fine2: 6, lvl2: 0.9, wave3: 'sawtooth', fine3: -6, lvl3: 0.9, cutoff: 2600, res: 1.5, envAmt: 0.8, fdecay: 1.2, attack: 0.35, decay: 1, sustain: 0.9, release: 0.9 }, ['cinematic']),
  M('pchoir', 'Choir', 'Pad', 'osc3', { wave1: 'triangle', wave2: 'sine', coarse2: 12, lvl2: 0.5, wave3: 'triangle', fine3: 12, lvl3: 0.7, cutoff: 2200, res: 1, envAmt: 0.5, fdecay: 1.5, attack: 0.5, decay: 1.5, sustain: 0.9, release: 1.6 }, ['cinematic']),
  M('pdark', 'Dark Drone', 'Pad', 'osc3', { wave1: 'sawtooth', coarse1: -12, lvl1: 1, wave2: 'square', coarse2: -12, fine2: 11, lvl2: 0.6, lvl3: 0.4, coarse3: -24, cutoff: 700, res: 3, envAmt: 0.6, fdecay: 2.5, attack: 1.2, decay: 2, sustain: 0.9, release: 2.5 }, ['ambient', 'horror']),
  M('phouse', 'Housepad', 'Pad', 'fm', { ratio: 1.5, index: 3, idecay: 1.2, attack: 0.25, decay: 1.4, sustain: 0.6, release: 1, cutoff: 4200 }, ['house']),

  // keys & plucks
  M('kepiano', 'E-piano', 'Keys', 'fm', { ratio: 2, index: 5, idecay: 0.35, attack: 0.003, decay: 0.9, sustain: 0.3, release: 0.5, cutoff: 7000 }, ['soul', 'lofi']),
  M('korgan', 'Organ', 'Keys', 'osc3', { wave1: 'sine', lvl1: 1, wave2: 'sine', coarse2: 12, lvl2: 0.7, wave3: 'sine', coarse3: 19, lvl3: 0.45, cutoff: 6000, res: 0.5, envAmt: 0, fdecay: 0.1, attack: 0.01, decay: 0.1, sustain: 1, release: 0.15 }, ['soul', 'house']),
  M('kmarimba', 'Marimba', 'Keys', 'fm', { ratio: 4, index: 4, idecay: 0.12, attack: 0.002, decay: 0.5, sustain: 0.05, release: 0.3, cutoff: 9000 }, ['organic']),
  M('kharp', 'Harp', 'Keys', 'pluck', { wave: 'triangle', spread: 6, sub: 0.15, cutoff: 4800, res: 3, envAmt: 1.8, decay: 1.6, body: 0.5 }, ['cinematic']),
  M('kguitar', 'Nylon String', 'Keys', 'pluck', { wave: 'sawtooth', spread: 8, sub: 0.25, cutoff: 2400, res: 5, envAmt: 2.2, decay: 1.2, body: 0.4 }, ['organic', 'lofi']),
  M('kkalimba', 'Kalimba', 'Keys', 'pluck', { wave: 'sine', spread: 3, sub: 0.1, cutoff: 3600, res: 2, envAmt: 2, decay: 0.7, body: 0.2 }, ['organic']),

  // fx
  M('fxriser', 'Riser', 'FX', 'osc3', { wave1: 'sawtooth', wave2: 'sawtooth', fine2: 30, lvl2: 1, wave3: 'square', fine3: -30, lvl3: 0.5, cutoff: 800, res: 12, envAmt: 4.5, fdecay: 2.5, attack: 1.5, decay: 2, sustain: 0.9, release: 0.4, drive: 0.3 }, ['edm']),
  M('fxzap', 'Zap', 'FX', 'fm', { ratio: 8, index: 20, idecay: 0.08, attack: 0.001, decay: 0.12, sustain: 0, release: 0.08, cutoff: 14000 }, ['edm']),
  M('fxdrop', 'Downlifter', 'FX', 'osc3', { wave1: 'sawtooth', lvl1: 1, wave2: 'square', coarse2: -12, lvl2: 0.6, lvl3: 0, cutoff: 4000, res: 8, envAmt: -4, fdecay: 1.6, attack: 0.01, decay: 1.6, sustain: 0.6, release: 0.6 }, ['edm']),
  M('fxnoise', 'Noise Sweep', 'FX', 'snare', { tune: 120, tone: 0, decay: 1.2, snap: 4000, width: 0.4, drive: 0.2 }, ['edm', 'transition']),

  /* --------------------------------------------------- G-funk expansion pack */

  // Electric pianos — Rhodes/Wurli family (more "piano" sounds)
  M('epclassic', 'Rhodes Classic', 'Keys', 'rhodes', { tine: 0.7, ratio: 1, bark: 0.14, decay: 2.4, tone: 4200, velTine: 0.6, release: 0.35, drive: 0.08 }, ['soul', 'gfunk', 'rhodes']),
  M('epbright', 'Rhodes Bright', 'Keys', 'rhodes', { tine: 1, ratio: 1, bark: 0.2, decay: 2.6, tone: 7200, velTine: 0.85, release: 0.35, drive: 0.12 }, ['soul', 'rhodes']),
  M('epmellow', 'Rhodes Mellow', 'Keys', 'rhodes', { tine: 0.35, ratio: 1, bark: 0.1, decay: 3, tone: 2600, velTine: 0.4, release: 0.4, drive: 0.04 }, ['soul', 'lofi', 'rhodes']),
  M('epsoul', 'Suitcase Soul', 'Keys', 'rhodes', { tine: 0.55, ratio: 1, bark: 0.12, decay: 3.4, tone: 3400, velTine: 0.5, release: 0.5, drive: 0.06 }, ['soul', 'gfunk']),
  M('epwurli', 'Wurli', 'Keys', 'rhodes', { tine: 0.85, ratio: 2, bark: 0.09, decay: 1.7, tone: 3800, velTine: 0.7, release: 0.3, drive: 0.28 }, ['soul', 'funk']),
  M('epdyno', 'Dyno EP', 'Keys', 'rhodes', { tine: 1, ratio: 1.5, bark: 0.26, decay: 3.2, tone: 9000, velTine: 0.95, release: 0.4, drive: 0.1 }, ['soul', 'rnb']),
  M('epclav', 'Clavinet', 'Keys', 'pluck', { wave: 'square', spread: 3, sub: 0.2, cutoff: 3200, res: 5, envAmt: 1.6, decay: 0.35, body: 0.12 }, ['funk', 'gfunk']),
  M('epgrand', 'Electric Grand', 'Keys', 'rhodes', { tine: 0.6, ratio: 3, bark: 0.18, decay: 2.8, tone: 6000, velTine: 0.7, release: 0.45, drive: 0.05 }, ['soul']),

  // G-funk leads (portamento glide synth)
  M('lgwhistle', 'G-Funk Whistle', 'Lead', 'glide', { wave: 'sawtooth', glide: 0.08, range: -5, vibRate: 5.5, vibDepth: 22, vibDelay: 0.3, sub: 0.2, cutoff: 5200, res: 4, envAmt: 1.2, fdecay: 0.5, attack: 0.02, decay: 0.4, sustain: 0.9, release: 0.3, drive: 0.15 }, ['gfunk', 'lead']),
  M('lgwhi2', 'Whistle Hi', 'Lead', 'glide', { wave: 'sine', glide: 0.1, range: 5, vibRate: 5.8, vibDepth: 26, vibDelay: 0.25, sub: 0.1, cutoff: 6000, res: 1.5, envAmt: 0.8, fdecay: 0.6, attack: 0.03, decay: 0.5, sustain: 0.9, release: 0.4, drive: 0.05 }, ['gfunk', 'lead']),
  M('ltalkbox', 'Talkbox Lead', 'Lead', 'glide', { wave: 'square', glide: 0.06, range: -3, vibRate: 6, vibDepth: 14, vibDelay: 0.2, sub: 0.15, cutoff: 3600, res: 6, envAmt: 1.5, fdecay: 0.3, attack: 0.006, decay: 0.3, sustain: 0.85, release: 0.25, drive: 0.2 }, ['gfunk', 'funk']),
  M('lmoogsolo', 'Moog Solo', 'Lead', 'glide', { wave: 'sawtooth', glide: 0.05, range: -7, vibRate: 0, vibDepth: 0, vibDelay: 0.3, sub: 0.4, cutoff: 3200, res: 5, envAmt: 2, fdecay: 0.4, attack: 0.004, decay: 0.3, sustain: 0.8, release: 0.2, drive: 0.25 }, ['gfunk', 'moog']),
  M('lspacey', 'Spacey Lead', 'Lead', 'glide', { wave: 'triangle', glide: 0.12, range: -12, vibRate: 4.5, vibDepth: 30, vibDelay: 0.4, sub: 0.3, cutoff: 4000, res: 2, envAmt: 1, fdecay: 1.2, attack: 0.05, decay: 0.6, sustain: 0.9, release: 0.9, drive: 0.05 }, ['gfunk', 'spacey', 'ambient']),

  // Spacey pads
  M('pspace', 'Space Pad', 'Pad', 'osc3', { wave1: 'sawtooth', wave2: 'triangle', fine2: 12, lvl2: 0.7, wave3: 'sine', coarse3: 12, lvl3: 0.5, cutoff: 2200, res: 1.5, envAmt: 1.2, fdecay: 2, attack: 0.9, decay: 1.6, sustain: 0.9, release: 2 }, ['gfunk', 'spacey', 'ambient']),
  M('pcosmic', 'Cosmic Sweep', 'Pad', 'fm', { ratio: 1.5, index: 4, idecay: 2.5, attack: 1, decay: 2, sustain: 0.7, release: 2, cutoff: 6000 }, ['spacey', 'ambient']),

  // Bass — phat synth bass + live-style
  M('bgsub', 'G-Funk Sub', 'Bass', 'osc3', { wave1: 'sine', lvl1: 1, wave2: 'triangle', coarse2: -12, lvl2: 0.4, lvl3: 0, cutoff: 500, res: 2, envAmt: 1, fdecay: 0.3, attack: 0.005, decay: 0.35, sustain: 0.85, release: 0.18, drive: 0.15 }, ['gfunk', 'sub']),
  M('bmoog', 'Moog Bass', 'Bass', 'osc3', { wave1: 'sawtooth', wave2: 'square', lvl2: 0.5, coarse3: -12, lvl3: 0.6, cutoff: 600, res: 5, envAmt: 2.4, fdecay: 0.24, attack: 0.004, decay: 0.2, sustain: 0.6, release: 0.12, drive: 0.3 }, ['gfunk', 'moog', 'funk']),
  M('bphat', 'Phat Square', 'Bass', 'osc3', { wave1: 'square', lvl1: 1, wave2: 'square', fine2: 12, lvl2: 0.4, coarse3: -12, lvl3: 0.5, cutoff: 700, res: 3, envAmt: 1.6, fdecay: 0.3, sustain: 0.7, release: 0.15, drive: 0.35 }, ['gfunk', 'funk']),
  M('bfinger', 'Fingered Bass', 'Bass', 'pluck', { wave: 'triangle', spread: 3, sub: 0.6, cutoff: 1400, res: 4, envAmt: 1.8, decay: 0.7, body: 0.25 }, ['funk', 'live']),

  // Electric guitar — muted funk / clean Strat (new category)
  M('gmute', 'Funk Mute', 'Guitar', 'pluck', { wave: 'sawtooth', spread: 5, sub: 0.1, cutoff: 2600, res: 7, envAmt: 2.4, decay: 0.28, body: 0.1 }, ['funk', 'gfunk']),
  M('gscratch', 'Chicken Scratch', 'Guitar', 'pluck', { wave: 'square', spread: 9, sub: 0, cutoff: 2800, res: 9, envAmt: 2.8, decay: 0.14, body: 0.05 }, ['funk']),
  M('gclean', 'Strat Clean', 'Guitar', 'pluck', { wave: 'sawtooth', spread: 7, sub: 0.15, cutoff: 3400, res: 4, envAmt: 2, decay: 0.9, body: 0.35 }, ['funk', 'clean']),
  M('gwah', 'Wah Stab', 'Guitar', 'osc3', { wave1: 'sawtooth', wave2: 'square', lvl2: 0.6, coarse3: 12, lvl3: 0.3, cutoff: 1600, res: 10, envAmt: 3, fdecay: 0.16, attack: 0.003, decay: 0.18, sustain: 0.15, release: 0.12, drive: 0.25 }, ['funk', 'wah']),

  /* ----------------------------------------- expansion: more instruments */
  // bass
  M('b2neuro', 'Neuro Bass', 'Bass', 'fm', { ratio: 3, index: 16, idecay: 0.4, attack: 0.005, decay: 0.5, sustain: 0.6, release: 0.2, cutoff: 2600 }, ['dnb', 'neuro']),
  M('b2808glide', '808 Glide', 'Bass', 'glide', { wave: 'sine', glide: 0.08, range: -12, vibRate: 0, vibDepth: 0, vibDelay: 0.3, sub: 0.5, cutoff: 420, res: 1, envAmt: 0.6, fdecay: 0.3, attack: 0.005, decay: 0.4, sustain: 0.9, release: 0.3, drive: 0.15 }, ['trap', '808']),
  M('b2wobble', 'Wobble', 'Bass', 'osc3', { wave1: 'sawtooth', wave2: 'square', lvl2: 0.6, coarse3: -12, lvl3: 0.5, cutoff: 500, res: 9, envAmt: 2.6, fdecay: 0.3, sustain: 0.7, release: 0.15, drive: 0.4 }, ['dubstep']),
  M('b2house', 'House Bass', 'Bass', 'osc3', { wave1: 'sawtooth', lvl1: 1, wave2: 'sine', coarse2: -12, lvl2: 0.6, lvl3: 0, cutoff: 560, res: 4, envAmt: 1.8, fdecay: 0.2, sustain: 0.5, release: 0.1, drive: 0.2 }, ['house']),
  M('b2dirty', 'Dirty Analog', 'Bass', 'osc3', { wave1: 'square', wave2: 'sawtooth', lvl2: 0.7, coarse3: -12, lvl3: 0.4, cutoff: 640, res: 6, envAmt: 2, fdecay: 0.28, sustain: 0.6, release: 0.14, drive: 0.5 }, ['techno', 'acid']),
  // leads
  M('l2trance', 'Trance Pluck', 'Lead', 'pluck', { wave: 'sawtooth', spread: 13, sub: 0.2, cutoff: 4200, res: 5, envAmt: 2.6, decay: 0.7, body: 0.2 }, ['trance', 'edm']),
  M('l2detune', 'Detune Saw', 'Lead', 'osc3', { wave1: 'sawtooth', wave2: 'sawtooth', fine2: 18, lvl2: 1, wave3: 'sawtooth', fine3: -16, lvl3: 1, cutoff: 6200, res: 2, envAmt: 1.2, fdecay: 0.4, attack: 0.006, decay: 0.4, sustain: 0.85, release: 0.3 }, ['edm']),
  M('l2chip', 'Chip Arp', 'Lead', 'osc3', { wave1: 'square', lvl1: 1, lvl2: 0, lvl3: 0, cutoff: 5000, res: 2, envAmt: 1, fdecay: 0.1, attack: 0.001, decay: 0.12, sustain: 0.6, release: 0.08 }, ['chiptune', '8bit']),
  M('l2vox', 'Vox Lead', 'Lead', 'fm', { ratio: 2, index: 3.5, idecay: 0.5, attack: 0.02, decay: 0.6, sustain: 0.7, release: 0.3, cutoff: 5000 }, ['pop']),
  M('l2panflute', 'Pan Flute', 'Lead', 'osc3', { wave1: 'sine', lvl1: 1, wave2: 'triangle', lvl2: 0.25, lvl3: 0, cutoff: 3600, res: 1, envAmt: 0.5, fdecay: 0.5, attack: 0.06, decay: 0.4, sustain: 0.85, release: 0.35 }, ['world', 'ambient']),
  // pads
  M('p2synthwave', 'Synthwave Pad', 'Pad', 'osc3', { wave1: 'sawtooth', wave2: 'square', fine2: 8, lvl2: 0.7, wave3: 'sawtooth', fine3: -8, lvl3: 0.7, cutoff: 2400, res: 1.5, envAmt: 1, fdecay: 1.8, attack: 0.4, decay: 1.4, sustain: 0.9, release: 1.6 }, ['synthwave', '80s']),
  M('p2air', 'Airy Pad', 'Pad', 'fm', { ratio: 3, index: 2, idecay: 2, attack: 0.8, decay: 1.8, sustain: 0.7, release: 2, cutoff: 9000 }, ['ambient']),
  M('p2motion', 'Motion Pad', 'Pad', 'osc3', { wave1: 'sawtooth', wave2: 'triangle', fine2: 14, lvl2: 0.8, wave3: 'sine', coarse3: 12, lvl3: 0.5, cutoff: 1800, res: 2, envAmt: 1.4, fdecay: 2.2, attack: 0.7, decay: 1.8, sustain: 0.9, release: 2.2 }, ['ambient', 'cinematic']),
  // keys
  M('k2houseorgan', 'House Organ', 'Keys', 'osc3', { wave1: 'sine', lvl1: 1, wave2: 'sine', coarse2: 12, lvl2: 0.8, wave3: 'sine', coarse3: 19, lvl3: 0.5, cutoff: 6500, res: 0.5, envAmt: 0, fdecay: 0.1, attack: 0.005, decay: 0.1, sustain: 1, release: 0.12, drive: 0.15 }, ['house']),
  M('k2musicbox', 'Music Box', 'Keys', 'fm', { ratio: 5, index: 5, idecay: 0.4, attack: 0.001, decay: 1, sustain: 0.05, release: 0.5, cutoff: 11000 }, ['ambient', 'cinematic']),
  M('k2vibraphone', 'Vibraphone', 'Keys', 'fm', { ratio: 4, index: 3, idecay: 0.5, attack: 0.003, decay: 1.4, sustain: 0.1, release: 0.6, cutoff: 8000 }, ['jazz']),
  M('k2toypiano', 'Toy Piano', 'Keys', 'fm', { ratio: 3, index: 6, idecay: 0.2, attack: 0.002, decay: 0.7, sustain: 0.05, release: 0.3, cutoff: 9000 }, ['lofi']),
  // guitar
  M('g2power', 'Power Chord', 'Guitar', 'osc3', { wave1: 'sawtooth', wave2: 'sawtooth', coarse2: 7, lvl2: 0.8, coarse3: 12, lvl3: 0.5, cutoff: 2400, res: 3, envAmt: 1, fdecay: 0.4, attack: 0.004, decay: 0.4, sustain: 0.7, release: 0.3, drive: 0.6 }, ['rock', 'metal']),
  M('g2jazz', 'Jazz Guitar', 'Guitar', 'pluck', { wave: 'triangle', spread: 6, sub: 0.2, cutoff: 2600, res: 3, envAmt: 1.6, decay: 1, body: 0.4 }, ['jazz']),
  M('g2acoustic', 'Acoustic Guitar', 'Guitar', 'pluck', { wave: 'sawtooth', spread: 9, sub: 0.2, cutoff: 3000, res: 4, envAmt: 2, decay: 1.1, body: 0.45 }, ['folk', 'organic']),
  // fx
  M('fx2impact', 'Impact', 'FX', 'kick', { tune: 40, punch: 10, pitchDecay: 0.15, decay: 1.4, click: 0.2, drive: 0.4 }, ['cinematic']),
  M('fx2uplift', 'Uplifter', 'FX', 'snare', { tune: 100, tone: 0, decay: 1.6, snap: 3000, width: 0.3, drive: 0.2 }, ['transition']),
  M('fx2laser', 'Laser', 'FX', 'fm', { ratio: 10, index: 18, idecay: 0.2, attack: 0.001, decay: 0.3, sustain: 0, release: 0.1, cutoff: 14000 }, ['scifi']),
  M('fx2subdrop', 'Sub Drop', 'FX', 'osc3', { wave1: 'sine', lvl1: 1, lvl2: 0, lvl3: 0, cutoff: 300, res: 1, envAmt: -3, fdecay: 1.4, attack: 0.005, decay: 1.4, sustain: 0.4, release: 0.6 }, ['edm']),
];

export const LIBRARY = [...DRUM_SOUNDS, ...INST_SOUNDS];

export const DRUM_CATS = ['Kick', 'Snare', 'Clap', 'Hihat', 'Perc', 'Tom', 'Cymbal'];
export const INST_CATS = ['Bass', 'Lead', 'Pad', 'Keys', 'Guitar', 'FX'];

export const soundById = (id) => LIBRARY.find((x) => x.id === id) || null;

/** Colour used for a channel/sound. Brand rule (BUILD_SPEC #1): exactly three
    accents — coral, lime, blue — cycled per item by order, never a 4th hue. */
export const BRAND_CYCLE = ['#ff746e', '#85c425', '#36b2ff'];
export const soundColor = (sound, index = 0) => BRAND_CYCLE[((index % 3) + 3) % 3];

export function searchLibrary(query, extra = []) {
  const q = (query || '').trim().toLowerCase();
  const all = [...LIBRARY, ...extra];
  if (!q) return all;
  return all.filter((sd) => sd.name.toLowerCase().includes(q)
    || sd.cat.toLowerCase().includes(q)
    || (sd.tags || []).some((t) => t.includes(q)));
}

/* ------------------------------------------------------------ user presets */

const USER_KEY = 'flowstudio.userSounds.v1';

export function loadUserSounds() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.map((x) => ({ ...x, user: true })) : [];
  } catch (e) {
    return [];
  }
}

export function saveUserSound(sound) {
  const list = loadUserSounds().filter((x) => x.id !== sound.id);
  const next = [...list, { ...sound, user: true }];
  try { window.localStorage.setItem(USER_KEY, JSON.stringify(next)); } catch (e) { /* quota */ }
  return next;
}

export function removeUserSound(id) {
  const next = loadUserSounds().filter((x) => x.id !== id);
  try { window.localStorage.setItem(USER_KEY, JSON.stringify(next)); } catch (e) { /* quota */ }
  return next;
}
