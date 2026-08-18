// Builds the mixer/channel audio graph for a given AudioContext.
// Used by both the realtime engine and the offline bounce renderer.
import { clamp, dbToGain } from '../constants';
import { EFFECTS, mergedFxParams } from './effects';

let softClipCache = null;
/**
 * Final saturation stage. A WaveShaper curve maps the input range [-1, 1] onto
 * the table, so the transfer is unity below the knee and eases towards +/-1
 * above it. That keeps normal levels untouched and stops overs from clipping.
 */
function softClipCurve() {
  if (softClipCache) return softClipCache;
  const n = 4096;
  const knee = 0.6;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / (n - 1) - 1;
    const a = Math.abs(x);
    const y = a <= knee ? a : knee + (1 - knee) * Math.tanh((a - knee) / (1 - knee));
    curve[i] = Math.sign(x) * y;
  }
  softClipCache = curve;
  return curve;
}

export class MixerGraph {
  constructor(ctx, project, opts = {}) {
    this.ctx = ctx;
    this.withAnalysers = !!opts.analysers;
    this.inserts = new Map();
    this.channels = new Map();
    this.fxChains = new Map();

    this.masterIn = ctx.createGain();
    this.masterVol = ctx.createGain();
    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -3;
    this.limiter.knee.value = 2;
    this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.001;
    this.limiter.release.value = 0.12;
    this.softClip = ctx.createWaveShaper();
    this.softClip.curve = softClipCurve();
    this.softClip.oversample = '2x';
    this.masterIn.connect(this.masterVol);
    this.masterVol.connect(this.limiter);
    this.limiter.connect(this.softClip);
    this.softClip.connect(ctx.destination);

    if (this.withAnalysers) {
      this.masterAnalyser = ctx.createAnalyser();
      this.masterAnalyser.fftSize = 1024;
      this.softClip.connect(this.masterAnalyser);
    }
    this.sync(project);
  }

  ensureInsert(ins) {
    let node = this.inserts.get(ins.id);
    if (!node) {
      const ctx = this.ctx;
      const input = ctx.createGain();
      const post = ctx.createGain();
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
      const vol = ctx.createGain();
      post.connect(pan); pan.connect(vol); vol.connect(this.masterIn);
      let analyser = null;
      if (this.withAnalysers) {
        analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        vol.connect(analyser);
      }
      node = { input, post, pan, vol, analyser, sig: null };
      this.inserts.set(ins.id, node);
    }
    return node;
  }

  /** (Re)builds the serial FX chain of one insert when its slot layout changed. */
  syncFx(ins, node, bpm) {
    const sig = (ins.fx || []).map((s) => `${s.type}:${s.on ? 1 : 0}`).join('|');
    if (sig !== node.sig) {
      node.sig = sig;
      try { node.input.disconnect(); } catch (e) { /* noop */ }
      const old = this.fxChains.get(ins.id) || [];
      old.forEach((u) => { try { u.output.disconnect(); } catch (e) { /* noop */ } });
      const units = [];
      let head = node.input;
      for (const slot of ins.fx || []) {
        const def = EFFECTS[slot.type];
        if (!def || slot.on === false) continue;
        const unit = def.create(this.ctx);
        unit.slotId = slot.id;
        head.connect(unit.input);
        head = unit.output;
        units.push(unit);
      }
      head.connect(node.post);
      this.fxChains.set(ins.id, units);
    }
    const units = this.fxChains.get(ins.id) || [];
    const active = (ins.fx || []).filter((s) => EFFECTS[s.type] && s.on !== false);
    units.forEach((unit, i) => {
      const slot = active[i];
      if (slot) unit.update(mergedFxParams(slot), bpm);
    });
  }

  ensureChannel(ch) {
    let node = this.channels.get(ch.id);
    if (!node) {
      const ctx = this.ctx;
      const input = ctx.createGain();
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
      const vol = ctx.createGain();
      input.connect(pan); pan.connect(vol);
      node = { input, pan, vol, routed: null };
      this.channels.set(ch.id, node);
    }
    return node;
  }

  /** Applies the current project mix state to the live graph. */
  sync(project) {
    const bpm = project.bpm;
    const insSolo = project.inserts.some((i) => i.solo);
    const chSolo = project.channels.some((c) => c.solo);

    this.masterVol.gain.value = clamp(project.master.vol, 0, 2);

    const seenIns = new Set();
    for (const ins of project.inserts) {
      seenIns.add(ins.id);
      const node = this.ensureInsert(ins);
      this.syncFx(ins, node, bpm);
      const muted = ins.mute || (insSolo && !ins.solo);
      node.vol.gain.value = muted ? 0 : clamp(ins.vol, 0, 2);
      if (node.pan.pan) node.pan.pan.value = clamp(ins.pan, -1, 1);
    }
    for (const [id, node] of this.inserts) {
      if (!seenIns.has(id)) {
        try { node.vol.disconnect(); } catch (e) { /* noop */ }
        this.inserts.delete(id);
      }
    }

    const seenCh = new Set();
    for (const ch of project.channels) {
      seenCh.add(ch.id);
      const node = this.ensureChannel(ch);
      const muted = ch.mute || (chSolo && !ch.solo);
      node.vol.gain.value = muted ? 0 : clamp(ch.vol, 0, 1.5);
      if (node.pan.pan) node.pan.pan.value = clamp(ch.pan, -1, 1);
      const target = this.inserts.get(ch.insert) || null;
      const dest = target ? target.input : this.masterIn;
      if (node.routed !== dest) {
        try { node.vol.disconnect(); } catch (e) { /* noop */ }
        node.vol.connect(dest);
        node.routed = dest;
      }
    }
    for (const [id, node] of this.channels) {
      if (!seenCh.has(id)) {
        try { node.vol.disconnect(); } catch (e) { /* noop */ }
        this.channels.delete(id);
      }
    }
  }

  channelInput(id) {
    const n = this.channels.get(id);
    return n ? n.input : this.masterIn;
  }

  dispose() {
    try { this.softClip.disconnect(); } catch (e) { /* noop */ }
    try { this.limiter.disconnect(); } catch (e) { /* noop */ }
    try { this.masterIn.disconnect(); } catch (e) { /* noop */ }
  }
}

export const levelFromAnalyser = (analyser, buf) => {
  if (!analyser) return 0;
  analyser.getByteTimeDomainData(buf);
  let peak = 0;
  for (let i = 0; i < buf.length; i++) {
    const v = Math.abs(buf[i] - 128) / 128;
    if (v > peak) peak = v;
  }
  return peak;
};

export const gainDb = dbToGain;
