import React, { createContext, useContext, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { getEngine } from './audio/engine';
import { historyReducer, initHistory } from './reducer';
import { createDefaultProject, createEmptyProject, createTemplate, normalizeProject } from './project';
import { renderProject, renderStems, encodeWav, encodeAudio, downloadBlob } from './audio/render';
import { exportMidi, parseMidi, GM_DRUMS } from './midi';
import { padChannels } from './drums';
import { loadBrain, saveBrain, learnFromProject } from './ai';
import { BAR_TICKS, STEP_TICKS } from './constants';
import { fileToSample } from './samples';

const StudioContext = createContext(null);
const STORAGE_KEY = 'flowstudio.project.v1';

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
    () => initHistory(loadStored() || createDefaultProject()));
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
  });
  const setUi = useCallback((patch) => setUiState((u) => ({ ...u, ...(typeof patch === 'function' ? patch(u) : patch) })), []);
  const [playing, setPlaying] = useState(false);
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
    const m = mode || uiRef.current.mode;
    const countIn = uiRef.current.recording ? (projectRef.current.countIn || 0) : 0;
    engine.play(m, fromTick, countIn);
    setUi({ mode: m });
    setPlaying(true);
  }, [engine, setUi]);

  const stop = useCallback(() => {
    engine.stop();
    setPlaying(false);
    setUi({ recording: false });
  }, [engine, setUi]);

  const togglePlay = useCallback(() => {
    if (engine.playing) stop(); else play();
  }, [engine, play, stop]);

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

  const saveFile = useCallback(() => {
    const blob = new Blob([JSON.stringify(projectRef.current, null, 1)], { type: 'application/json' });
    downloadBlob(blob, `${(projectRef.current.name || 'project').replace(/\s+/g, '_')}.flow.json`);
    setHint('Project saved as .flow.json');
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
      stems.forEach((stem, i) => {
        setTimeout(() => downloadBlob(encodeWav(stem.buffer), `${base}_${stem.name.replace(/\s+/g, '')}.wav`), i * 500);
      });
      setHint(`${stems.length} stems exported.`);
    } catch (e) {
      setHint(`Stem export failed: ${e.message}`);
    } finally {
      setBusy(null);
    }
  }, [engine, setHint]);

  const exportMidiFile = useCallback((mode) => {
    try {
      const p = projectRef.current;
      const m = mode || uiRef.current.mode;
      const bytes = exportMidi(p, m === 'song' ? 'song' : 'pattern');
      downloadBlob(new Blob([bytes], { type: 'audio/midi' }), `${(p.name || 'project').replace(/\s+/g, '_')}.mid`);
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

  const exportWav = useCallback(async (mode) => {
    setBusy('Rendering… 0%');
    try {
      const p = projectRef.current;
      const sampleRate = engine.ctx ? engine.ctx.sampleRate : 44100;
      const m = mode || uiRef.current.mode;
      const buffer = await renderProject(p, engine.buffers, {
        mode: m === 'song' ? 'song' : 'pattern',
        repeats: m === 'song' ? 1 : 2,
        sampleRate,
        onProgress: (f) => setBusy(`Rendering… ${Math.round(f * 100)}%`),
      });
      downloadBlob(encodeWav(buffer), `${(p.name || 'project').replace(/\s+/g, '_')}.wav`);
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
        for (let i = 0; i < stems.length; i++) {
          // eslint-disable-next-line no-await-in-loop
          const blob = await encodeAudio(stems[i].buffer, format, { bitrate });
          const name = `${base}_${stems[i].name.replace(/\s+/g, '')}.${format}`;
          setTimeout(() => downloadBlob(blob, name), i * 400);
        }
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
        downloadBlob(blob, `${base}.${format}`);
        setHint(`${fmt} exported.`);
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
    project, dispatch, engine, ui, setUi, setHint, playing, setPlaying,
    play, stop, togglePlay, setMode, newProject, loadTemplate, saveFile, openFile, exportWav, exportAudio, loadSampleFile,
    exportStems, exportMidiFile, importMidiFile, midiInputs,
    recordNote, finishRecordedNote, busy,
    canUndo: state.past.length > 0, canRedo: state.future.length > 0,
    BAR_TICKS,
  }), [project, engine, ui, setUi, setHint, playing, play, stop, togglePlay, setMode,
    newProject, saveFile, openFile, exportWav, exportAudio, recordNote, finishRecordedNote, busy,
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
