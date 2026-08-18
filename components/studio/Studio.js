import React, { useEffect, useRef, useState } from 'react';
import s from '../../styles/studio.module.css';
import { StudioProvider, useStudio } from '../../lib/studio/StudioContext';
import Transport from './Transport';
import Browser from './Browser';
import ChannelRack from './ChannelRack';
import PianoRoll from './PianoRoll';
import Playlist from './Playlist';
import Mixer from './Mixer';
import DrumMachine from './DrumMachine';
import Automation from './Automation';
import HelpOverlay from './HelpOverlay';
import RecordPanel from './RecordPanel';
import AiPanel from './AiPanel';
import PluginPanel from './PluginPanel';
import { clamp } from '../../lib/studio/constants';
import { ROLES, padChannels } from '../../lib/studio/drums';
import { isCoarsePointer } from '../../lib/studio/touch';
import { useRaf } from '../../lib/studio/StudioContext';

const KEYMAP = {
  z: 0, s: 1, x: 2, d: 3, c: 4, v: 5, g: 6, b: 7, h: 8, n: 9, j: 10, m: 11, ',': 12, l: 13, '.': 14,
  q: 12, 2: 13, w: 14, 3: 15, e: 16, r: 17, 5: 18, t: 19, 6: 20, y: 21, 7: 22, u: 23, i: 24,
};

const NAV_ICONS = {
  playlist: '▤', rack: '▦', piano: '🎹', drums: '⬢', mixer: '⧉', automation: '⤢',
};

const TABS = [
  { id: 'playlist', label: 'Arrangement', hint: 'F5' },
  { id: 'rack', label: 'Instruments', hint: 'F6' },
  { id: 'piano', label: 'Piano Roll', hint: 'F7' },
  { id: 'drums', label: 'Drum Machine', hint: 'F8' },
  { id: 'automation', label: 'Automation', hint: 'F10' },
  { id: 'mixer', label: 'Mixer', hint: 'F9' },
];

/** Letter key -> drum pad role, matching the pad grid layout. */
const PAD_KEYS = ROLES.reduce((acc, r) => { acc[r.key] = r.id; return acc; }, {});

/** Small live readout: notes triggered per second and which clock drives playback. */
function EngineStatus() {
  const { engine } = useStudio();
  const ref = useRef(null);
  const last = useRef({ t: 0, count: 0, rate: 0 });
  useRaf(() => {
    if (!ref.current) return;
    const now = performance.now();
    if (now - last.current.t > 500) {
      const delta = engine.voiceCount - last.current.count;
      last.current.rate = Math.round((delta * 1000) / Math.max(1, now - last.current.t));
      last.current.count = engine.voiceCount;
      last.current.t = now;
    }
    const clock = engine.clockReady ? 'worklet' : 'timer';
    ref.current.textContent = `${last.current.rate} notes/s · ${clock}`;
  });
  return <span className={s.dim} ref={ref} />;
}

function isTyping(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

function Workspace({ installPrompt, onInstalled }) {
  const {
    project, dispatch, engine, ui, setUi, togglePlay, saveFile,
    recordNote, finishRecordedNote, loadSampleFile,
  } = useStudio();
  const [dropping, setDropping] = useState(false);
  const [help, setHelp] = useState(false);
  const [recOpen, setRecOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  // Touch layout: bottom navigation, slide-over browser and bigger targets.
  useEffect(() => {
    const apply = () => setUi({ touch: isCoarsePointer() || window.innerWidth < 900 });
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, [setUi]);
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
      if (isTyping(e.target) || e.defaultPrevented) return;
      const k = e.key.toLowerCase();

      if (e.key === ' ') { e.preventDefault(); togglePlay(); return; }
      if (e.key === 'F5') { e.preventDefault(); setUi({ view: 'playlist' }); return; }
      if (e.key === 'F6') { e.preventDefault(); setUi({ view: 'rack' }); return; }
      if (e.key === 'F7') { e.preventDefault(); setUi({ view: 'piano' }); return; }
      if (e.key === 'F8') { e.preventDefault(); setUi({ view: 'drums' }); return; }
      if (e.key === 'F10') { e.preventDefault(); setUi({ view: 'automation' }); return; }
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) { e.preventDefault(); setHelp((v) => !v); return; }
      if (e.key === 'Escape') { setHelp(false); return; }
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

  const onDrop = (e) => {
    const files = [...(e.dataTransfer.files || [])].filter((f) => f.type.startsWith('audio/') || /\.(wav|mp3|ogg|flac|m4a|aac)$/i.test(f.name));
    if (!files.length) return;
    e.preventDefault();
    setDropping(false);
    files.slice(0, 8).forEach((f) => loadSampleFile(f));
    setUi({ view: 'rack' });
  };

  return (
    <div
      className={ui.touch ? `${s.app} ${s.touch}` : s.app}
      onDragOver={(e) => { e.preventDefault(); setDropping(true); }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDropping(false); }}
      onDrop={onDrop}
    >
      {help && <HelpOverlay onClose={() => setHelp(false)} />}
      {recOpen && <RecordPanel onClose={() => setRecOpen(false)} />}
      {aiOpen && <AiPanel onClose={() => setAiOpen(false)} />}
      {dropping && (
        <div className={s.dropHint}>
          <div className={s.dropCard}>Drop audio files to create sampler channels</div>
        </div>
      )}
      <Transport onOpenRecord={() => setRecOpen(true)} onOpenAi={() => setAiOpen(true)} />
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
        <button type="button" className={`${s.tab} ${s.aiTab}`} onClick={() => setAiOpen(true)}>
          BTZ Brain<span className={s.tabHint}>AI</span>
        </button>
        <button type="button" className={s.tab} onClick={() => setRecOpen(true)}>
          Record<span className={s.tabHint}>mic</span>
        </button>
        <button type="button" className={s.tab} onClick={() => setHelp(true)}>
          Help<span className={s.tabHint}>?</span>
        </button>
      </div>

      <div className={s.body}>
        {ui.touch && ui.browserOpen && (
          <div className={s.sideBackdrop} onPointerDown={() => setUi({ browserOpen: false })} />
        )}
        <div className={ui.touch && ui.browserOpen ? `${s.sideWrap} ${s.sideOpen}` : s.sideWrap}>
          <Browser />
        </div>
        <main className={s.main}>
          <div className={s.viewArea}>
            {ui.view === 'playlist' && <Playlist />}
            {ui.view === 'rack' && <ChannelRack />}
            {ui.view === 'piano' && <PianoRoll />}
            {ui.view === 'drums' && <DrumMachine />}
            {ui.view === 'automation' && <Automation />}
            {ui.view === 'mixer' && <Mixer />}
          </div>
          {ui.pluginOpen && <PluginPanel />}
        </main>
      </div>

      {ui.touch && (
        <nav className={s.bottomNav}>
          <button
            type="button"
            className={ui.browserOpen ? `${s.navBtn} ${s.on}` : s.navBtn}
            onClick={() => setUi({ browserOpen: !ui.browserOpen })}
          >
            <span className={s.navIcon}>♪</span>Sounds
          </button>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={ui.view === t.id ? `${s.navBtn} ${s.on}` : s.navBtn}
              onClick={() => setUi({ view: t.id, browserOpen: false })}
            >
              <span className={s.navIcon}>{NAV_ICONS[t.id]}</span>
              {({ playlist: 'Arrange', rack: 'Instr', piano: 'Piano', drums: 'Drums', mixer: 'Mixer', automation: 'Auto' })[t.id]}
            </button>
          ))}
        </nav>
      )}

      <footer className={s.status}>
        <span className={s.hint}>{ui.hint}</span>
        <div className={s.spacer} />
        {installPrompt && (
          <button
            type="button"
            className={`${s.btn} ${s.on}`}
            onClick={async () => {
              installPrompt.prompt();
              await installPrompt.userChoice;
              if (onInstalled) onInstalled();
            }}
            title="Install BTZ on this device"
          >Install app</button>
        )}
        <EngineStatus />
        {!ui.touch && (
          <>
            <span className={s.dim}>Octave {ui.octave}</span>
            <span className={s.dim}>{project.bpm.toFixed(1)} BPM</span>
            <span className={s.dim}>{ui.mode === 'song' ? 'SONG' : 'PATTERN'}</span>
          </>
        )}
      </footer>
    </div>
  );
}

export default function Studio({ installPrompt, onInstalled }) {
  return (
    <StudioProvider>
      <Workspace installPrompt={installPrompt} onInstalled={onInstalled} />
    </StudioProvider>
  );
}
