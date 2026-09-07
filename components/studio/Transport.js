import React, { useCallback, useEffect, useRef, useState } from 'react';
import s from '../../styles/studio.module.css';
import { useStudio, useRaf } from '../../lib/studio/StudioContext';
import { ticksToBBT, clamp } from '../../lib/studio/constants';
import Knob from './Knob';

function Menu({ label, items, openId, setOpenId }) {
  const open = openId === label;
  return (
    <div className={s.menuWrap}>
      <button
        type="button"
        className={open ? `${s.menuBtn} ${s.on}` : s.menuBtn}
        // Hover opens; moving across the bar switches menus. Click toggles.
        onClick={() => setOpenId(open ? null : label)}
        onMouseEnter={() => setOpenId(label)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {label}<span className={s.menuCaret} aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className={s.dropdown} role="menu">
          {items.map((it, i) => (it.sep ? <div key={`s${i}`} className={s.dropSep} /> : (
            <button
              key={it.label}
              type="button"
              className={s.dropItem}
              role="menuitem"
              disabled={it.disabled}
              onClick={() => { setOpenId(null); it.onClick(); }}
            >
              <span>{it.label}</span>
              {it.hint && <span className={s.menuHint}>{it.hint}</span>}
            </button>
          )))}
        </div>
      )}
    </div>
  );
}

export default function Transport({ onOpenRecord, onOpenAi, onOpenSettings, onOpenCommand, onOpenProjects }) {
  const {
    project, dispatch, engine, ui, setUi, play, stop, pause, setMode,
    newProject, saveFile, openFile, exportAudio, exportMidiFile, importMidiFile, separateStemsFile,
    canUndo, canRedo, playing, paused, busy,
  } = useStudio();
  const [openId, setOpenId] = useState(null);
  const menuBarRef = useRef(null);
  // Close any open menu on outside click or Escape (replaces the old
  // full-screen backdrop that used to block hover-switching between menus).
  useEffect(() => {
    if (!openId) return undefined;
    const onDown = (e) => { if (menuBarRef.current && !menuBarRef.current.contains(e.target)) setOpenId(null); };
    const onKey = (e) => { if (e.key === 'Escape') setOpenId(null); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
  }, [openId]);
  const [sheet, setSheet] = useState(false);
  const [editTempo, setEditTempo] = useState(null);
  const timeRef = useRef(null);
  const meterL = useRef(null);
  const fileRef = useRef(null);
  const midiRef = useRef(null);
  const stemRef = useRef(null);
  const tempoDrag = useRef(null);

  useRaf(() => {
    if (timeRef.current) {
      // Keep the readout at the paused position instead of snapping to 0, so a
      // paused transport shows where playback will resume from.
      const pos = (engine.playing || engine.pausedTick) ? engine.currentPosition() : 0;
      timeRef.current.textContent = ticksToBBT(
        pos,
        project.barTicks,
        project.beatTicks,
      );
    }
    if (meterL.current) {
      const lvl = engine.masterLevel();
      meterL.current.style.transform = `scaleX(${Math.min(1, lvl)})`;
      meterL.current.style.background = lvl > 0.96 ? '#f1383e' : lvl > 0.75 ? '#edb417' : '#85c425';
    }
  });

  const onTempoDown = useCallback((e) => {
    if (editTempo !== null) return; // already typing — let the input handle it
    e.currentTarget.setPointerCapture(e.pointerId);
    tempoDrag.current = { y: e.clientY, bpm: project.bpm, moved: false };
  }, [project.bpm, editTempo]);

  const onTempoMove = useCallback((e) => {
    const d = tempoDrag.current;
    if (!d) return;
    // Ignore a tiny wiggle so a plain click stays a click, not a nudge.
    if (!d.moved && Math.abs(e.clientY - d.y) < 4) return;
    d.moved = true;
    const delta = (d.y - e.clientY) * (e.shiftKey ? 0.1 : 0.5);
    dispatch({ type: 'patch', patch: { bpm: clamp(Math.round((d.bpm + delta) * 10) / 10, 20, 300) }, live: true, id: 'bpm' });
  }, [dispatch]);

  const onTempoUp = useCallback((e) => {
    const d = tempoDrag.current;
    tempoDrag.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (err) { /* noop */ }
    // A click with no drag opens the number for typing.
    if (d && !d.moved) setEditTempo(String(project.bpm));
  }, [project.bpm]);

  const fileItems = [
    { label: 'My projects (library)…', onClick: () => onOpenProjects && onOpenProjects() },
    { sep: true },
    { label: 'New empty project', onClick: () => newProject(false) },
    { label: 'Load demo project', onClick: () => newProject(true) },
    { sep: true },
    { label: 'Open .flow.json...', onClick: () => fileRef.current && fileRef.current.click() },
    { label: 'Save project', hint: 'Ctrl+S', onClick: saveFile },
    { sep: true },
    { label: 'Export pattern — WAV', onClick: () => exportAudio({ scope: 'pattern', format: 'wav' }) },
    { label: 'Export full track — WAV', onClick: () => exportAudio({ scope: 'song', format: 'wav' }) },
    { label: 'Export full track — MP3', onClick: () => exportAudio({ scope: 'song', format: 'mp3', bitrate: 320 }) },
    { label: 'Export full track — AIFF', onClick: () => exportAudio({ scope: 'song', format: 'aiff' }) },
    { label: 'Export stems — WAV (per mixer channel)', onClick: () => exportAudio({ scope: 'stems', format: 'wav' }) },
    { sep: true },
    { label: 'Export MIDI', onClick: () => exportMidiFile() },
    { label: 'Import MIDI...', onClick: () => midiRef.current && midiRef.current.click() },
    { sep: true },
    { label: 'Separate audio into stems…', onClick: () => stemRef.current && stemRef.current.click() },
  ];

  const editItems = [
    { label: 'Undo', hint: 'Ctrl+Z', disabled: !canUndo, onClick: () => dispatch({ type: 'undo' }) },
    { label: 'Redo', hint: 'Ctrl+Y', disabled: !canRedo, onClick: () => dispatch({ type: 'redo' }) },
    { sep: true },
    { label: 'New pattern', onClick: () => dispatch({ type: 'pattern.add' }) },
    { label: 'Duplicate pattern', onClick: () => dispatch({ type: 'pattern.clone', id: project.activePattern }) },
    { sep: true },
    { label: 'Clear pattern (all notes)', onClick: () => dispatch({ type: 'pattern.clearAll', patternId: project.activePattern }) },
    { label: 'Clear playlist', onClick: () => dispatch({ type: 'clip.clear' }) },
  ];

  const viewItems = [
    { label: 'Arrangement', hint: 'F5', onClick: () => setUi({ view: 'playlist' }) },
    { label: 'Instruments', hint: 'F6', onClick: () => setUi({ view: 'rack' }) },
    { label: 'Piano Roll', hint: 'F7', onClick: () => setUi({ view: 'piano' }) },
    { label: 'Drum Machine', hint: 'F8', onClick: () => setUi({ view: 'drums' }) },
    { label: 'Mixer', hint: 'F9', onClick: () => setUi({ view: 'mixer' }) },
    { label: 'Automation', hint: 'F10', onClick: () => setUi({ view: 'automation' }) },
    { label: 'Mastering', hint: 'F11', onClick: () => setUi({ view: 'mastering' }) },
    { label: 'Video (film sync)', onClick: () => setUi({ view: 'video' }) },
    { label: 'Live inputs (mic / turntable)', onClick: () => setUi({ view: 'liveinputs' }) },
    { label: 'Workspace (custom layout)', onClick: () => setUi({ view: 'workspace' }) },
    { sep: true },
    { label: 'Record audio (mic / line)…', onClick: () => onOpenRecord && onOpenRecord() },
    { label: 'Fuse Brain (AI)…', onClick: () => onOpenAi && onOpenAi() },
    { sep: true },
    { label: 'Settings…', onClick: () => onOpenSettings && onOpenSettings() },
  ];

  useEffect(() => {
    const close = () => { setOpenId(null); setSheet(false); };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, []);

  return (
    <header className={s.header} onPointerDown={(e) => e.stopPropagation()}>
      <div className={s.brand}>
        <span className={s.brandBars} aria-hidden="true">
          <i style={{ background: 'var(--color-coral)', height: '60%' }} />
          <i style={{ background: 'var(--color-lime)', height: '100%' }} />
          <i style={{ background: 'var(--color-blue)', height: '40%' }} />
        </span>
        <span className={s.brandName}>Fuse</span>
      </div>

      <div className={s.menu} ref={menuBarRef} onMouseLeave={() => setOpenId(null)}>
        <Menu label="File" items={fileItems} openId={openId} setOpenId={setOpenId} />
        <Menu label="Edit" items={editItems} openId={openId} setOpenId={setOpenId} />
        <Menu label="View" items={viewItems} openId={openId} setOpenId={setOpenId} />
        <button
          type="button"
          className={s.menuBtn}
          onClick={() => onOpenSettings && onOpenSettings()}
          title="Settings — user &amp; program"
        >⚙ Settings</button>
      </div>

      <button
        type="button"
        className={s.cmdPill}
        onClick={() => onOpenCommand && onOpenCommand()}
        title="Find and do anything"
      >
        <span className={s.cmdPillIcon} aria-hidden="true">⌕</span>
        <span className={s.cmdPillText}>Search / do anything</span>
        <kbd className={s.cmdPillKbd}>⌘K</kbd>
      </button>

      <div className={s.sep} />

      <div className={s.transport}>
        <button
          type="button"
          className={`${s.tbtn} ${s.playMain}`}
          onClick={() => (playing ? pause() : play())}
          aria-pressed={playing}
          title={playing ? 'Pause (space)' : (paused ? 'Resume (space)' : 'Play (space)')}
        >{playing ? <span className={s.pauseGlyph} aria-label="Pause" /> : '▶'}</button>
        <button
          type="button"
          className={s.tbtn}
          onClick={stop}
          title="Stop — return to start"
        >■</button>
        <button
          type="button"
          className={ui.recording ? `${s.tbtn} ${s.recOn}` : s.tbtn}
          onClick={() => setUi({ recording: !ui.recording })}
          aria-pressed={ui.recording}
          title={ui.recording ? 'Recording — click to stop arming (R)' : 'Record from keyboard (R)'}
        >●</button>
        <button
          type="button"
          className={s.micBtn}
          onClick={() => onOpenRecord && onOpenRecord()}
          title="Record from microphone, line-in, turntable or instrument"
        >
          <span className={s.micGlyph} aria-hidden="true">🎙</span>
          <span className={s.micLbl}>MIC / LINE</span>
        </button>
      </div>

      <div className={s.modeSw}>
        <button type="button" className={ui.mode === 'pattern' ? `${s.seg} ${s.on}` : s.seg} onClick={() => setMode('pattern')}>PAT</button>
        <button type="button" className={ui.mode === 'song' ? `${s.seg} ${s.on}` : s.seg} onClick={() => setMode('song')}>SONG</button>
      </div>

      <span
        className={playing ? `${s.nowPlaying} ${s.on}` : s.nowPlaying}
        title={playing ? 'Playing' : 'Stopped'}
        aria-hidden="true"
      ><i /><i /><i /></span>

      <div className={s.readoutGroup}>
        <div className={s.roCell}>
          <div className={s.roLabel}>Bar : Beat : Tick</div>
          <div className={s.roVal} ref={timeRef}>001:1:00</div>
        </div>
        <div
          className={s.roCell}
          onPointerDown={editTempo === null ? onTempoDown : undefined}
          onPointerMove={editTempo === null ? onTempoMove : undefined}
          onPointerUp={editTempo === null ? onTempoUp : undefined}
          title="Click to type a tempo · drag up/down to change (Shift = fine)"
          style={{ cursor: 'ns-resize' }}
        >
          <div className={s.roLabel}>Tempo</div>
          {editTempo === null ? (
            <div className={`${s.roVal} ${s.roAccent}`}>{project.bpm.toFixed(1)}</div>
          ) : (
            <input
              className={s.tempoInput}
              type="number"
              step="0.1"
              min="20"
              max="300"
              autoFocus
              value={editTempo}
              onFocus={(e) => e.target.select()}
              onPointerDown={(e) => e.stopPropagation()}
              onChange={(e) => setEditTempo(e.target.value)}
              onBlur={() => {
                const v = parseFloat(editTempo);
                if (!Number.isNaN(v)) dispatch({ type: 'patch', patch: { bpm: clamp(v, 20, 300) } });
                setEditTempo(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
                else if (e.key === 'Escape') { setEditTempo(null); }
              }}
            />
          )}
        </div>
      </div>

      <div className={`${s.metGroup} ${s.deskOnly}`}>
        <button
          type="button"
          className={ui.metronome ? s.on : undefined}
          onClick={() => setUi({ metronome: !ui.metronome })}
          title="Metronome"
        >MET</button>
        <select
          value={`${project.sig ? project.sig.num : 4}/${project.sig ? project.sig.den : 4}`}
          onChange={(e) => {
            const [num, den] = e.target.value.split('/').map(Number);
            dispatch({ type: 'patch', patch: { sig: { num, den } } });
          }}
          title="Time signature"
        >
          {['4/4', '3/4', '5/4', '6/8', '7/8', '12/8', '6/4', '2/4'].map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <button
          type="button"
          className={project.countIn ? s.on : undefined}
          onClick={() => dispatch({ type: 'patch', patch: { countIn: ((project.countIn || 0) + 1) % 3 } })}
          title="Count-in bars before recording"
        >{project.countIn ? `${project.countIn} bar${project.countIn > 1 ? 's' : ''} in` : 'No count-in'}</button>
      </div>

      <div className={s.spacer} />

      {busy && <span className={s.busy}>{busy}</span>}

      {ui.touch && (
        <>
          <button
            type="button"
            className={sheet ? `${s.moreBtn} ${s.on}` : s.moreBtn}
            onClick={() => setSheet((v) => !v)}
            title="More"
          >⋯</button>
          {sheet && (
            <div className={s.sheet} onPointerDown={(e) => e.stopPropagation()}>
              <div className={s.sheetGroup}>
                <button type="button" className={`${s.sheetItem} ${s.on}`} onClick={() => { setSheet(false); if (onOpenCommand) onOpenCommand(); }}>
                  ⌕ Search / do anything
                </button>
              </div>
              <div className={s.sheetGroup}>
                <div className={s.sheetLabel}>FILE</div>
                {fileItems.filter((i) => !i.sep).map((it) => (
                  <button key={it.label} type="button" className={s.sheetItem} onClick={() => { setSheet(false); it.onClick(); }}>
                    {it.label}
                  </button>
                ))}
              </div>
              <div className={s.sheetGroup}>
                <div className={s.sheetLabel}>EDIT</div>
                {editItems.filter((i) => !i.sep).map((it) => (
                  <button
                    key={it.label} type="button" className={s.sheetItem} disabled={it.disabled}
                    onClick={() => { setSheet(false); it.onClick(); }}
                  >{it.label}</button>
                ))}
              </div>
              <div className={s.sheetGroup}>
                <div className={s.sheetLabel}>TRANSPORT</div>
                <button type="button" className={s.sheetItem} onClick={() => { setSheet(false); if (onOpenRecord) onOpenRecord(); }}>
                  Record audio…
                </button>
                <button type="button" className={s.sheetItem} onClick={() => { setSheet(false); if (onOpenAi) onOpenAi(); }}>
                  Fuse Brain (AI)…
                </button>
                <button type="button" className={s.sheetItem} onClick={() => { setSheet(false); if (onOpenSettings) onOpenSettings(); }}>
                  Settings…
                </button>
                <button type="button" className={s.sheetItem} onClick={() => { setSheet(false); setUi({ view: 'mastering' }); }}>
                  Mastering…
                </button>
                <div className={s.sheetRow}>
                  <span className={s.dim} style={{ minWidth: 52 }}>Tempo</span>
                  <button type="button" className={s.btn} onClick={() => dispatch({ type: 'patch', patch: { bpm: clamp(Math.round(project.bpm) - 1, 20, 300) } })}>−</button>
                  <span className={s.numBox} style={{ minWidth: 58 }}>{project.bpm.toFixed(1)}</span>
                  <button type="button" className={s.btn} onClick={() => dispatch({ type: 'patch', patch: { bpm: clamp(Math.round(project.bpm) + 1, 20, 300) } })}>+</button>
                </div>
                <div className={s.sheetRow}>
                  <button
                    type="button"
                    className={ui.metronome ? `${s.btn} ${s.on}` : s.btn}
                    onClick={() => setUi({ metronome: !ui.metronome })}
                  >Metronome</button>
                  <select
                    className={s.select}
                    value={`${project.sig ? project.sig.num : 4}/${project.sig ? project.sig.den : 4}`}
                    onChange={(e) => {
                      const [num, den] = e.target.value.split('/').map(Number);
                      dispatch({ type: 'patch', patch: { sig: { num, den } } });
                    }}
                  >
                    {['4/4', '3/4', '5/4', '6/8', '7/8', '12/8', '6/4', '2/4'].map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <button
                    type="button"
                    className={project.countIn ? `${s.btn} ${s.on}` : s.btn}
                    onClick={() => dispatch({ type: 'patch', patch: { countIn: ((project.countIn || 0) + 1) % 3 } })}
                  >{project.countIn ? `${project.countIn} bar in` : 'No count-in'}</button>
                </div>
                <div className={s.sheetRow}>
                  <Knob
                    size={34}
                    label="MASTER"
                    spec={{ min: 0, max: 1.4, def: 0.75 }}
                    value={project.master.vol}
                    onChange={(v, live) => dispatch({ type: 'master', patch: { vol: v }, live, id: 'mastervol' })}
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <div className={s.masterBox}>
        <div className={s.meter}><div className={s.meterFill} ref={meterL} /></div>
        <Knob
          size={30}
          label="MASTER"
          spec={{ min: 0, max: 1.4, def: 0.75 }}
          value={project.master.vol}
          onChange={(v, live) => dispatch({ type: 'master', patch: { vol: v }, live, id: 'mastervol' })}
        />
      </div>

      <input
        ref={midiRef}
        type="file"
        accept=".mid,.midi,audio/midi"
        className={s.hiddenFile}
        onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) importMidiFile(f); e.target.value = ''; }}
      />
      <input
        ref={stemRef}
        type="file"
        accept="audio/*"
        className={s.hiddenFile}
        onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) separateStemsFile(f); e.target.value = ''; }}
      />
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        className={s.hiddenFile}
        onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) openFile(f); e.target.value = ''; }}
      />
    </header>
  );
}
