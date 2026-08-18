// Realtime playback engine: lookahead scheduler + live graph + preview voices.
import { PPQ, BAR_TICKS, STEP_TICKS, clamp } from '../constants';
import { MixerGraph, levelFromAnalyser } from './graph';
import { playNote } from './instruments';
import { triggerNote as triggerVoice } from './trigger';
import { buildPatternMap, buildSongMap, patternTicks } from '../sequencer';

const LOOKAHEAD = 0.16;   // seconds scheduled ahead of the audio clock
const INTERVAL = 20;      // scheduler timer in ms

export class Engine {
  constructor() {
    this.ctx = null;
    this.graph = null;
    this.project = null;
    this.buffers = {};
    this.playing = false;
    this.mode = 'pattern';
    this.startTime = 0;
    this.startTick = 0;
    this.scheduleTick = 0;
    this.timer = null;
    this.map = new Map();
    this.loopLen = BAR_TICKS;
    this.metronome = false;
    this.voices = new Map();      // live (held) preview voices
    this.chokes = new Map();      // choke group -> gate gain of the ringing voice
    this.lastHit = new Map();     // channel id -> audio time of last trigger
    this.voiceCount = 0;
    this.listeners = new Set();
    this._meterBuf = new Uint8Array(512);
  }

  /* ---------------------------------------------------------- lifecycle */

  ensureContext() {
    if (!this.ctx) {
      const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
      if (!AC) return null;
      this.ctx = new AC({ latencyHint: 'interactive' });
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (!this.graph && this.project) this.graph = new MixerGraph(this.ctx, this.project, { analysers: true });
    return this.ctx;
  }

  /** Called on every project change coming from React. */
  setProject(project) {
    const bpmChanged = this.project && this.project.bpm !== project.bpm;
    this.project = project;
    if (this.graph) this.graph.sync(project);
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

  rebuildMap() {
    const p = this.project;
    if (!p) return;
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

  play(mode, fromTick = null) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.mode = mode || this.mode;
    this.rebuildMap();
    this.startTick = fromTick != null ? fromTick : (this.pausedTick || 0);
    this.startTime = ctx.currentTime + 0.05;
    this.scheduleTick = Math.floor(this.startTick);
    this.playing = true;
    this.pausedTick = 0;
    this.chokes.clear();
    if (this.timer) clearInterval(this.timer);
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
    return Math.max(0, this.startTick + elapsed / this.secondsPerTick);
  }

  /** Position inside the looping region (what the playhead shows). */
  currentPosition() {
    const t = this.currentTick();
    const len = Math.max(1, this.loopLen);
    return this.project && this.project.loop === false ? t : t % len;
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
    const len = Math.max(1, this.loopLen);
    const pos = absTick % len;
    let time = this.tickTime(absTick);
    // Swing: delay every second 16th note.
    const swing = p.swing || 0;
    if (swing > 0 && pos % (STEP_TICKS * 2) === STEP_TICKS) {
      time += swing * 0.5 * STEP_TICKS * this.secondsPerTick;
    }
    if (time < this.ctx.currentTime - 0.05) return;

    const events = this.map.get(pos);
    if (events) {
      const anySolo = p.channels.some((c) => c.solo);
      for (const ev of events) {
        const ch = p.channels.find((c) => c.id === ev.channelId);
        if (!ch || ch.mute || (anySolo && !ch.solo)) continue;
        this.triggerNote(ch, ev.note, time);
      }
    }
    if (this.metronome && pos % PPQ === 0) this.click(time, pos % BAR_TICKS === 0);
  }

  triggerNote(channel, note, time) {
    triggerVoice(this.ctx, this.graph, channel, note, time, this.secondsPerTick, this.buffers, this.chokes);
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

  insertLevel(id) {
    if (!this.graph) return 0;
    const node = this.graph.inserts.get(id);
    return node ? levelFromAnalyser(node.analyser, this._meterBuf) : 0;
  }

  async loadSample(channelId, file) {
    const ctx = this.ensureContext();
    if (!ctx) return null;
    const data = await file.arrayBuffer();
    const buffer = await ctx.decodeAudioData(data);
    this.buffers[channelId] = buffer;
    return buffer;
  }
}

let singleton = null;
export function getEngine() {
  if (!singleton) singleton = new Engine();
  return singleton;
}
