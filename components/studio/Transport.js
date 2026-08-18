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
        onClick={() => setOpenId(open ? null : label)}
        onMouseEnter={() => openId && setOpenId(label)}
      >
        {label}
      </button>
      {open && (
        <div className={s.dropdown} onMouseLeave={() => setOpenId(null)}>
          {items.map((it, i) => (it.sep ? <div key={`s${i}`} className={s.dropSep} /> : (
            <button
              key={it.label}
              type="button"
              className={s.dropItem}
              disabled={it.disabled}
              onClick={() => { setOpenId(null); it.onClick(); }}
            >
              <span>{it.label}</span>
              {it.hint && <span className={s.dropHint}>{it.hint}</span>}
            </button>
          )))}
        </div>
      )}
    </div>
  );
}

export default function Transport({ onOpenRecord, onOpenAi }) {
  const {
    project, dispatch, engine, ui, setUi, play, stop, setMode,
    newProject, saveFile, openFile, exportWav, exportStems, exportMidiFile, importMidiFile,
    canUndo, canRedo, playing, busy,
  } = useStudio();
  const [openId, setOpenId] = useState(null);
  const [sheet, setSheet] = useState(false);
  const [editTempo, setEditTempo] = useState(null);
  const timeRef = useRef(null);
  const meterL = useRef(null);
  const fileRef = useRef(null);
  const midiRef = useRef(null);
  const tempoDrag = useRef(null);

  useRaf(() => {
    if (timeRef.current) {
      timeRef.current.textContent = ticksToBBT(
        engine.playing ? engine.currentPosition() : 0,
        project.barTicks,
        project.beatTicks,
      );
    }
    if (meterL.current) {
      const lvl = engine.masterLevel();
      meterL.current.style.transform = `scaleX(${Math.min(1, lvl)})`;
      meterL.current.style.background = lvl > 0.96 ? '#ff4d4d' : lvl > 0.75 ? '#ffd43b' : '#7ee787';
    }
  });

  const onTempoDown = useCallback((e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    tempoDrag.current = { y: e.clientY, bpm: project.bpm };
  }, [project.bpm]);

  const onTempoMove = useCallback((e) => {
    if (!tempoDrag.current) return;
    const delta = (tempoDrag.current.y - e.clientY) * (e.shiftKey ? 0.1 : 0.5);
    dispatch({ type: 'patch', patch: { bpm: clamp(Math.round((tempoDrag.current.bpm + delta) * 10) / 10, 20, 300) }, live: true, id: 'bpm' });
  }, [dispatch]);

  const fileItems = [
    { label: 'New empty project', onClick: () => newProject(false) },
    { label: 'Load demo project', onClick: () => newProject(true) },
    { sep: true },
    { label: 'Open .flow.json...', onClick: () => fileRef.current && fileRef.current.click() },
    { label: 'Save project', hint: 'Ctrl+S', onClick: saveFile },
    { sep: true },
    { label: 'Export pattern (WAV)', onClick: () => exportWav('pattern') },
    { label: 'Export full track (WAV)', onClick: () => exportWav('song') },
    { label: 'Export stems (WAV per mixer channel)', onClick: () => exportStems() },
    { sep: true },
    { label: 'Export MIDI', onClick: () => exportMidiFile() },
    { label: 'Import MIDI...', onClick: () => midiRef.current && midiRef.current.click() },
  ];

  const editItems = [
    { label: 'Undo', hint: 'Ctrl+Z', disabled: !canUndo, onClick: () => dispatch({ type: 'undo' }) },
    { label: 'Redo', hint: 'Ctrl+Y', disabled: !canRedo, onClick: () => dispatch({ type: 'redo' }) },
    { sep: true },
    { label: 'New pattern', onClick: () => dispatch({ type: 'pattern.add' }) },
    { label: 'Duplicate pattern', onClick: () => dispatch({ type: 'pattern.clone', id: project.activePattern }) },
    { label: 'Clear playlist', onClick: () => dispatch({ type: 'clip.clear' }) },
  ];

  useEffect(() => {
    const close = () => { setOpenId(null); setSheet(false); };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, []);

  return (
    <header className={s.header} onPointerDown={(e) => e.stopPropagation()}>
      <div className={s.brand}>
        <span className={s.brandMark}>▶</span>
        <span className={s.brandName}>FLOW<b>STUDIO</b></span>
      </div>

      <div className={s.menu}>
        <Menu label="File" items={fileItems} openId={openId} setOpenId={setOpenId} />
        <Menu label="Edit" items={editItems} openId={openId} setOpenId={setOpenId} />
      </div>

      <div className={s.sep} />

      <div className={s.transport}>
        <button
          type="button"
          className={playing ? `${s.tbtn} ${s.playOn}` : s.tbtn}
          onClick={() => (playing ? stop() : play())}
          title="Play / Stop (space)"
        >▶</button>
        <button type="button" className={s.tbtn} onClick={stop} title="Stop">■</button>
        <button
          type="button"
          className={ui.recording ? `${s.tbtn} ${s.recOn}` : s.tbtn}
          onClick={() => setUi({ recording: !ui.recording })}
          title="Record from keyboard (R)"
        >●</button>
        <button
          type="button"
          className={s.micBtn}
          onClick={() => onOpenRecord && onOpenRecord()}
          title="Record from microphone or instrument"
        >🎙</button>
      </div>

      <div className={s.modeSw}>
        <button type="button" className={ui.mode === 'pattern' ? `${s.seg} ${s.on}` : s.seg} onClick={() => setMode('pattern')}>PAT</button>
        <button type="button" className={ui.mode === 'song' ? `${s.seg} ${s.on}` : s.seg} onClick={() => setMode('song')}>SONG</button>
      </div>

      <div className={s.timeBox}>
        <div className={s.timeDisp} ref={timeRef}>001:1:00</div>
        <div className={s.timeLabel}>BAR:BEAT:TICK</div>
      </div>

      <div
        className={s.tempo}
        onPointerDown={onTempoDown}
        onPointerMove={onTempoMove}
        onPointerUp={() => { tempoDrag.current = null; }}
        onDoubleClick={() => setEditTempo(String(project.bpm))}
        title="Drag to change tempo, double-click to type"
      >
        {editTempo === null ? (
          <div className={s.tempoVal}>{project.bpm.toFixed(1)}</div>
        ) : (
          <input
            className={s.tempoInput}
            autoFocus
            value={editTempo}
            onChange={(e) => setEditTempo(e.target.value)}
            onBlur={() => {
              const v = parseFloat(editTempo);
              if (!Number.isNaN(v)) dispatch({ type: 'patch', patch: { bpm: clamp(v, 20, 300) } });
              setEditTempo(null);
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          />
        )}
        <div className={s.timeLabel}>TEMPO</div>
      </div>

      <button
        type="button"
        className={`${ui.metronome ? `${s.btn} ${s.on}` : s.btn} ${s.deskOnly}`}
        onClick={() => setUi({ metronome: !ui.metronome })}
        title="Metronome"
      >MET</button>

      <div className={`${s.group} ${s.deskOnly}`}>
        <select
          className={s.select}
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
          className={project.countIn ? `${s.btn} ${s.on}` : s.btn}
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
                  FLOW Brain (AI)…
                </button>
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
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        className={s.hiddenFile}
        onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) openFile(f); e.target.value = ''; }}
      />
    </header>
  );
}
