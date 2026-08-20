// Builds the mixer/channel audio graph for a given AudioContext.
// Used by both the realtime engine and the offline bounce renderer.
import { clamp, dbToGain } from '../constants';
import { EFFECTS, mergedFxParams } from './effects';
import { parseTarget, denorm, findTarget } from '../automation';

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
    this.fxOverrides = new Map();   // fx slot id -> {param: realValue}
    this.automated = new Set();     // target ids currently driven by automation

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
    this.masterNode = { input: this.masterVol, post: this.limiter, sig: null, sends: new Map() };
    this.masterIn.connect(this.masterVol);
    this.masterVol.connect(this.limiter);
    this.limiter.connect(this.softClip);
    this.softClip.connect(ctx.destination);

    if (this.withAnalysers) {
      this.masterAnalyser = ctx.createAnalyser();
      this.masterAnalyser.fftSize = 1024;
      this.softClip.connect(this.masterAnalyser);

      // K-weighting approximation for the loudness meter: a high pass plus a
      // high shelf, matching the shape ITU-R BS.1770 uses before integrating.
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 38;
      hp.Q.value = 0.5;
      const shelf = ctx.createBiquadFilter();
      shelf.type = 'highshelf';
      shelf.frequency.value = 1500;
      shelf.gain.value = 4;
      this.loudAnalyser = ctx.createAnalyser();
      this.loudAnalyser.fftSize = 2048;
      this.softClip.connect(hp);
      hp.connect(shelf);
      shelf.connect(this.loudAnalyser);
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
      node = { input, post, pan, vol, analyser, sig: null, sends: new Map() };
      this.inserts.set(ins.id, node);
    }
    return node;
  }

  /** Routes an insert's output to a group bus (another insert) or the master,
      with a cycle guard so a bad chain can't feed back on itself. */
  routeInsert(ins, node, project) {
    let outId = ins.output && ins.output !== 'master' ? ins.output : 'master';
    if (outId !== 'master') {
      const seen = new Set([ins.id]);
      let cur = outId;
      while (cur && cur !== 'master') {
        if (seen.has(cur)) { outId = 'master'; break; }
        seen.add(cur);
        const nx = (project.inserts.find((i) => i.id === cur) || {}).output;
        cur = nx && nx !== 'master' ? nx : 'master';
      }
      if (outId !== 'master' && !project.inserts.find((i) => i.id === outId)) outId = 'master';
    }
    if (node.out === outId) return;
    node.out = outId;
    try { node.vol.disconnect(); } catch (e) { /* noop */ }
    if (node.analyser) { try { node.vol.connect(node.analyser); } catch (e) { /* noop */ } }
    const target = outId === 'master'
      ? this.masterIn
      : this.ensureInsert(project.inserts.find((i) => i.id === outId)).input;
    try { node.vol.connect(target); } catch (e) { /* noop */ }
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
      if (!slot) return;
      const ov = this.fxOverrides.get(slot.id);
      unit.update(ov ? { ...mergedFxParams(slot), ...ov } : mergedFxParams(slot), bpm);
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
  sync(project, automated) {
    if (automated) this.automated = automated;
    const bpm = project.bpm;
    const insSolo = project.inserts.some((i) => i.solo);
    const chSolo = project.channels.some((c) => c.solo);

    if (!this.automated.has('mix|master||vol')) this.masterVol.gain.value = clamp(project.master.vol, 0, 2);

    const seenIns = new Set();
    for (const ins of project.inserts) {
      seenIns.add(ins.id);
      const node = this.ensureInsert(ins);
      this.syncFx(ins, node, bpm);
      const muted = ins.mute || (insSolo && !ins.solo);
      if (muted) node.vol.gain.value = 0;
      else if (!this.automated.has(`mix|insert|${ins.id}|vol`)) node.vol.gain.value = clamp(ins.vol, 0, 2);
      if (node.pan.pan && !this.automated.has(`mix|insert|${ins.id}|pan`)) node.pan.pan.value = clamp(ins.pan, -1, 1);
      this.routeInsert(ins, node, project);
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
      if (muted) node.vol.gain.value = 0;
      else if (!this.automated.has(`mix|channel|${ch.id}|vol`)) node.vol.gain.value = clamp(ch.vol, 0, 1.5);
      if (node.pan.pan && !this.automated.has(`mix|channel|${ch.id}|pan`)) node.pan.pan.value = clamp(ch.pan, -1, 1);
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

    this.syncFx({ id: '__master', fx: (project.master && project.master.chain) || [] }, this.masterNode, bpm);
    this.syncSends(project);
  }

  /**
   * Post-fader sends between inserts. Edges that would close a feedback loop
   * are dropped, so a send chain can never scream.
   */
  syncSends(project) {
    const accepted = new Map();
    const canReach = (from, to) => {
      const seen = new Set();
      const stack = [from];
      while (stack.length) {
        const cur = stack.pop();
        if (cur === to) return true;
        if (seen.has(cur)) continue;
        seen.add(cur);
        for (const next of accepted.get(cur) || []) stack.push(next);
      }
      return false;
    };

    for (const ins of project.inserts) {
      const list = [];
      for (const send of ins.sends || []) {
        if (!send || !send.to || send.to === ins.id) continue;
        if (!this.inserts.has(send.to)) continue;
        if (canReach(send.to, ins.id)) continue;      // would create a cycle
        list.push(send.to);
      }
      accepted.set(ins.id, list);
    }

    for (const ins of project.inserts) {
      const node = this.inserts.get(ins.id);
      if (!node) continue;
      const wanted = new Map();
      for (const send of ins.sends || []) {
        if (!(accepted.get(ins.id) || []).includes(send.to)) continue;
        wanted.set(send.to, clamp(send.amount == null ? 0 : send.amount, 0, 1.5));
      }
      for (const [to, amount] of wanted) {
        let g = node.sends.get(to);
        if (!g) {
          g = this.ctx.createGain();
          node.vol.connect(g);
          const target = this.inserts.get(to);
          if (target) g.connect(target.input);
          node.sends.set(to, g);
        }
        g.gain.value = amount;
      }
      for (const [to, g] of node.sends) {
        if (!wanted.has(to)) {
          try { g.disconnect(); } catch (e) { /* noop */ }
          node.sends.delete(to);
        }
      }
    }
  }

  /** Restarts tempo-locked effects (the ducker) so they line up with the transport. */
  resyncAll(time, project) {
    for (const units of this.fxChains.values()) {
      for (const unit of units) if (unit.resync) unit.resync(time);
    }
    if (project) this.sync(project, this.automated);
  }

  /** Writes one automation value onto the live graph. */
  applyAutomation(project, targetId, normValue, time, metaIn) {
    const { kind, a, b, param } = parseTarget(targetId);
    const meta = metaIn || findTarget(project, targetId);
    if (!meta) return;
    const value = denorm(meta.spec, normValue);
    if (kind === 'mix') {
      let node = null;
      if (a === 'master') node = { vol: this.masterVol, pan: null };
      else if (a === 'channel') node = this.channels.get(b);
      else if (a === 'insert') node = this.inserts.get(b);
      if (!node) return;
      const p = param === 'pan' ? (node.pan && node.pan.pan) : node.vol.gain;
      if (p) this.ramp(p, value, time);
      return;
    }
    if (kind === 'fx') {
      const units = this.fxChains.get(a) || [];
      const unit = units.find((u) => u.slotId === b);
      if (!unit) return;
      const ins = project.inserts.find((i) => i.id === a);
      const slot = ins && (ins.fx || []).find((f) => f.id === b);
      if (!slot) return;
      const ov = this.fxOverrides.get(b) || {};
      if (ov[param] === value) return;
      ov[param] = value;
      this.fxOverrides.set(b, ov);
      unit.update({ ...mergedFxParams(slot), ...ov }, project.bpm);
    }
  }

  ramp(param, value, time) {
    const t = Math.max(time, this.ctx.currentTime);
    try {
      param.linearRampToValueAtTime(value, t);
    } catch (e) {
      param.value = value;
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
