import React, { createContext, useContext, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { getEngine } from './audio/engine';
import { historyReducer, initHistory } from './reducer';
import { createDefaultProject, createEmptyProject, createTemplate, normalizeProject } from './project';
import { renderProject, renderStems, encodeWav, downloadBlob } from './audio/render';
import { exportMidi, parseMidi, GM_DRUMS } from './midi';
import { padChannels } from './drums';
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
    pianoZoom: 1,
    playlistZoom: 1,
    mode: 'pattern',
    padChannel: null,
    recording: false,
    metronome: false,
    hint: 'Tryck PLAY eller mellanslag for att starta. F5 Playlist / F6 Channel Rack / F7 Piano Roll / F9 Mixer.',
    pluginOpen: false,
    octave: 4,
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
          setUi({ hint: 'Projektet autosparades utan samples (for stort for webblasarens lagring). Spara till fil for att behalla dem.' });
        } catch (e2) { /* give up silently */ }
      }
    }, 700);
    return () => clearTimeout(t);
  }, [project, setUi]);

  const setHint = useCallback((hint) => setUi({ hint }), [setUi]);

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
    setHint(demo ? 'Demo-projekt laddat.' : 'Nytt tomt projekt.');
  }, [setHint]);

  const loadTemplate = useCallback((id) => {
    dispatch({ type: 'set', project: createTemplate(id) });
    setHint('Mall laddad — tryck play.');
  }, [setHint]);

  const saveFile = useCallback(() => {
    const blob = new Blob([JSON.stringify(projectRef.current, null, 1)], { type: 'application/json' });
    downloadBlob(blob, `${(projectRef.current.name || 'project').replace(/\s+/g, '_')}.flow.json`);
    setHint('Projekt sparat som .flow.json');
  }, [setHint]);

  const openFile = useCallback(async (file) => {
    try {
      const text = await file.text();
      dispatch({ type: 'set', project: JSON.parse(text) });
      setHint(`Laddade ${file.name}`);
    } catch (e) {
      setHint('Kunde inte lasa filen.');
    }
  }, [setHint]);

  const exportStems = useCallback(async () => {
    setBusy('Renderar stems…');
    try {
      const p = projectRef.current;
      const sampleRate = engine.ctx ? engine.ctx.sampleRate : 44100;
      const mode = uiRef.current.mode === 'song' ? 'song' : 'pattern';
      const stems = await renderStems(p, engine.buffers, { mode, sampleRate, repeats: 1 });
      const base = (p.name || 'project').replace(/\s+/g, '_');
      stems.forEach((stem, i) => {
        setTimeout(() => downloadBlob(encodeWav(stem.buffer), `${base}_${stem.name.replace(/\s+/g, '')}.wav`), i * 500);
      });
      setHint(`${stems.length} stems exporterade.`);
    } catch (e) {
      setHint(`Stem-export misslyckades: ${e.message}`);
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
      setHint('MIDI-fil exporterad.');
    } catch (e) {
      setHint(`MIDI-export misslyckades: ${e.message}`);
    }
  }, [setHint]);

  const importMidiFile = useCallback(async (file) => {
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const parsed = parseMidi(bytes);
      if (!parsed.tracks.length) throw new Error('inga noter i filen');
      dispatch({
        type: 'midi.import',
        tracks: parsed.tracks,
        bars: parsed.bars,
        bpm: parsed.bpm,
        name: file.name.replace(/\.[^.]+$/, '').slice(0, 22),
      });
      setHint(`Importerade ${parsed.tracks.length} sparr fran ${file.name} (${parsed.bpm} BPM).`);
    } catch (e) {
      setHint(`Kunde inte lasa MIDI-filen: ${e.message}`);
    }
  }, [setHint]);

  /** Loads an audio file into a channel, or into a brand new sampler channel. */
  const loadSampleFile = useCallback(async (file, channelId) => {
    try {
      const sample = await fileToSample(file);
      engine.ensureContext();
      await engine.decodeSample(sample);
      dispatch({ type: 'sample.add', sample, channelId, newChannel: !channelId });
      setHint(`Sample "${sample.name}" laddad (${(sample.bytes / 1024).toFixed(0)} kB).`);
      return sample;
    } catch (e) {
      setHint(`Kunde inte lasa ljudfilen: ${e.message}`);
      return null;
    }
  }, [engine, setHint]);

  const exportWav = useCallback(async (mode) => {
    setBusy('Renderar...');
    try {
      const p = projectRef.current;
      const sampleRate = engine.ctx ? engine.ctx.sampleRate : 44100;
      const m = mode || uiRef.current.mode;
      const buffer = await renderProject(p, engine.buffers, {
        mode: m === 'song' ? 'song' : 'pattern',
        repeats: m === 'song' ? 1 : 2,
        sampleRate,
      });
      downloadBlob(encodeWav(buffer), `${(p.name || 'project').replace(/\s+/g, '_')}.wav`);
      setHint('WAV exporterad.');
    } catch (e) {
      setHint(`Export misslyckades: ${e.message}`);
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
    play, stop, togglePlay, setMode, newProject, loadTemplate, saveFile, openFile, exportWav, loadSampleFile,
    exportStems, exportMidiFile, importMidiFile, midiInputs,
    recordNote, finishRecordedNote, busy,
    canUndo: state.past.length > 0, canRedo: state.future.length > 0,
    BAR_TICKS,
  }), [project, engine, ui, setUi, setHint, playing, play, stop, togglePlay, setMode,
    newProject, saveFile, openFile, exportWav, recordNote, finishRecordedNote, busy,
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
