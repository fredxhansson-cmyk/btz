import React, { useEffect, useRef } from 'react';
import s from '../../styles/studio.module.css';
import { StudioProvider, useStudio } from '../../lib/studio/StudioContext';
import Transport from './Transport';
import Browser from './Browser';
import ChannelRack from './ChannelRack';
import PianoRoll from './PianoRoll';
import Playlist from './Playlist';
import Mixer from './Mixer';
import DrumMachine from './DrumMachine';
import PluginPanel from './PluginPanel';
import { clamp } from '../../lib/studio/constants';
import { ROLES, padChannels } from '../../lib/studio/drums';

const KEYMAP = {
  z: 0, s: 1, x: 2, d: 3, c: 4, v: 5, g: 6, b: 7, h: 8, n: 9, j: 10, m: 11, ',': 12, l: 13, '.': 14,
  q: 12, 2: 13, w: 14, 3: 15, e: 16, r: 17, 5: 18, t: 19, 6: 20, y: 21, 7: 22, u: 23, i: 24,
};

const TABS = [
  { id: 'playlist', label: 'Playlist', hint: 'F5' },
  { id: 'rack', label: 'Channel Rack', hint: 'F6' },
  { id: 'piano', label: 'Piano Roll', hint: 'F7' },
  { id: 'drums', label: 'Trummaskin', hint: 'F8' },
  { id: 'mixer', label: 'Mixer', hint: 'F9' },
];

/** Letter key -> drum pad role, matching the pad grid layout. */
const PAD_KEYS = ROLES.reduce((acc, r) => { acc[r.key] = r.id; return acc; }, {});

function isTyping(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

function Workspace() {
  const {
    project, dispatch, engine, ui, setUi, togglePlay, saveFile,
    recordNote, finishRecordedNote,
  } = useStudio();
  const held = useRef(new Map());
  const projectRef = useRef(project);
  projectRef.current = project;
  // Kept in refs so the key listener never works from a stale closure.
  const viewRef = useRef(ui.view);
  viewRef.current = ui.view;
  const octaveRef = useRef(ui.octave);
  octaveRef.current = ui.octave;

  useEffect(() => {
    const down = (e) => {
      if (isTyping(e.target)) return;
      const k = e.key.toLowerCase();

      if (e.key === ' ') { e.preventDefault(); togglePlay(); return; }
      if (e.key === 'F5') { e.preventDefault(); setUi({ view: 'playlist' }); return; }
      if (e.key === 'F6') { e.preventDefault(); setUi({ view: 'rack' }); return; }
      if (e.key === 'F7') { e.preventDefault(); setUi({ view: 'piano' }); return; }
      if (e.key === 'F8') { e.preventDefault(); setUi({ view: 'drums' }); return; }
      if (e.key === 'F9') { e.preventDefault(); setUi({ view: 'mixer' }); return; }
      if ((e.ctrlKey || e.metaKey) && k === 's') { e.preventDefault(); saveFile(); return; }
      if ((e.ctrlKey || e.metaKey) && k === 'z') {
        e.preventDefault();
        dispatch({ type: e.shiftKey ? 'redo' : 'undo' });
        return;
      }
      if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); dispatch({ type: 'redo' }); return; }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'ArrowUp') { setUi((u) => ({ octave: clamp(u.octave + 1, 0, 8) })); return; }
      if (e.key === 'ArrowDown') { setUi((u) => ({ octave: clamp(u.octave - 1, 0, 8) })); return; }
      if (k === 'r' && !KEYMAP[k]) { /* r is also a piano key, handled below */ }

      // In the drum machine the letter keys are pads instead of a piano.
      if (viewRef.current === 'drums') {
        const role = PAD_KEYS[k];
        if (!role || e.repeat || held.current.has(k)) return;
        const ch = padChannels(projectRef.current).get(role);
        if (!ch) return;
        engine.preview(ch.id, 60, 1);
        const rec = recordNote(60, 1, ch.id);
        held.current.set(k, { key: 60, rec, pad: true });
        return;
      }

      const semis = KEYMAP[k];
      if (semis == null || e.repeat || held.current.has(k)) return;
      const key = clamp((octaveRef.current + 1) * 12 + semis, 0, 127);
      engine.noteOn(projectRef.current.selectedChannel, key, 0.9);
      const rec = recordNote(key, 0.9);
      held.current.set(k, { key, rec });
    };

    const up = (e) => {
      const k = e.key.toLowerCase();
      const info = held.current.get(k);
      if (!info) return;
      held.current.delete(k);
      if (info.pad) return;
      engine.noteOff(projectRef.current.selectedChannel, info.key);
      finishRecordedNote(info.rec);
    };

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [dispatch, engine, recordNote, finishRecordedNote, saveFile, setUi, togglePlay]);

  return (
    <div className={s.app}>
      <Transport />
      <div className={s.tabs}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={ui.view === t.id ? `${s.tab} ${s.on}` : s.tab}
            onClick={() => setUi({ view: t.id })}
          >
            {t.label}<span className={s.tabHint}>{t.hint}</span>
          </button>
        ))}
        <div className={s.spacer} />
        <button
          type="button"
          className={ui.pluginOpen ? `${s.tab} ${s.on}` : s.tab}
          onClick={() => setUi({ pluginOpen: !ui.pluginOpen })}
        >
          Instrument
        </button>
      </div>

      <div className={s.body}>
        <Browser />
        <main className={s.main}>
          <div className={s.viewArea}>
            {ui.view === 'playlist' && <Playlist />}
            {ui.view === 'rack' && <ChannelRack />}
            {ui.view === 'piano' && <PianoRoll />}
            {ui.view === 'drums' && <DrumMachine />}
            {ui.view === 'mixer' && <Mixer />}
          </div>
          {ui.pluginOpen && <PluginPanel />}
        </main>
      </div>

      <footer className={s.status}>
        <span className={s.hint}>{ui.hint}</span>
        <div className={s.spacer} />
        <span className={s.dim}>Oktav {ui.octave}</span>
        <span className={s.dim}>{project.bpm.toFixed(1)} BPM</span>
        <span className={s.dim}>{ui.mode === 'song' ? 'SONG' : 'PATTERN'}</span>
      </footer>
    </div>
  );
}

export default function Studio() {
  return (
    <StudioProvider>
      <Workspace />
    </StudioProvider>
  );
}
