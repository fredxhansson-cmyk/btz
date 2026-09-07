import React, { createContext, useContext, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { getEngine } from './audio/engine';
import { historyReducer, initHistory } from './reducer';
import { createDefaultProject, createEmptyProject, createTemplate, normalizeProject } from './project';
import { renderProject, renderStems, encodeWav, encodeAudio, saveBlobAs, saveFilesToDir } from './audio/render';
import { exportMidi, parseMidi, GM_DRUMS } from './midi';
import { padChannels } from './drums';
import { loadBrain, saveBrain, learnFromProject } from './ai';
import { BAR_TICKS, STEP_TICKS, uid } from './constants';
import { fileToSample, bytesToBase64 } from './samples';
import { separateBuffer } from './stems';
import { cloudStemEnabled, cloudSeparate } from './cloud';
import { onCollab, joinRoom as collabJoin, leaveRoom as collabLeave, pushProject as collabPush, isActive as collabActive, setPresence as collabSetPresence } from './collab';
import { songLength, patternTicks } from './sequencer';
import { norm as autoNorm } from './automation';

const StudioContext = createContext(null);
// v2: open to an empty project by default (no demo/test content). Bumping the
// key retires the old auto-saved demo so the studio starts clean.
const STORAGE_KEY = 'flowstudio.project.v2';

function loadStored() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizeProject(JSON.parse(raw));
  } catch (e) {
    return null;
  }
}

export function StudioProvider({ children }) {
  const [state, dispatch] = useReducer(historyReducer, null,
    () => initHistory(loadStored() || createEmptyProject()));
  const project = state.project;
  const engine = useMemo(() => getEngine(), []);

  const [ui, setUiState] = useState({
    view: 'rack',
    snap: '1/16',
    tool: 'draw',
    chord: 'none',
    scale: 'chromatic',
    scaleRoot: 0,
    scaleSnap: false,
    ghosts: true,
    touch: false,
    browserOpen: false,
    pianoZoom: 1,
    playlistZoom: 1,
    mode: 'pattern',
    padChannel: null,
    recording: false,
    metronome: false,
    hint: 'Press PLAY to start. Browse the sounds in the Browser on the left.',
    pluginOpen: false,
    octave: 4,
    theme: 'dark',
    recAuto: false,
  });
  const setUi = useCallback((patch) => setUiState((u) => ({ ...u, ...(typeof patch === 'function' ? patch(u) : patch) })), []);
  // Panels popped out into their own window (second screen). Any panel can
  // request this via popOut(view); the shell renders the floating windows.
  const [detached, setDetached] = useState([]);
  const popOut = useCallback((view) => setDetached((d) => (d.includes(view) ? d : [...d, view])), []);
  const attach = useCallback((view) => setDetached((d) => d.filter((x) => x !== view)), []);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [busy, setBusy] = useState(null);
  const [midiInputs, setMidiInputs] = useState([]);
  const midiHeld = useRef(new Map());

  const projectRef = useRef(project);
  projectRef.current = project;
  const uiRef = useRef(ui);
  uiRef.current = ui;

  useEffect(() => { engine.setProject(project); }, [engine, project]);
  useEffect(() => { engine.metronome = ui.metronome; }, [engine, ui.metronome]);

  // Debounced autosave. Samples are dropped first if the quota is hit.
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
      } catch (e) {
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...project, samples: {} }));
          setUi({ hint: 'Project autosaved without samples (too large for browser storage). Save to file to keep them.' });
        } catch (e2) { /* give up silently */ }
      }
    }, 700);
    return () => clearTimeout(t);
  }, [project, setUi]);

  const setHint = useCallback((hint) => setUi({ hint }), [setUi]);

  // The generator keeps learning from what you actually build, at most once a
  // minute so it follows your taste without being dominated by one session.
  const lastLearn = useRef(0);
  useEffect(() => {
    const t = setTimeout(() => {
      const now = Date.now();
      if (now - lastLearn.current < 60000) return;
      lastLearn.current = now;
      try {
        const brain = loadBrain();
        learnFromProject(brain, projectRef.current, 0.35);
        saveBrain(brain);
      } catch (e) { /* learning is best effort */ }
    }, 5000);
    return () => clearTimeout(t);
  }, [project]);

  /* ------------------------------------------------------------- transport */

  const play = useCallback((mode, fromTick = 0) => {
    // Playing from the Arrangement view plays the whole song (not the 1-bar
    // pattern loop) — that's what you expect when looking at the timeline.
    const m = mode || (uiRef.current.view === 'playlist' ? 'song' : uiRef.current.mode);
    const countIn = uiRef.current.recording ? (projectRef.current.countIn || 0) : 0;
    engine.play(m, fromTick, countIn);
    setUi({ mode: m });
    setPlaying(true);
    setPaused(false);
  }, [engine, setUi]);

  const stop = useCallback(() => {
    engine.stop();
    setPlaying(false);
    setPaused(false);
    setUi({ recording: false });
  }, [engine, setUi]);

  // Pause keeps the playhead where it is (engine.pausedTick); the next play()
  // resumes from there instead of the loop start.
  const pause = useCallback(() => {
    engine.pause();
    setPlaying(false);
    setPaused(true);
  }, [engine]);

  const togglePlay = useCallback(() => {
    if (engine.playing) pause(); else play();
  }, [engine, play, pause]);

  const setMode = useCallback((mode) => {
    setUi({ mode });
    if (engine.playing) engine.play(mode, 0);
  }, [engine, setUi]);

  /* -------------------------------------------------------------- file I/O */

  const newProject = useCallback((demo) => {
    dispatch({ type: 'set', project: demo ? createDefaultProject() : createEmptyProject() });
    setHint(demo ? 'Demo project loaded.' : 'New empty project.');
  }, [setHint]);

  const loadTemplate = useCallback((id) => {
    dispatch({ type: 'set', project: createTemplate(id) });
    setHint('Template loaded — press play.');
  }, [setHint]);

  // Places the current pattern into the arrangement/song timeline, after
  // whatever is already there, and shows it — the explicit link from
  // pattern-making (Instruments / Piano Roll) to arranging a full track.
  const addToArrangement = useCallback(() => {
    const p = projectRef.current;
    const pat = p.patterns.find((x) => x.id === p.activePattern);
    // Append right after the last clip already on track 0 so clips stack
    // left-to-right and are always visible — not at the global song end (which
    // could be far off-screen on an otherwise-empty first track).
    const start = (p.playlist || [])
      .filter((c) => c.track === 0)
      .reduce((end, c) => Math.max(end, c.start + (c.length || 0)), 0);
    dispatch({ type: 'clip.add', patternId: p.activePattern, track: 0, start });
    setUi({ view: 'playlist', mode: 'song' });
    setHint(`"${pat ? pat.name : 'Pattern'}" added to the arrangement (track 1).`);
  }, [dispatch, setUi, setHint]);

  // Automation write: when armed + playing, a moved knob drops a point into its
  // lane at the playhead (throttled). Ties the mixer to the timeline.
  const lastAutoRec = useRef(new Map());
  const recordAuto = useCallback((target, spec, value, label) => {
    if (!uiRef.current.recAuto || !engine.playing) return;
    const now = performance.now();
    if (now - (lastAutoRec.current.get(target) || 0) < 28) return;
    lastAutoRec.current.set(target, now);
    const p = projectRef.current;
    const pat = p.patterns.find((x) => x.id === p.activePattern);
    const len = pat ? patternTicks(pat) : BAR_TICKS;
    let tick = engine.currentPosition ? engine.currentPosition() : 0;
    if (len) tick = ((tick % len) + len) % len;
    dispatch({ type: 'automation.record', target, tick, value: autoNorm(spec, value), label });
  }, [engine, dispatch]);

  // Tempo automation (safe path): follow the tempo map during song playback by
  // nudging project.bpm — the engine re-anchors its clock on a bpm change, so
  // the scheduler is never touched. No tempo map = zero behaviour change.
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const p = projectRef.current;
      const map = p.tempoMap;
      if (!engine.playing || uiRef.current.mode !== 'song' || !map || !map.length) return;
      const pos = engine.currentPosition ? engine.currentPosition() : 0;
      let bpm = map[0].bpm;
      for (const m of map) { if (m.tick <= pos) bpm = m.bpm; else break; }
      if (bpm && Math.abs(bpm - p.bpm) > 0.05) {
        dispatch({ type: 'patch', patch: { bpm }, live: true, id: 'tempomap' });
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [engine, dispatch]);

  const saveFile = useCallback(async () => {
    const blob = new Blob([JSON.stringify(projectRef.current, null, 1)], { type: 'application/json' });
    const ok = await saveBlobAs(blob, `${(projectRef.current.name || 'project').replace(/\s+/g, '_')}.flow.json`);
    if (ok) setHint('Project saved.');
  }, [setHint]);

  const openFile = useCallback(async (file) => {
    try {
      const text = await file.text();
      dispatch({ type: 'set', project: JSON.parse(text) });
      setHint(`Loaded ${file.name}`);
    } catch (e) {
      setHint('Could not read the file.');
    }
  }, [setHint]);

  const exportStems = useCallback(async () => {
    setBusy('Rendering stems…');
    try {
      const p = projectRef.current;
      const sampleRate = engine.ctx ? engine.ctx.sampleRate : 44100;
      const mode = uiRef.current.mode === 'song' ? 'song' : 'pattern';
      const stems = await renderStems(p, engine.buffers, {
        mode,
        sampleRate,
        repeats: 1,
        onStem: (done, total) => setBusy(`Rendering stems… ${done}/${total}`),
      });
      const base = (p.name || 'project').replace(/\s+/g, '_');
      const files = stems.map((stem) => ({ name: `${base}_${stem.name.replace(/\s+/g, '')}.wav`, blob: encodeWav(stem.buffer) }));
      await saveFilesToDir(files);
      setHint(`${stems.length} stems exported.`);
    } catch (e) {
      setHint(`Stem export failed: ${e.message}`);
    } finally {
      setBusy(null);
    }
  }, [engine, setHint]);

  const exportMidiFile = useCallback(async (mode) => {
    try {
      const p = projectRef.current;
      const m = mode || uiRef.current.mode;
      const bytes = exportMidi(p, m === 'song' ? 'song' : 'pattern');
      await saveBlobAs(new Blob([bytes], { type: 'audio/midi' }), `${(p.name || 'project').replace(/\s+/g, '_')}.mid`);
      setHint('MIDI file exported.');
    } catch (e) {
      setHint(`MIDI export failed: ${e.message}`);
    }
  }, [setHint]);

  const importMidiFile = useCallback(async (file) => {
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const parsed = parseMidi(bytes);
      if (!parsed.tracks.length) throw new Error('no notes in the file');
      dispatch({
        type: 'midi.import',
        tracks: parsed.tracks,
        bars: parsed.bars,
        bpm: parsed.bpm,
        name: file.name.replace(/\.[^.]+$/, '').slice(0, 22),
      });
      setHint(`Imported ${parsed.tracks.length} tracks from ${file.name} (${parsed.bpm} BPM).`);
    } catch (e) {
      setHint(`Could not read the MIDI file: ${e.message}`);
    }
  }, [setHint]);

  /** Loads an audio file into a channel, or into a brand new sampler channel. */
  const loadSampleFile = useCallback(async (file, channelId) => {
    try {
      const sample = await fileToSample(file);
      engine.ensureContext();
      await engine.decodeSample(sample);
      dispatch({ type: 'sample.add', sample, channelId, newChannel: !channelId });
      setHint(`Sample "${sample.name}" loaded (${(sample.bytes / 1024).toFixed(0)} kB).`);
      return sample;
    } catch (e) {
      setHint(`Could not read the audio file: ${e.message}`);
      return null;
    }
  }, [engine, setHint]);

  /** Split an audio file into stems (offline: instrumental / vocal / bass /
      highs) and add each as its own sampler channel. */
  const separateStemsFile = useCallback(async (file, ids) => {
    setBusy('Separating stems…');
    const base = (file.name || 'audio').replace(/\.[^.]+$/, '').slice(0, 16);
    const addStem = async (name, bytes) => {
      const sample = { id: uid('sm'), name: `${base} · ${name}`, mime: 'audio/wav', bytes: bytes.length, data: bytesToBase64(bytes) };
      await engine.decodeSample(sample);
      dispatch({ type: 'sample.add', sample, newChannel: true });
    };
    try {
      const ctx = engine.ensureContext();
      if (!ctx) throw new Error('Audio engine not ready.');

      // High-quality AI cloud tier when configured; fall back to offline on any miss.
      if (await cloudStemEnabled()) {
        setBusy('Separating (AI)… uploading');
        const dataUri = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
        const out = await cloudSeparate(dataUri, (st) => setBusy(`Separating (AI)… ${st}`));
        if (out) {
          const entries = Array.isArray(out) ? out.map((u, i) => [`Stem ${i + 1}`, u]) : Object.entries(out);
          let added = 0;
          for (const [name, u] of entries) {
            if (!u || typeof u !== 'string' || !/^https?:/.test(u)) continue;
            // eslint-disable-next-line no-await-in-loop
            const resp = await fetch(u);
            // eslint-disable-next-line no-await-in-loop
            const bytes = new Uint8Array(await resp.arrayBuffer());
            // eslint-disable-next-line no-await-in-loop
            await addStem(name.charAt(0).toUpperCase() + name.slice(1), bytes);
            added += 1;
          }
          if (added) { setHint(`AI-separated "${file.name}" into ${added} high-quality stems.`); return added; }
        }
        setHint('Cloud separation unavailable — used the fast offline split instead.');
      }

      // Offline split
      const arr = await file.arrayBuffer();
      const buffer = await ctx.decodeAudioData(arr.slice(0));
      const stems = await separateBuffer(buffer, ids);
      for (const st of stems) {
        const wav = encodeWav(st.buffer);
        // eslint-disable-next-line no-await-in-loop
        const bytes = new Uint8Array(await wav.arrayBuffer());
        // eslint-disable-next-line no-await-in-loop
        await addStem(st.name, bytes);
      }
      setHint(`Split "${file.name}" into ${stems.length} stems — each added as a channel.`);
      return stems.length;
    } catch (e) {
      setHint(`Stem split failed: ${e.message}`);
      return 0;
    } finally {
      setBusy(null);
    }
  }, [engine, dispatch, setHint]);

  /** Fetch + decode a direct audio-file URL (via the CORS-handling proxy). */
  const decodeUrlAudio = useCallback(async (url) => {
    const ctx = engine.ensureContext();
    if (!ctx) throw new Error('Audio engine not ready.');
    const r = await fetch(`/api/fetch-audio?url=${encodeURIComponent(url)}`);
    if (!r.ok) { let m = 'Could not fetch that URL.'; try { m = (await r.json()).error || m; } catch (e) { /* noop */ } throw new Error(m); }
    const arr = await r.arrayBuffer();
    return ctx.decodeAudioData(arr.slice(0));
  }, [engine]);

  /** Add a decoded AudioBuffer as a new sampler channel. */
  const addBufferChannel = useCallback(async (buffer, name) => {
    const wav = encodeWav(buffer);
    const bytes = new Uint8Array(await wav.arrayBuffer());
    const sample = { id: uid('sm'), name: String(name || 'Sample').slice(0, 22), mime: 'audio/wav', bytes: bytes.length, data: bytesToBase64(bytes) };
    await engine.decodeSample(sample);
    dispatch({ type: 'sample.add', sample, newChannel: true });
    return sample.id;
  }, [engine, dispatch]);

  /** Add a bundled factory sample (library entry with kind:'sample') as a new
      sampler channel. Same-origin, so no CORS proxy needed. */
  const addSampleSound = useCallback(async (sound) => {
    setBusy(`Loading ${sound.name}…`);
    try {
      const ctx = engine.ensureContext();
      if (!ctx) throw new Error('Audio engine not ready.');
      const decodeUrl = async (url) => {
        const r = await fetch(url);
        if (!r.ok) throw new Error('Could not load that sample.');
        return ctx.decodeAudioData(await r.arrayBuffer());
      };
      const toSample = async (buf, name) => {
        const wav = encodeWav(buf);
        const bytes = new Uint8Array(await wav.arrayBuffer());
        const sample = { id: uid('sm'), name: String(name).slice(0, 22), mime: 'audio/wav', bytes: bytes.length, data: bytesToBase64(bytes) };
        await engine.decodeSample(sample);
        return sample;
      };

      if (sound.zones && sound.zones.length) {
        // Multisampled instrument: load every zone, then one channel that maps them.
        const samples = [];
        const zones = [];
        for (const z of sound.zones) {
          // eslint-disable-next-line no-await-in-loop
          const buf = await decodeUrl(z.url);
          // eslint-disable-next-line no-await-in-loop
          const sample = await toSample(buf, `${sound.name} ${z.root}`);
          samples.push(sample);
          zones.push({ sampleId: sample.id, root: z.root });
        }
        dispatch({ type: 'samples.instrument', name: sound.name, samples, zones, params: sound.params || {} });
        setHint(`${sound.name} added (multisampled).`);
        setUi({ view: 'rack', browserOpen: false });
        return;
      }

      const buf = await decodeUrl(sound.url);
      await addBufferChannel(buf, sound.name);
      // Apply the library entry's channel params (e.g. longer release so keys
      // sustain instead of clicking off).
      if (sound.params) {
        const chId = projectRef.current.selectedChannel;
        const ch = projectRef.current.channels.find((c) => c.id === chId);
        if (ch) dispatch({ type: 'channel.update', id: chId, patch: { params: { ...ch.params, ...sound.params } } });
      }
      setHint(`${sound.name} added as a channel.`);
      setUi({ view: 'rack', browserOpen: false });
    } catch (e) {
      setHint(e.message || 'Could not load sample.');
    } finally {
      setBusy(null);
    }
  }, [engine, addBufferChannel, setBusy, setHint, setUi]);

  /** Drop an audio file onto the arrangement: decode it, add a sampler channel
      + a pattern that triggers it + a clip at the drop bar/track (atomic). */
  const dropAudioOnTimeline = useCallback(async (file, track, startTick) => {
    setBusy('Importing audio…');
    try {
      const ctx = engine.ensureContext();
      if (!ctx) throw new Error('Audio engine not ready.');
      const buf = await ctx.decodeAudioData(await file.arrayBuffer());
      const wav = encodeWav(buf);
      const bytes = new Uint8Array(await wav.arrayBuffer());
      const sample = { id: uid('sm'), name: (file.name || 'Sample').replace(/\.[^.]+$/, '').slice(0, 22), mime: 'audio/wav', bytes: bytes.length, data: bytesToBase64(bytes) };
      await engine.decodeSample(sample);
      const p = projectRef.current;
      const secPerBar = (60 / (p.bpm || 120)) * ((p.sig && p.sig.num) || 4);
      const bars = Math.max(1, Math.ceil(buf.duration / secPerBar));
      dispatch({ type: 'audio.dropClip', sample, track, start: Math.max(0, startTick || 0), bars });
      setHint(`Dropped "${file.name}" onto the timeline (${buf.duration.toFixed(1)}s).`);
      return true;
    } catch (e) {
      setHint(`Could not import that audio: ${e.message}`);
      return false;
    } finally {
      setBusy(null);
    }
  }, [engine, dispatch, setHint]);

  /* ----------------------------------------- real-time collaboration (CRDT) */
  const meRef = useRef(null);
  if (!meRef.current) {
    const colors = ['#ff746e', '#85c425', '#36b2ff', '#edb417', '#b07cff', '#3fc1a0'];
    meRef.current = { name: `Guest ${Math.floor(Math.random() * 900 + 100)}`, color: colors[Math.floor(Math.random() * colors.length)] };
  }
  const [collab, setCollab] = useState({ inRoom: false, peers: [], connected: false, room: null });
  const applyingRemote = useRef(false);
  const pushTimer = useRef(null);

  useEffect(() => onCollab(setCollab), []);

  const joinCollab = useCallback((roomId) => {
    const room = String(roomId || '').trim();
    if (!room) return;
    collabJoin(room, meRef.current, (json) => {
      applyingRemote.current = true;
      const merged = { ...json, samples: (projectRef.current && projectRef.current.samples) || {} };
      dispatch({ type: 'set', project: merged, remote: true });
    });
    setHint(`Joined session "${room}". Share the code so others can jump in.`);
  }, [dispatch, setHint]);

  const leaveCollab = useCallback(() => { collabLeave(); setHint('Left the collaboration session.'); }, [setHint]);
  const setPresence = useCallback((patch) => { if (collabActive()) collabSetPresence(patch); }, []);

  // Broadcast which view you're looking at so peers see where everyone is.
  useEffect(() => { if (collabActive()) collabSetPresence({ view: ui.view }); }, [ui.view, collab.inRoom]);

  // Debounced push of local edits into the shared doc; skips the echo of a
  // change we just applied from a remote peer.
  useEffect(() => {
    if (!collabActive()) return undefined;
    if (applyingRemote.current) { applyingRemote.current = false; return undefined; }
    clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => collabPush(projectRef.current), 350);
    return undefined;
  }, [project]);

  /** Render the full mastered song to an in-memory audio Blob (no download).
      Used by the Release panel to publish without saving a file first. */
  const renderMasterBlob = useCallback(async ({ format = 'mp3', bitrate = 320 } = {}) => {
    const p = projectRef.current;
    await engine.ensureSamplesReady(p);
    const sampleRate = engine.ctx ? engine.ctx.sampleRate : 44100;
    const buffer = await renderProject(p, engine.buffers, {
      mode: 'song',
      repeats: 1,
      sampleRate,
      onProgress: (f) => setBusy(`Rendering… ${Math.round(f * 100)}%`),
    });
    return encodeAudio(buffer, format, { bitrate });
  }, [engine, setBusy]);

  const exportWav = useCallback(async (mode) => {
    setBusy('Rendering… 0%');
    try {
      const p = projectRef.current;
      await engine.ensureSamplesReady(p);
      const sampleRate = engine.ctx ? engine.ctx.sampleRate : 44100;
      const m = mode || uiRef.current.mode;
      const buffer = await renderProject(p, engine.buffers, {
        mode: m === 'song' ? 'song' : 'pattern',
        repeats: m === 'song' ? 1 : 2,
        sampleRate,
        onProgress: (f) => setBusy(`Rendering… ${Math.round(f * 100)}%`),
      });
      await saveBlobAs(encodeWav(buffer), `${(p.name || 'project').replace(/\s+/g, '_')}.wav`);
      setHint('WAV exported.');
    } catch (e) {
      setHint(`Export failed: ${e.message}`);
    } finally {
      setBusy(null);
    }
  }, [engine, setHint]);

  /** Unified export: scope 'pattern' | 'song' | 'stems', format 'wav' | 'aiff' | 'mp3'. */
  const exportAudio = useCallback(async ({ scope = 'song', format = 'wav', bitrate = 192 } = {}) => {
    const fmt = format.toUpperCase();
    setBusy('Rendering… 0%');
    try {
      const p = projectRef.current;
      await engine.ensureSamplesReady(p);
      const sampleRate = engine.ctx ? engine.ctx.sampleRate : 44100;
      const base = (p.name || 'project').replace(/\s+/g, '_');
      if (scope === 'stems') {
        const stems = await renderStems(p, engine.buffers, {
          mode: uiRef.current.mode === 'song' ? 'song' : 'pattern',
          sampleRate,
          repeats: 1,
          onStem: (done, total) => setBusy(`Rendering stems… ${done}/${total}`),
        });
        setBusy(`Encoding ${fmt}…`);
        const files = [];
        for (let i = 0; i < stems.length; i++) {
          // eslint-disable-next-line no-await-in-loop
          const blob = await encodeAudio(stems[i].buffer, format, { bitrate });
          files.push({ name: `${base}_${stems[i].name.replace(/\s+/g, '')}.${format}`, blob });
        }
        await saveFilesToDir(files);
        setHint(`${stems.length} stems exported (${fmt}).`);
      } else {
        const mode = scope === 'pattern' ? 'pattern' : 'song';
        const buffer = await renderProject(p, engine.buffers, {
          mode,
          repeats: mode === 'song' ? 1 : 2,
          sampleRate,
          onProgress: (f) => setBusy(`Rendering… ${Math.round(f * 100)}%`),
        });
        setBusy(`Encoding ${fmt}…`);
        const blob = await encodeAudio(buffer, format, { bitrate });
        const ok = await saveBlobAs(blob, `${base}.${format}`);
        setHint(ok ? `${fmt} exported.` : 'Export cancelled.');
      }
    } catch (e) {
      setHint(`Export failed: ${e.message}`);
    } finally {
      setBusy(null);
    }
  }, [engine, setHint]);

  /* ------------------------------------------------------- note recording */

  const recordNote = useCallback((key, vel, channelId) => {
    if (!uiRef.current.recording || !engine.playing) return null;
    const p = projectRef.current;
    const target = channelId || p.selectedChannel;
    // Drum hits land on the nearest step, melodic notes keep their exact tick.
    const raw = engine.currentPosition();
    const tick = channelId ? Math.round(raw / STEP_TICKS) * STEP_TICKS : Math.round(raw);
    const note = { id: `rec${Math.random().toString(36).slice(2)}`, t: Math.max(0, tick), k: key, d: STEP_TICKS, v: vel };
    dispatch({ type: 'note.add', patternId: p.activePattern, channelId: target, note });
    return { ...note, channelId: target };
  }, [engine]);

  const finishRecordedNote = useCallback((note) => {
    if (!note) return;
    const p = projectRef.current;
    const end = Math.round(engine.currentPosition());
    const d = Math.max(6, end > note.t ? end - note.t : STEP_TICKS);
    dispatch({
      type: 'note.update',
      patternId: p.activePattern,
      channelId: note.channelId || p.selectedChannel,
      id: note.id,
      patch: { d },
    });
  }, [engine]);

  /* ------------------------------------------------------------- Web MIDI */

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.requestMIDIAccess) return undefined;
    let access = null;
    let cancelled = false;

    const handle = (e) => {
      const [status, a, b] = e.data;
      const type = status & 0xf0;
      const isOn = type === 0x90 && b > 0;
      const isOff = type === 0x80 || (type === 0x90 && b === 0);
      if (!isOn && !isOff) return;
      const p = projectRef.current;
      const u = uiRef.current;
      let channelId = p.selectedChannel;
      let key = a;
      if (u.view === 'drums') {
        const role = GM_DRUMS[a];
        const pad = role ? padChannels(p).get(role) : null;
        if (pad) { channelId = pad.id; key = 60; }
      }
      const tag = `${channelId}:${a}`;
      if (isOn) {
        const vel = b / 127;
        engine.noteOn(channelId, key, vel);
        const rec = recordNote(key, vel, u.view === 'drums' ? channelId : undefined);
        midiHeld.current.set(tag, { key, rec, channelId });
      } else {
        const held = midiHeld.current.get(tag);
        if (!held) return;
        midiHeld.current.delete(tag);
        engine.noteOff(held.channelId, held.key);
        if (held.rec) finishRecordedNote(held.rec);
      }
    };

    navigator.requestMIDIAccess().then((a) => {
      if (cancelled) return;
      access = a;
      const wire = () => {
        const list = [...a.inputs.values()];
        list.forEach((input) => { input.onmidimessage = handle; });
        setMidiInputs(list.map((i) => ({ id: i.id, name: i.name || 'MIDI' })));
      };
      wire();
      a.onstatechange = wire;
    }).catch(() => { /* permission denied or unsupported */ });

    return () => {
      cancelled = true;
      if (access) {
        for (const input of access.inputs.values()) input.onmidimessage = null;
        access.onstatechange = null;
      }
    };
  }, [engine, recordNote, finishRecordedNote]);

  const value = useMemo(() => ({
    project, dispatch, engine, ui, setUi, setHint, playing, setPlaying, paused,
    play, stop, pause, togglePlay, setMode, newProject, loadTemplate, addToArrangement, saveFile, openFile, exportWav, exportAudio, renderMasterBlob, loadSampleFile, separateStemsFile, decodeUrlAudio, addBufferChannel, addSampleSound, dropAudioOnTimeline,
    exportStems, exportMidiFile, importMidiFile, midiInputs,
    recordNote, finishRecordedNote, recordAuto, busy,
    detached, popOut, attach,
    collab, joinCollab, leaveCollab, setPresence, me: meRef.current,
    canUndo: state.past.length > 0, canRedo: state.future.length > 0,
    BAR_TICKS,
  }), [project, engine, ui, setUi, setHint, playing, paused, play, stop, pause, togglePlay, setMode,
    newProject, saveFile, openFile, exportWav, exportAudio, renderMasterBlob, addToArrangement, recordNote, finishRecordedNote, busy,
    detached, popOut, attach, collab, joinCollab, leaveCollab, addSampleSound,
    state.past.length, state.future.length]);

  return React.createElement(StudioContext.Provider, { value }, children);
}

export function useStudio() {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error('useStudio must be used inside <StudioProvider>');
  return ctx;
}

/** requestAnimationFrame helper for meters, playheads and canvases. */
export function useRaf(callback, active = true) {
  const cb = useRef(callback);
  cb.current = callback;
  useEffect(() => {
    if (!active) return undefined;
    let raf = 0;
    let alive = true;
    const loop = () => {
      if (!alive) return;
      cb.current();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, [active]);
}
