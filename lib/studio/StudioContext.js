import React, { createContext, useContext, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { getEngine } from './audio/engine';
import { historyReducer, initHistory } from './reducer';
import { createDefaultProject, createEmptyProject, normalizeProject } from './project';
import { renderProject, encodeWav, downloadBlob } from './audio/render';
import { BAR_TICKS, STEP_TICKS } from './constants';

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

  const projectRef = useRef(project);
  projectRef.current = project;
  const uiRef = useRef(ui);
  uiRef.current = ui;

  useEffect(() => { engine.setProject(project); }, [engine, project]);
  useEffect(() => { engine.metronome = ui.metronome; }, [engine, ui.metronome]);

  // Debounced autosave.
  useEffect(() => {
    const t = setTimeout(() => {
      try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project)); } catch (e) { /* quota */ }
    }, 700);
    return () => clearTimeout(t);
  }, [project]);

  const setHint = useCallback((hint) => setUi({ hint }), [setUi]);

  /* ------------------------------------------------------------- transport */

  const play = useCallback((mode, fromTick = 0) => {
    const m = mode || uiRef.current.mode;
    engine.play(m, fromTick);
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

  const value = useMemo(() => ({
    project, dispatch, engine, ui, setUi, setHint, playing, setPlaying,
    play, stop, togglePlay, setMode, newProject, saveFile, openFile, exportWav,
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
