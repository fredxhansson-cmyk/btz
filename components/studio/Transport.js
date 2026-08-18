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

export default function Transport() {
  const {
    project, dispatch, engine, ui, setUi, play, stop, setMode,
    newProject, saveFile, openFile, exportWav, exportStems, exportMidiFile, importMidiFile,
    canUndo, canRedo, playing, busy,
  } = useStudio();
  const [openId, setOpenId] = useState(null);
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
    { label: 'Nytt tomt projekt', onClick: () => newProject(false) },
    { label: 'Ladda demo-projekt', onClick: () => newProject(true) },
    { sep: true },
    { label: 'Oppna .flow.json...', onClick: () => fileRef.current && fileRef.current.click() },
    { label: 'Spara projekt', hint: 'Ctrl+S', onClick: saveFile },
    { sep: true },
    { label: 'Exportera monster (WAV)', onClick: () => exportWav('pattern') },
    { label: 'Exportera hela laten (WAV)', onClick: () => exportWav('song') },
    { label: 'Exportera stems (WAV per mixerkanal)', onClick: () => exportStems() },
    { sep: true },
    { label: 'Exportera MIDI', onClick: () => exportMidiFile() },
    { label: 'Importera MIDI...', onClick: () => midiRef.current && midiRef.current.click() },
  ];

  const editItems = [
    { label: 'Angra', hint: 'Ctrl+Z', disabled: !canUndo, onClick: () => dispatch({ type: 'undo' }) },
    { label: 'Gor om', hint: 'Ctrl+Y', disabled: !canRedo, onClick: () => dispatch({ type: 'redo' }) },
    { sep: true },
    { label: 'Nytt monster', onClick: () => dispatch({ type: 'pattern.add' }) },
    { label: 'Duplicera monster', onClick: () => dispatch({ type: 'pattern.clone', id: project.activePattern }) },
    { label: 'Rensa playlist', onClick: () => dispatch({ type: 'clip.clear' }) },
  ];

  useEffect(() => {
    const close = () => setOpenId(null);
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
        <Menu label="Fil" items={fileItems} openId={openId} setOpenId={setOpenId} />
        <Menu label="Redigera" items={editItems} openId={openId} setOpenId={setOpenId} />
      </div>

      <div className={s.sep} />

      <div className={s.transport}>
        <button
          type="button"
          className={playing ? `${s.tbtn} ${s.playOn}` : s.tbtn}
          onClick={() => (playing ? stop() : play())}
          title="Play / Stop (mellanslag)"
        >▶</button>
        <button type="button" className={s.tbtn} onClick={stop} title="Stopp">■</button>
        <button
          type="button"
          className={ui.recording ? `${s.tbtn} ${s.recOn}` : s.tbtn}
          onClick={() => setUi({ recording: !ui.recording })}
          title="Spela in fran tangentbordet (R)"
        >●</button>
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
        title="Dra for att andra tempo, dubbelklicka for att skriva"
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
        className={ui.metronome ? `${s.btn} ${s.on}` : s.btn}
        onClick={() => setUi({ metronome: !ui.metronome })}
        title="Metronom"
      >MET</button>

      <div className={s.group}>
        <select
          className={s.select}
          value={`${project.sig ? project.sig.num : 4}/${project.sig ? project.sig.den : 4}`}
          onChange={(e) => {
            const [num, den] = e.target.value.split('/').map(Number);
            dispatch({ type: 'patch', patch: { sig: { num, den } } });
          }}
          title="Taktart"
        >
          {['4/4', '3/4', '5/4', '6/8', '7/8', '12/8', '6/4', '2/4'].map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <button
          type="button"
          className={project.countIn ? `${s.btn} ${s.on}` : s.btn}
          onClick={() => dispatch({ type: 'patch', patch: { countIn: ((project.countIn || 0) + 1) % 3 } })}
          title="Inraknings-takter fore inspelning"
        >{project.countIn ? `${project.countIn} takt${project.countIn > 1 ? 'er' : ''} in` : 'Ingen inrakning'}</button>
      </div>

      <div className={s.spacer} />

      {busy && <span className={s.busy}>{busy}</span>}

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
