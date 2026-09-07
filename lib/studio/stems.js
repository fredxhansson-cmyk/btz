/**
 * Fast, offline stem split — no server, no downloads, works on any track you
 * drop in. It's a spatial + spectral separation (mid/side + filtering), not a
 * neural model, so it's honest about what it is: a quick way to pull an
 * instrumental, a centred vocal, a bass and a highs/drums layer out of a mix.
 * True AI 4-stem separation is the cloud upgrade (see /api/stem).
 *
 * Each stem renders in its own OfflineAudioContext, so this is fast (faster
 * than realtime) and never blocks the UI's audio graph.
 */
function OAC() {
  return typeof window !== 'undefined' && (window.OfflineAudioContext || window.webkitOfflineAudioContext);
}

// Render one mono stem. `wire(ctx, src, chFor)` connects the source to the
// destination through whatever processing the stem needs. `chFor(ch)` returns a
// safe splitter output index for mono or stereo input.
async function renderStem(buffer, wire) {
  const Ctor = OAC();
  if (!Ctor) throw new Error('OfflineAudioContext not supported.');
  const ctx = new Ctor(1, buffer.length, buffer.sampleRate);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const stereo = buffer.numberOfChannels > 1;
  const splitter = ctx.createChannelSplitter(2);
  src.connect(splitter);
  const chFor = (ch) => (stereo ? ch : 0);
  wire(ctx, splitter, chFor);
  src.start();
  return ctx.startRendering();
}

// L*lg + R*rg → dest, optionally through a filter chain.
function mix(ctx, splitter, chFor, lg, rg, filters = []) {
  const gl = ctx.createGain(); gl.gain.value = lg;
  const gr = ctx.createGain(); gr.gain.value = rg;
  splitter.connect(gl, chFor(0));
  splitter.connect(gr, chFor(1));
  let tail = ctx.createGain();
  gl.connect(tail); gr.connect(tail);
  for (const f of filters) { const node = f(ctx); tail.connect(node); tail = node; }
  tail.connect(ctx.destination);
}

const lowpass = (freq) => (ctx) => { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq; f.Q.value = 0.7; return f; };
const highpass = (freq) => (ctx) => { const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = freq; f.Q.value = 0.7; return f; };

/** The stems we can produce offline. */
export const STEM_TYPES = [
  { id: 'instrumental', name: 'Instrumental' },
  { id: 'vocal', name: 'Vocal (center)' },
  { id: 'bass', name: 'Bass' },
  { id: 'drums', name: 'Drums / Highs' },
];

/**
 * Split a decoded AudioBuffer into the requested stems.
 * Returns [{ id, name, buffer }].
 */
export async function separateBuffer(buffer, ids = STEM_TYPES.map((s) => s.id)) {
  const out = [];
  for (const id of ids) {
    let b;
    // eslint-disable-next-line no-await-in-loop
    if (id === 'instrumental') b = await renderStem(buffer, (ctx, sp, chFor) => mix(ctx, sp, chFor, 1, -1)); // L-R removes centre
    else if (id === 'vocal') b = await renderStem(buffer, (ctx, sp, chFor) => mix(ctx, sp, chFor, 0.5, 0.5, [highpass(180), lowpass(5200)])); // centre, voice band
    else if (id === 'bass') b = await renderStem(buffer, (ctx, sp, chFor) => mix(ctx, sp, chFor, 0.5, 0.5, [lowpass(170)]));
    else if (id === 'drums') b = await renderStem(buffer, (ctx, sp, chFor) => mix(ctx, sp, chFor, 0.5, 0.5, [highpass(3200)]));
    else continue;
    const meta = STEM_TYPES.find((s) => s.id === id);
    out.push({ id, name: meta ? meta.name : id, buffer: b });
  }
  return out;
}
