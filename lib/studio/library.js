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

  /* ------------------------------------------- expansion 2: more drums */
  // kicks
  D('kreggaeton', 'Reggaeton Kick', 'Kick', 'kick', { tune: 44, punch: 8, pitchDecay: 0.03, decay: 0.6, click: 0.5, drive: 0.35 }, ['reggaeton', 'latin']),
  D('kgarage', 'Garage Kick', 'Kick', 'kick', { tune: 50, punch: 9, pitchDecay: 0.02, decay: 0.42, click: 0.6, drive: 0.3 }, ['garage', 'uk']),
  D('khardstyle', 'Hardstyle Kick', 'Kick', 'kick', { tune: 40, punch: 14, pitchDecay: 0.04, decay: 0.9, click: 0.3, drive: 0.9 }, ['hardstyle']),
  D('kjungle', 'Jungle Kick', 'Kick', 'kick', { tune: 52, punch: 7, pitchDecay: 0.02, decay: 0.4, click: 0.55, drive: 0.5 }, ['jungle', 'breakbeat']),
  D('kamapiano', 'Amapiano Log', 'Kick', 'kick', { tune: 46, punch: 6, pitchDecay: 0.05, decay: 0.7, click: 0.35, drive: 0.25 }, ['amapiano']),
  D('kphonk', 'Phonk Kick', 'Kick', 'kick', { tune: 38, punch: 6, pitchDecay: 0.08, decay: 1.4, click: 0.2, drive: 0.4 }, ['phonk', 'memphis']),
  D('kminimaltech', 'Minimal Tech Kick', 'Kick', 'kick', { tune: 56, punch: 8, pitchDecay: 0.016, decay: 0.3, click: 0.8, drive: 0.35 }, ['minimal', 'tech']),
  // snares
  D('sreggae', 'Reggae Snare', 'Snare', 'snare', { tune: 190, tone: 0.5, decay: 0.3, snap: 1900, width: 1.2, drive: 0.1 }, ['reggae']),
  D('strapmix', 'Trap Mix Snare', 'Snare', 'snare', { tune: 220, tone: 0.35, decay: 0.2, snap: 2900, width: 1.8, drive: 0.18 }, ['trap']),
  D('srullo', 'Roll Snare', 'Snare', 'snare', { tune: 240, tone: 0.3, decay: 0.14, snap: 3200, width: 2, drive: 0.15 }, ['drill', 'roll']),
  D('sdeephouse', 'Deep Snare', 'Snare', 'snare', { tune: 160, tone: 0.55, decay: 0.4, snap: 1500, width: 0.9, drive: 0.25 }, ['house', 'deep']),
  // claps
  D('chard', 'Hard Clap', 'Clap', 'clap', { freq: 1800, width: 1.6, spread: 0.008, decay: 0.24 }, ['edm']),
  D('csoft', 'Soft Clap', 'Clap', 'clap', { freq: 1000, width: 1.2, spread: 0.02, decay: 0.4 }, ['lofi']),
  // hats
  D('htrapopen', 'Trap Open', 'Hihat', 'hat', { tune: 52, hpf: 9600, decay: 0.4, metal: 0.7 }, ['trap']),
  D('hminimalhat', 'Minimal Hat', 'Hihat', 'hat', { tune: 48, hpf: 8600, decay: 0.03, metal: 0.55 }, ['minimal']),
  D('hfoley', 'Foley Tick', 'Hihat', 'hat', { tune: 58, hpf: 6200, decay: 0.05, metal: 0.02 }, ['organic']),
  // percussion (incl. world)
  D('ptimbale', 'Timbale', 'Perc', 'perc', { tune: 1400, ratio: 1.5, decay: 0.2, noise: 0.1 }, ['latin']),
  D('pdjembe', 'Djembe', 'Perc', 'tom', { tune: 200, bend: 1.4, decay: 0.3, noise: 0.3 }, ['world', 'africa']),
  D('pudu', 'Udu', 'Perc', 'tom', { tune: 150, bend: 1.6, decay: 0.4, noise: 0.2 }, ['world']),
  D('pshakerlong', 'Long Shaker', 'Perc', 'hat', { tune: 56, hpf: 5000, decay: 0.14, metal: 0.02 }, ['organic']),
  D('pguiro', 'Guiro', 'Perc', 'perc', { tune: 1200, ratio: 2.2, decay: 0.12, noise: 0.6 }, ['latin']),
  D('pmaraca', 'Maraca', 'Perc', 'hat', { tune: 60, hpf: 5800, decay: 0.05, metal: 0.02 }, ['latin']),
  D('pzap', 'Perc Zap', 'Perc', 'perc', { tune: 2000, ratio: 3, decay: 0.06, noise: 0 }, ['electronic']),
  D('pblip', 'Blip', 'Perc', 'perc', { tune: 2400, ratio: 2, decay: 0.04, noise: 0 }, ['electronic', 'chip']),
  // toms
  D('telectro', 'Electro Tom', 'Tom', 'tom', { tune: 120, bend: 1.8, decay: 0.35, noise: 0.05 }, ['electronic']),
  D('ttaiko', 'Taiko', 'Tom', 'tom', { tune: 80, bend: 1.3, decay: 1, noise: 0.25 }, ['cinematic', 'world']),
  // cymbals
  D('cysplash2', 'Splash', 'Cymbal', 'hat', { tune: 46, hpf: 7600, decay: 0.5, metal: 1 }, ['live']),
  D('cyridejazz', 'Jazz Ride', 'Cymbal', 'hat', { tune: 38, hpf: 6800, decay: 1.1, metal: 0.85 }, ['jazz']),
  D('cybell', 'Bell Cymbal', 'Cymbal', 'hat', { tune: 50, hpf: 6000, decay: 0.8, metal: 1 }, ['orchestral']),
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

  /* ------------------------------------- expansion 2: more instruments */
  // bass
  M('b3reese2', 'Deep Reese', 'Bass', 'osc3', { wave1: 'sawtooth', wave2: 'sawtooth', fine2: 26, lvl2: 1, wave3: 'sawtooth', fine3: -23, lvl3: 1, cutoff: 620, res: 5, envAmt: 1.2, fdecay: 0.6, sustain: 0.9, release: 0.2, drive: 0.35 }, ['dnb', 'dubstep']),
  M('b3fmgrowl', 'FM Growl', 'Bass', 'fm', { ratio: 2, index: 12, idecay: 0.6, attack: 0.005, decay: 0.6, sustain: 0.7, release: 0.2, cutoff: 2200 }, ['dubstep', 'neuro']),
  M('b3808hard', 'Hard 808', 'Bass', 'osc3', { wave1: 'sine', lvl1: 1, wave2: 'triangle', coarse2: -12, lvl2: 0.5, lvl3: 0, cutoff: 460, res: 2, envAmt: 0.8, fdecay: 0.25, attack: 0.004, decay: 0.3, sustain: 0.9, release: 0.2, drive: 0.4 }, ['trap', '808']),
  M('b3plucksub', 'Pluck Sub', 'Bass', 'pluck', { wave: 'sine', spread: 2, sub: 0.8, cutoff: 700, res: 4, envAmt: 1.8, decay: 0.4, body: 0.2 }, ['house', 'garage']),
  M('b3uk', 'UKG Bass', 'Bass', 'osc3', { wave1: 'sawtooth', wave2: 'square', lvl2: 0.5, coarse3: -12, lvl3: 0.5, cutoff: 560, res: 6, envAmt: 2, fdecay: 0.2, sustain: 0.5, release: 0.1, drive: 0.28 }, ['garage', 'uk']),
  M('b3funkslap', 'Funk Slap', 'Bass', 'pluck', { wave: 'triangle', spread: 4, sub: 0.5, cutoff: 1600, res: 5, envAmt: 2.2, decay: 0.5, body: 0.25 }, ['funk']),
  M('b3synthwave', 'Synthwave Bass', 'Bass', 'osc3', { wave1: 'sawtooth', wave2: 'square', lvl2: 0.4, coarse3: -12, lvl3: 0.5, cutoff: 640, res: 3, envAmt: 1.4, fdecay: 0.4, sustain: 0.8, release: 0.2, drive: 0.15 }, ['synthwave', '80s']),
  M('b3trapstab', 'Trap Stab Bass', 'Bass', 'osc3', { wave1: 'square', lvl1: 1, wave2: 'sawtooth', lvl2: 0.5, coarse3: -12, lvl3: 0.4, cutoff: 720, res: 7, envAmt: 2.2, fdecay: 0.16, sustain: 0.3, release: 0.1, drive: 0.35 }, ['trap']),
  // leads
  M('l3trance2', 'Trance Lead', 'Lead', 'osc3', { wave1: 'sawtooth', wave2: 'sawtooth', fine2: 12, lvl2: 0.9, wave3: 'sawtooth', fine3: -12, lvl3: 0.9, cutoff: 5600, res: 2, envAmt: 1.4, fdecay: 0.5, attack: 0.01, decay: 0.5, sustain: 0.85, release: 0.4 }, ['trance']),
  M('l3pluck2', 'Bright Pluck', 'Lead', 'pluck', { wave: 'sawtooth', spread: 10, sub: 0.2, cutoff: 4600, res: 6, envAmt: 2.6, decay: 0.6, body: 0.2 }, ['house', 'edm']),
  M('l3fmbrass', 'FM Brass', 'Lead', 'fm', { ratio: 1, index: 5, idecay: 0.5, attack: 0.02, decay: 0.5, sustain: 0.8, release: 0.25, cutoff: 5000 }, ['funk', '80s']),
  M('l3sync', 'Sync Lead', 'Lead', 'osc3', { wave1: 'sawtooth', wave2: 'square', coarse2: 7, lvl2: 0.7, coarse3: 12, lvl3: 0.4, cutoff: 4000, res: 6, envAmt: 2.2, fdecay: 0.3, attack: 0.004, decay: 0.3, sustain: 0.6, release: 0.2, drive: 0.2 }, ['edm']),
  M('l3chip2', 'Chip Lead', 'Lead', 'osc3', { wave1: 'square', lvl1: 1, wave2: 'square', coarse2: 12, lvl2: 0.4, lvl3: 0, cutoff: 5200, res: 2, envAmt: 1, fdecay: 0.12, attack: 0.001, decay: 0.14, sustain: 0.6, release: 0.08 }, ['chiptune', '8bit']),
  M('l3whistle', 'Glide Whistle', 'Lead', 'glide', { wave: 'sine', glide: 0.1, range: -5, vibRate: 5.5, vibDepth: 24, vibDelay: 0.3, sub: 0.15, cutoff: 5600, res: 2, envAmt: 0.9, fdecay: 0.6, attack: 0.03, decay: 0.5, sustain: 0.9, release: 0.4, drive: 0.05 }, ['gfunk']),
  M('l3voxpad', 'Vox Pad Lead', 'Lead', 'fm', { ratio: 2, index: 2.5, idecay: 0.8, attack: 0.05, decay: 0.8, sustain: 0.8, release: 0.5, cutoff: 5400 }, ['pop', 'ambient']),
  M('l3square2', 'Fat Square', 'Lead', 'osc3', { wave1: 'square', lvl1: 1, wave2: 'square', fine2: 10, lvl2: 0.6, coarse3: -12, lvl3: 0.4, cutoff: 4400, res: 4, envAmt: 1.6, fdecay: 0.3, attack: 0.004, decay: 0.3, sustain: 0.7, release: 0.2 }, ['edm']),
  M('l3sawstack', 'Saw Stack', 'Lead', 'osc3', { wave1: 'sawtooth', wave2: 'sawtooth', fine2: 20, lvl2: 1, wave3: 'sawtooth', fine3: -18, lvl3: 1, cutoff: 6600, res: 1.5, envAmt: 1, fdecay: 0.4, attack: 0.008, decay: 0.4, sustain: 0.9, release: 0.35 }, ['edm', 'festival']),
  M('l3bell2', 'FM Bell 2', 'Lead', 'fm', { ratio: 7, index: 6, idecay: 0.5, attack: 0.002, decay: 1.4, sustain: 0.1, release: 0.7, cutoff: 12000 }, ['ambient']),
  // pads
  M('p3warm2', 'Soft Warm Pad', 'Pad', 'osc3', { wave1: 'sawtooth', wave2: 'triangle', fine2: 8, lvl2: 0.7, wave3: 'sine', coarse3: -12, lvl3: 0.5, cutoff: 1900, res: 1, envAmt: 0.8, fdecay: 1.8, attack: 0.6, decay: 1.4, sustain: 0.9, release: 1.6 }, ['ambient']),
  M('p3glass2', 'Crystal Pad', 'Pad', 'fm', { ratio: 3.5, index: 2, idecay: 1.8, attack: 0.6, decay: 1.8, sustain: 0.7, release: 1.8, cutoff: 10000 }, ['ambient']),
  M('p3strings2', 'Lush Strings', 'Pad', 'osc3', { wave1: 'sawtooth', wave2: 'sawtooth', fine2: 5, lvl2: 0.9, wave3: 'sawtooth', fine3: -5, lvl3: 0.9, cutoff: 2800, res: 1.5, envAmt: 0.7, fdecay: 1.3, attack: 0.3, decay: 1.1, sustain: 0.9, release: 1 }, ['cinematic']),
  M('p3choir2', 'Voices', 'Pad', 'osc3', { wave1: 'triangle', wave2: 'sine', coarse2: 12, lvl2: 0.5, wave3: 'triangle', fine3: 12, lvl3: 0.7, cutoff: 2400, res: 1, envAmt: 0.5, fdecay: 1.6, attack: 0.5, decay: 1.6, sustain: 0.9, release: 1.7 }, ['cinematic']),
  M('p3synthwave2', 'Retro Pad', 'Pad', 'osc3', { wave1: 'sawtooth', wave2: 'square', fine2: 8, lvl2: 0.7, wave3: 'sawtooth', fine3: -8, lvl3: 0.7, cutoff: 2200, res: 1.5, envAmt: 1, fdecay: 1.8, attack: 0.5, decay: 1.5, sustain: 0.9, release: 1.7 }, ['synthwave', '80s']),
  M('p3ambient', 'Deep Ambient', 'Pad', 'fm', { ratio: 1.5, index: 3, idecay: 2.4, attack: 1.2, decay: 2, sustain: 0.7, release: 2.4, cutoff: 5000 }, ['ambient']),
  M('p3dark2', 'Dark Pad', 'Pad', 'osc3', { wave1: 'sawtooth', coarse1: -12, lvl1: 1, wave2: 'square', coarse2: -12, fine2: 9, lvl2: 0.6, lvl3: 0.4, coarse3: -24, cutoff: 800, res: 3, envAmt: 0.6, fdecay: 2.5, attack: 1.2, decay: 2, sustain: 0.9, release: 2.5 }, ['horror', 'ambient']),
  M('p3evolving', 'Evolving Pad', 'Pad', 'osc3', { wave1: 'sawtooth', wave2: 'triangle', fine2: 14, lvl2: 0.8, wave3: 'sine', coarse3: 12, lvl3: 0.5, cutoff: 2000, res: 2, envAmt: 1.4, fdecay: 2.4, attack: 0.9, decay: 2, sustain: 0.9, release: 2.4 }, ['cinematic', 'ambient']),
  // keys
  M('k3rhodes2', 'Warm Rhodes', 'Keys', 'rhodes', { tine: 0.5, ratio: 1, bark: 0.12, decay: 2.8, tone: 3600, velTine: 0.5, release: 0.4, drive: 0.06 }, ['soul', 'lofi']),
  M('k3wurli2', 'Dirty Wurli', 'Keys', 'rhodes', { tine: 0.9, ratio: 2, bark: 0.12, decay: 1.8, tone: 4000, velTine: 0.75, release: 0.3, drive: 0.35 }, ['funk', 'soul']),
  M('k3clav2', 'Funky Clav', 'Keys', 'pluck', { wave: 'square', spread: 3, sub: 0.2, cutoff: 3400, res: 6, envAmt: 1.8, decay: 0.3, body: 0.1 }, ['funk', 'gfunk']),
  M('k3organ2', 'Drawbar Organ', 'Keys', 'osc3', { wave1: 'sine', lvl1: 1, wave2: 'sine', coarse2: 12, lvl2: 0.8, wave3: 'sine', coarse3: 19, lvl3: 0.5, cutoff: 6200, res: 0.5, envAmt: 0, fdecay: 0.1, attack: 0.008, decay: 0.1, sustain: 1, release: 0.14 }, ['soul', 'gospel']),
  M('k3marimba2', 'Soft Marimba', 'Keys', 'fm', { ratio: 4, index: 3.5, idecay: 0.14, attack: 0.002, decay: 0.6, sustain: 0.05, release: 0.3, cutoff: 8500 }, ['organic']),
  M('k3vibes2', 'Jazz Vibes', 'Keys', 'fm', { ratio: 4, index: 2.5, idecay: 0.6, attack: 0.003, decay: 1.6, sustain: 0.1, release: 0.7, cutoff: 8000 }, ['jazz']),
  M('k3musicbox2', 'Lullaby Box', 'Keys', 'fm', { ratio: 6, index: 5, idecay: 0.45, attack: 0.001, decay: 1.1, sustain: 0.05, release: 0.6, cutoff: 11500 }, ['cinematic', 'ambient']),
  M('k3harpsi', 'Harpsichord', 'Keys', 'pluck', { wave: 'sawtooth', spread: 5, sub: 0.1, cutoff: 4200, res: 4, envAmt: 2.2, decay: 0.7, body: 0.15 }, ['baroque']),
  M('k3celesta', 'Celesta', 'Keys', 'fm', { ratio: 5, index: 4, idecay: 0.5, attack: 0.001, decay: 1.2, sustain: 0.05, release: 0.6, cutoff: 12000 }, ['cinematic']),
  M('k3kalimba2', 'Soft Kalimba', 'Keys', 'pluck', { wave: 'sine', spread: 3, sub: 0.1, cutoff: 3400, res: 2, envAmt: 2, decay: 0.8, body: 0.25 }, ['organic']),
  M('k3harp2', 'Concert Harp', 'Keys', 'pluck', { wave: 'triangle', spread: 6, sub: 0.15, cutoff: 5000, res: 3, envAmt: 1.8, decay: 1.8, body: 0.5 }, ['cinematic']),
  M('k3koto', 'Koto', 'Keys', 'pluck', { wave: 'sawtooth', spread: 7, sub: 0.15, cutoff: 3000, res: 5, envAmt: 2.4, decay: 1, body: 0.3 }, ['world', 'japan']),
  // guitar
  M('g3clean2', 'Clean Guitar', 'Guitar', 'pluck', { wave: 'sawtooth', spread: 8, sub: 0.15, cutoff: 3200, res: 4, envAmt: 2, decay: 1, body: 0.4 }, ['clean']),
  M('g3muted2', 'Muted Guitar', 'Guitar', 'pluck', { wave: 'sawtooth', spread: 5, sub: 0.1, cutoff: 2400, res: 7, envAmt: 2.4, decay: 0.3, body: 0.1 }, ['funk']),
  M('g3jazz2', 'Warm Jazz Gtr', 'Guitar', 'pluck', { wave: 'triangle', spread: 6, sub: 0.2, cutoff: 2400, res: 3, envAmt: 1.6, decay: 1.1, body: 0.45 }, ['jazz']),
  M('g3acoustic2', 'Steel Acoustic', 'Guitar', 'pluck', { wave: 'sawtooth', spread: 10, sub: 0.2, cutoff: 3200, res: 4, envAmt: 2, decay: 1.2, body: 0.5 }, ['folk']),
  M('g3power2', 'Dist Power', 'Guitar', 'osc3', { wave1: 'sawtooth', wave2: 'sawtooth', coarse2: 7, lvl2: 0.8, coarse3: 12, lvl3: 0.5, cutoff: 2200, res: 3, envAmt: 1, fdecay: 0.4, attack: 0.004, decay: 0.4, sustain: 0.7, release: 0.3, drive: 0.7 }, ['metal', 'rock']),
  // fx
  M('fx3riser2', 'Long Riser', 'FX', 'osc3', { wave1: 'sawtooth', wave2: 'sawtooth', fine2: 30, lvl2: 1, wave3: 'square', fine3: -30, lvl3: 0.5, cutoff: 700, res: 12, envAmt: 5, fdecay: 3, attack: 2, decay: 2.4, sustain: 0.9, release: 0.4, drive: 0.3 }, ['edm', 'transition']),
  M('fx3down2', 'Deep Downlifter', 'FX', 'osc3', { wave1: 'sawtooth', lvl1: 1, wave2: 'square', coarse2: -12, lvl2: 0.6, lvl3: 0, cutoff: 3600, res: 8, envAmt: -5, fdecay: 2, attack: 0.01, decay: 2, sustain: 0.6, release: 0.6 }, ['edm', 'transition']),
  M('fx3impact2', 'Boom Impact', 'FX', 'kick', { tune: 34, punch: 12, pitchDecay: 0.2, decay: 1.8, click: 0.15, drive: 0.45 }, ['cinematic']),
  M('fx3laser2', 'Sci-fi Laser', 'FX', 'fm', { ratio: 12, index: 20, idecay: 0.15, attack: 0.001, decay: 0.25, sustain: 0, release: 0.1, cutoff: 15000 }, ['scifi']),
  M('fx3sub2', 'Deep Sub Drop', 'FX', 'osc3', { wave1: 'sine', lvl1: 1, lvl2: 0, lvl3: 0, cutoff: 260, res: 1, envAmt: -3.5, fdecay: 1.8, attack: 0.005, decay: 1.8, sustain: 0.4, release: 0.7 }, ['edm']),
  M('fx3noise2', 'White Sweep', 'FX', 'snare', { tune: 110, tone: 0, decay: 1.8, snap: 4200, width: 0.3, drive: 0.2 }, ['transition']),
  M('fx3reverse', 'Reverse Swell', 'FX', 'hat', { tune: 36, hpf: 4000, decay: 1.8, metal: 0.9 }, ['transition']),
];

/* --------------------------------------------------- factory sample sounds */
// Real recorded one-shots bundled with the app (CC0 1.0 — see
// public/samples/**/CREDITS.md). Unlike the synth presets these are audio
// files: `kind:'sample'` + a same-origin `url`. Picking one loads it into the
// project as a sampler channel — this is how Fuse gets a professional,
// non-synthetic drum sound.
const SMP = (id, name, cat, url, tags = [], params = null) => ({ id, name, cat, url, tags, params, kind: 'sample' });
// Multisampled: `zones` = [{ url, root }], `url` is the preview note.
const SMPZ = (id, name, cat, zones, url, tags = [], params = null) => ({ id, name, cat, zones, url, tags, params, kind: 'sample' });

export const SAMPLE_SOUNDS = [
  SMP('smpk_vintage', 'Vintage Kick', 'Kick', '/samples/boombap/kick.wav', ['boombap', 'lofi', 'real']),
  SMP('smps_vintage', 'Vintage Snare', 'Snare', '/samples/boombap/snare.wav', ['boombap', 'lofi', 'real']),
  SMP('smph_closed', 'Vinyl Closed Hat', 'Hihat', '/samples/boombap/hat.wav', ['boombap', 'real']),
  SMP('smph_open', 'Vinyl Open Hat', 'Hihat', '/samples/boombap/openhat.wav', ['boombap', 'real']),
  SMP('smpc_vintage', 'Vintage Clap', 'Clap', '/samples/boombap/clap.wav', ['boombap', 'real']),
  SMP('smp808_punch', '808 Punch (A1)', 'Bass', '/samples/boombap/808.wav', ['808', 'bass', 'real']),
  // Trap kit (Boochi44 free-drum-samples "Hard Trap", CC0).
  SMP('smpk_trap', 'Trap Kick', 'Kick', '/samples/trap/kick.wav', ['trap', 'real']),
  SMP('smps_trap', 'Trap Snare', 'Snare', '/samples/trap/snare.wav', ['trap', 'real']),
  SMP('smph_trap', 'Trap Hat', 'Hihat', '/samples/trap/hat.wav', ['trap', 'real']),
  SMP('smpho_trap', 'Trap Open Hat', 'Hihat', '/samples/trap/openhat.wav', ['trap', 'real']),
  SMP('smpc_trap', 'Trap Clap', 'Clap', '/samples/trap/clap.wav', ['trap', 'real']),
  SMP('smpp_trap', 'Trap Cowbell', 'Perc', '/samples/trap/cowbell.wav', ['trap', 'real']),
  // Real hand percussion (VCSL, CC0).
  SMP('smpp_cowbell', 'Cowbell (real)', 'Perc', '/samples/perc/cowbell.wav', ['perc', 'latin', 'real']),
  SMP('smpp_claves', 'Claves', 'Perc', '/samples/perc/claves.wav', ['perc', 'latin', 'real']),
  SMP('smpp_wood', 'Woodblock', 'Perc', '/samples/perc/woodblock.wav', ['perc', 'real']),
  SMP('smpp_shaker', 'Shaker', 'Perc', '/samples/perc/shaker.wav', ['perc', 'organic', 'real']),
  // Melodic instruments (VCSL, CC0) — real recorded keys, multisampled C3/C4/C5
  // so they stay natural across the keyboard. `url` is the preview note.
  SMPZ('smp_ep', 'Electric Piano (Rhodes)', 'Keys', [
    { url: '/samples/keys/ep-c3.wav', root: 48 },
    { url: '/samples/keys/ep-c4.wav', root: 60 },
    { url: '/samples/keys/ep-c5.wav', root: 72 },
  ], '/samples/keys/ep-c4.wav', ['rhodes', 'ep', 'keys', 'real'], { release: 0.35, decay: 4, sustain: 1 }),
  SMPZ('smp_piano', 'Grand Piano', 'Keys', [
    { url: '/samples/keys/piano-c3.wav', root: 48 },
    { url: '/samples/keys/piano-c4.wav', root: 60 },
    { url: '/samples/keys/piano-c5.wav', root: 72 },
  ], '/samples/keys/piano-c4.wav', ['piano', 'keys', 'real'], { release: 0.3, decay: 4, sustain: 1 }),
  SMPZ('smp_marimba', 'Marimba', 'Keys', [
    { url: '/samples/mallets/marimba-c2.wav', root: 36 },
    { url: '/samples/mallets/marimba-c4.wav', root: 60 },
    { url: '/samples/mallets/marimba-c6.wav', root: 84 },
  ], '/samples/mallets/marimba-c4.wav', ['marimba', 'mallet', 'keys', 'real'], { release: 0.25, decay: 4, sustain: 1 }),
  SMPZ('smp_glock', 'Glockenspiel', 'Keys', [
    { url: '/samples/mallets/glock-c5.wav', root: 72 },
    { url: '/samples/mallets/glock-c6.wav', root: 84 },
    { url: '/samples/mallets/glock-c7.wav', root: 96 },
  ], '/samples/mallets/glock-c6.wav', ['glockenspiel', 'bells', 'keys', 'real'], { release: 0.5, decay: 4, sustain: 1 }),
  SMPZ('smp_vibes', 'Vibraphone', 'Keys', [
    { url: '/samples/mallets/vibes-c3.wav', root: 48 },
    { url: '/samples/mallets/vibes-c5.wav', root: 72 },
  ], '/samples/mallets/vibes-c3.wav', ['vibraphone', 'mallet', 'jazz', 'real'], { release: 0.6, decay: 4, sustain: 1 }),
  SMPZ('smp_xylo', 'Xylophone', 'Keys', [
    { url: '/samples/mallets/xylo-c4.wav', root: 60 },
    { url: '/samples/mallets/xylo-c5.wav', root: 72 },
    { url: '/samples/mallets/xylo-c6.wav', root: 84 },
  ], '/samples/mallets/xylo-c5.wav', ['xylophone', 'mallet', 'real'], { release: 0.2, decay: 4, sustain: 1 }),
  SMPZ('smp_bass', 'Double Bass (pizz)', 'Bass', [
    { url: '/samples/bass/c1.wav', root: 24 },
    { url: '/samples/bass/c2.wav', root: 36 },
    { url: '/samples/bass/c3.wav', root: 48 },
  ], '/samples/bass/c2.wav', ['bass', 'upright', 'real'], { release: 0.2, decay: 4, sustain: 1 }),
  // Tuned so basslines play in key (sample fundamental G1 = MIDI 31).
  SMPZ('smp_trap808', 'Trap 808 (distorted)', 'Bass', [
    { url: '/samples/trap/808.wav', root: 31 },
  ], '/samples/trap/808.wav', ['808', 'trap', 'bass', 'real'], { release: 0.3, decay: 4, sustain: 1 }),
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
