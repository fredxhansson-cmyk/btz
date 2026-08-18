// Realtime playback engine: lookahead scheduler + live graph + preview voices.
import { PPQ, BAR_TICKS, STEP_TICKS, clamp } from '../constants';
import { MixerGraph, levelFromAnalyser } from './graph';
import { playNote } from './instruments';
import { triggerNote as triggerVoice } from './trigger';
import { buildPatternMap, buildSongMap, patternTicks, collectAutomation } from '../sequencer';
import { listTargets, denorm, AUTO_STEP } from '../automation';
import { base64ToBytes, reverseBuffer, peaks } from '../samples';

const LOOKAHEAD = 0.16;   // seconds scheduled ahead of the audio clock
const INTERVAL = 20;      // scheduler timer in ms

export class Engine {
  constructor() {
    this.ctx = null;
    this.graph = null;
    this.project = null;
    this.buffers = {};        // sample id -> {fwd, rev, peaks}
    this.decoding = new Set();
    this.playing = false;
    this.mode = 'pattern';
    this.startTime = 0;
    this.startTick = 0;
    this.scheduleTick = 0;
    this.timer = null;
    this.clockNode = null;
    this.clockReady = false;
    this.map = new Map();
    this.loopLen = BAR_TICKS;
    this.metronome = false;
    this.voices = new Map();      // live (held) preview voices
    this.chokes = new Map();      // choke group -> gate gain of the ringing voice
    this.autoEvals = [];          // automation lane evaluators
    this.autoSpecs = new Map();   // target id -> target meta
    this.autoTargets = new Set();
    this.paramAuto = new Map();   // channel id -> {instrument param: value}
    this.lastHit = new Map();     // channel id -> audio time of last trigger
    this.voiceCount = 0;
    this.listeners = new Set();
    this._meterBuf = new Uint8Array(512);
  }

  /* ---------------------------------------------------------- lifecycle */

  /** Audio-thread clock; falls back to setInterval when unavailable. */
  async initClock() {
    if (this.clockNode || !this.ctx || !this.ctx.audioWorklet) return;
    try {
      await this.ctx.audioWorklet.addModule('/flow-clock.worklet.js');
      const node = new AudioWorkletNode(this.ctx, 'flow-clock', { numberOfInputs: 0, numberOfOutputs: 1 });
      const sink = this.ctx.createGain();
      sink.gain.value = 0;
      node.connect(sink);
      sink.connect(this.ctx.destination);
      node.port.onmessage = () => { if (this.playing) this.tick(); };
      this.clockNode = node;
      this.clockReady = true;
    } catch (e) {
      this.clockReady = false;
    }
  }

  ensureContext() {
    if (!this.ctx) {
      const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
      if (!AC) return null;
      this.ctx = new AC({ latencyHint: 'interactive' });
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (!this.graph && this.project) this.graph = new MixerGraph(this.ctx, this.project, { analysers: true });
    if (!this.clockNode) this.initClock();
    this.ensureSamples(this.project);
    return this.ctx;
  }

  /** Called on every project change coming from React. */
  setProject(project) {
    const bpmChanged = this.project && this.project.bpm !== project.bpm;
    this.project = project;
    this.ensureSamples(project);
    this.refreshAutomation();
    if (this.graph) this.graph.sync(project, this.autoTargets);
    if (bpmChanged && this.playing) {
      // Re-anchor the clock so the tempo change takes effect from "now".
      const tick = this.currentTick();
      this.startTick = tick;
      this.startTime = this.ctx.currentTime;
      this.scheduleTick = Math.ceil(tick);
    }
    if (this.playing) this.rebuildMap();
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit() {
    for (const fn of this.listeners) fn(this);
  }

  /* ------------------------------------------------------------ transport */

  get secondsPerTick() {
    return 60 / Math.max(20, this.project ? this.project.bpm : 130) / PPQ;
  }

  refreshAutomation() {
    const p = this.project;
    if (!p) return;
    const { evals, targets } = collectAutomation(p, this.mode);
    this.autoEvals = evals;
    this.autoTargets = targets;
    this.autoSpecs = new Map(listTargets(p).map((t) => [t.id, t]));
    if (!targets.size) this.paramAuto.clear();
  }

  rebuildMap() {
    const p = this.project;
    if (!p) return;
    this.refreshAutomation();
    if (this.graph) this.graph.sync(p, this.autoTargets);
    if (this.mode === 'song') {
      const { map, length } = buildSongMap(p);
      this.map = map;
      this.loopLen = Math.max(BAR_TICKS, Math.ceil(length / BAR_TICKS) * BAR_TICKS);
    } else {
      this.map = buildPatternMap(p, p.activePattern);
      const pat = p.patterns.find((x) => x.id === p.activePattern);
      this.loopLen = patternTicks(pat);
    }
  }

  /** Active loop region in ticks: {a, b}. */
  loopRegion() {
    const p = this.project;
    if (this.mode === 'song' && p && p.loop !== false && p.loopEnd > p.loopStart) {
      return { a: Math.max(0, p.loopStart || 0), b: p.loopEnd };
    }
    return { a: 0, b: Math.max(1, this.loopLen) };
  }

  /** Maps an absolute playback tick onto the looping region. */
  positionFor(absTick) {
    const { a, b } = this.loopRegion();
    if (absTick < a) return absTick;
    const span = Math.max(1, b - a);
    return a + ((absTick - a) % span);
  }

  play(mode, fromTick = null, countInBars = 0) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.mode = mode || this.mode;
    this.rebuildMap();
    const region = this.loopRegion();
    this.startTick = fromTick != null ? fromTick : (this.pausedTick || region.a);
    const barLen = (this.project && this.project.barTicks) || BAR_TICKS;
    const beatLen = (this.project && this.project.beatTicks) || PPQ;
    const countIn = Math.max(0, countInBars) * barLen * this.secondsPerTick;
    this.startTime = ctx.currentTime + 0.05 + countIn;
    if (countIn > 0) {
      const beats = Math.round((countInBars * barLen) / beatLen);
      for (let i = 0; i < beats; i++) {
        this.click(this.startTime - countIn + i * beatLen * this.secondsPerTick, i % Math.round(barLen / beatLen) === 0);
      }
    }
    this.scheduleTick = Math.floor(this.startTick);
    this.playing = true;
    this.pausedTick = 0;
    this.chokes.clear();
    if (this.timer) clearInterval(this.timer);
    if (this.graph) this.graph.resyncAll(this.startTime, this.project);
    this.timer = setInterval(() => this.tick(), INTERVAL);
    this.tick();
    this.emit();
  }

  stop() {
    this.playing = false;
    this.pausedTick = 0;
    this.chokes.clear();
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.emit();
  }

  pause() {
    if (!this.playing) return;
    this.pausedTick = this.currentTick();
    this.playing = false;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.emit();
  }

  currentTick() {
    if (!this.playing || !this.ctx) return this.pausedTick || 0;
    const elapsed = this.ctx.currentTime - this.startTime;
    return Math.max(this.startTick, this.startTick + elapsed / this.secondsPerTick);
  }

  /** Position inside the looping region (what the playhead shows). */
  currentPosition() {
    return this.positionFor(this.currentTick());
  }

  tickTime(tick) {
    return this.startTime + (tick - this.startTick) * this.secondsPerTick;
  }

  /* ------------------------------------------------------------ scheduler */

  tick() {
    if (!this.playing || !this.ctx || !this.project) return;
    const horizon = this.ctx.currentTime + LOOKAHEAD;
    let guard = 0;
    while (this.tickTime(this.scheduleTick) < horizon && guard++ < 4000) {
      this.scheduleTickEvents(this.scheduleTick);
      this.scheduleTick++;
    }
  }

  scheduleTickEvents(absTick) {
    const p = this.project;
    const pos = this.positionFor(absTick);
    let time = this.tickTime(absTick);
    // Swing: delay every second 16th note.
    const swing = p.swing || 0;
    if (swing > 0 && pos % (STEP_TICKS * 2) === STEP_TICKS) {
      time += swing * 0.5 * STEP_TICKS * this.secondsPerTick;
    }
    if (time < this.ctx.currentTime - 0.05) return;

    if (this.autoEvals.length && absTick % AUTO_STEP === 0) this.applyAutomation(pos, time);

    const events = this.map.get(pos);
    if (events) {
      const anySolo = p.channels.some((c) => c.solo);
      for (const ev of events) {
        const ch = p.channels.find((c) => c.id === ev.channelId);
        if (!ch || ch.mute || (anySolo && !ch.solo)) continue;
        this.triggerNote(ch, ev.note, time);
      }
    }
    const beatLen = p.beatTicks || PPQ;
    const barLen = p.barTicks || BAR_TICKS;
    if (this.metronome && pos % beatLen === 0) this.click(time, pos % barLen === 0);
  }

  applyAutomation(pos, time) {
    const p = this.project;
    for (const lane of this.autoEvals) {
      const v = lane.at(pos);
      if (v == null) continue;
      const meta = this.autoSpecs.get(lane.target);
      if (!meta) continue;
      if (meta.perNote) {
        const chId = lane.target.split('|')[1];
        const key = lane.target.split('|')[3];
        const cur = this.paramAuto.get(chId) || {};
        cur[key] = denorm(meta.spec, v);
        this.paramAuto.set(chId, cur);
      } else if (this.graph) {
        this.graph.applyAutomation(p, lane.target, v, time, meta);
      }
    }
  }

  /** Channel with any automated instrument parameters folded in. */
  resolveChannel(channel) {
    const over = this.paramAuto.get(channel.id);
    if (!over) return channel;
    return { ...channel, params: { ...channel.params, ...over } };
  }

  triggerNote(channel, note, time) {
    triggerVoice(this.ctx, this.graph, this.resolveChannel(channel), note, time, this.secondsPerTick, this.buffers, this.chokes);
    this.lastHit.set(channel.id, time);
    this.voiceCount++;
  }

  /** Seconds since a channel last fired — drives the pad lights. */
  sinceHit(channelId) {
    const t = this.lastHit.get(channelId);
    if (t == null || !this.ctx) return Infinity;
    return this.ctx.currentTime - t;
  }

  click(time, accent) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square';
    o.frequency.value = accent ? 1600 : 1050;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(accent ? 0.28 : 0.16, time + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.045);
    o.connect(g); g.connect(this.graph.masterIn);
    o.start(time); o.stop(time + 0.06);
  }

  /* --------------------------------------------------------- live preview */

  noteOn(channelId, key, vel = 0.85) {
    const ctx = this.ensureContext();
    if (!ctx || !this.project) return;
    const ch = this.project.channels.find((c) => c.id === channelId);
    if (!ch) return;
    const time = ctx.currentTime + 0.005;
    this.lastHit.set(ch.id, time);
    const voice = playNote(ctx, this.graph.channelInput(ch.id), ch, {
      time, key, vel, dur: Infinity,
    }, this.buffers);
    const k = `${channelId}:${key}`;
    const prev = this.voices.get(k);
    if (prev && prev.release) prev.release(time);
    if (voice) this.voices.set(k, voice);
    this.voiceCount++;
  }

  noteOff(channelId, key) {
    const k = `${channelId}:${key}`;
    const voice = this.voices.get(k);
    if (voice) {
      if (voice.release) voice.release(this.ctx.currentTime);
      this.voices.delete(k);
    }
  }

  /** Auditions a library sound without adding it to the project. */
  previewSound(sound, key = 60, dur = 0.7) {
    const ctx = this.ensureContext();
    if (!ctx || !this.graph) return;
    const fake = { id: '__preview', inst: sound.inst, params: sound.params, vol: 0.8, pan: 0, choke: 0 };
    const time = ctx.currentTime + 0.005;
    triggerVoice(ctx, this.graph, fake, { k: key, v: 0.95, d: dur / this.secondsPerTick },
      time, this.secondsPerTick, this.buffers, null);
  }

  /** One-shot audition used by the channel rack / browser. */
  preview(channelId, key = 60, vel = 0.9, dur = 0.5) {
    const ctx = this.ensureContext();
    if (!ctx || !this.project) return;
    const ch = this.project.channels.find((c) => c.id === channelId);
    if (!ch) return;
    const time = ctx.currentTime + 0.005;
    triggerVoice(ctx, this.graph, ch, { k: key, v: vel, d: dur / this.secondsPerTick },
      time, this.secondsPerTick, this.buffers, this.chokes);
    this.lastHit.set(ch.id, time);
  }

  /* ------------------------------------------------------------- metering */

  masterLevel() {
    return this.graph ? levelFromAnalyser(this.graph.masterAnalyser, this._meterBuf) : 0;
  }

  /** Fills `arr` with the master spectrum (0-255 per bin). */
  spectrum(arr) {
    if (!this.graph || !this.graph.masterAnalyser) return false;
    this.graph.masterAnalyser.getByteFrequencyData(arr);
    return true;
  }

  insertLevel(id) {
    if (!this.graph) return 0;
    const node = this.graph.inserts.get(id);
    return node ? levelFromAnalyser(node.analyser, this._meterBuf) : 0;
  }

  /** Decodes any project samples that are not in memory yet. */
  ensureSamples(project) {
    if (!this.ctx || !project || !project.samples) return;
    for (const [id, sample] of Object.entries(project.samples)) {
      if (this.buffers[id] || this.decoding.has(id) || !sample || !sample.data) continue;
      this.decoding.add(id);
      const bytes = base64ToBytes(sample.data);
      this.ctx.decodeAudioData(bytes.buffer.slice(0))
        .then((buffer) => {
          this.buffers[id] = { fwd: buffer, rev: reverseBuffer(this.ctx, buffer), peaks: peaks(buffer) };
          this.decoding.delete(id);
          this.emit();
        })
        .catch(() => { this.decoding.delete(id); });
    }
  }

  /** Decodes a freshly picked file so it can be auditioned immediately. */
  async decodeSample(sample) {
    const ctx = this.ensureContext();
    if (!ctx) return null;
    const bytes = base64ToBytes(sample.data);
    const buffer = await ctx.decodeAudioData(bytes.buffer.slice(0));
    this.buffers[sample.id] = { fwd: buffer, rev: reverseBuffer(ctx, buffer), peaks: peaks(buffer) };
    return this.buffers[sample.id];
  }
}

let singleton = null;
export function getEngine() {
  if (!singleton) singleton = new Engine();
  return singleton;
}
