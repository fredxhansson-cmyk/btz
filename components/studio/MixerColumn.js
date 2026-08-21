import React, { useRef } from 'react';
import s from '../../styles/studio.module.css';
import { useStudio, useRaf } from '../../lib/studio/StudioContext';
import { clamp } from '../../lib/studio/constants';

// Compact, always-on mixer + mastering column for the desktop shell — the
// right-hand panel from the FLOW Studio redesign. Live meters + quick M/S;
// deep editing (fx, pan drag, mastering) lives in the full Mixer view, opened
// via "Mastering →".

function panLabel(p) {
  if (!p) return 'C';
  const v = Math.round(Math.abs(p) * 50);
  return p < 0 ? `L${v}` : `R${v}`;
}

function Strip({ insert }) {
  const { project, dispatch, engine } = useStudio();
  const aRef = useRef(null);
  const bRef = useRef(null);
  const zoneRef = useRef(null);
  const dragging = useRef(false);
  const color = (project.channels.find((c) => c.insert === insert.id) || {}).color || 'var(--accent)';

  useRaf(() => {
    const lvl = engine.insertLevel ? engine.insertLevel(insert.id) : 0;
    if (aRef.current) aRef.current.style.height = `${Math.min(100, lvl * 100)}%`;
    if (bRef.current) bRef.current.style.height = `${Math.min(100, lvl * 92)}%`;
  });

  const faderPct = Math.max(0, Math.min(100, (insert.vol / 1.4) * 100));

  // Drag anywhere in the vertical meter/fader zone to set this channel's volume.
  const setVolFromEvent = (e) => {
    const el = zoneRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const frac = clamp(1 - (e.clientY - r.top) / r.height, 0, 1);
    dispatch({ type: 'insert.update', id: insert.id, patch: { vol: frac * 1.4 }, live: true, key: 'vol' });
  };
  const onFaderDown = (e) => {
    e.stopPropagation();
    dispatch({ type: 'select.insert', id: insert.id });
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
    setVolFromEvent(e);
  };
  const onFaderMove = (e) => { if (dragging.current) setVolFromEvent(e); };
  const onFaderUp = (e) => { dragging.current = false; try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ } };

  return (
    <div
      className={s.mcStrip}
      onPointerDown={() => dispatch({ type: 'select.insert', id: insert.id })}
      title={`${insert.name} — drag the fader to set level; opens in Mixer for full control`}
    >
      <div className={s.mcPan} style={{ borderColor: color }}>{panLabel(insert.pan)}</div>
      <div
        className={s.mcMeters}
        ref={zoneRef}
        onPointerDown={onFaderDown}
        onPointerMove={onFaderMove}
        onPointerUp={onFaderUp}
        title={`Volume ${Math.round(faderPct)}% — drag to change`}
      >
        <div className={s.mcMeter}><div ref={aRef} className={s.mcMeterFill} style={{ background: `linear-gradient(0deg, ${color}, #FFB000)` }} /></div>
        <div className={s.mcMeter}><div ref={bRef} className={s.mcMeterFill} style={{ background: `linear-gradient(0deg, ${color}, #FFB000)` }} /></div>
        <div className={s.mcFader}><div className={s.mcFaderKnob} style={{ bottom: `${faderPct}%` }} /></div>
      </div>
      <div className={s.mcMS}>
        <button
          type="button"
          className={insert.mute ? `${s.mcTiny} ${s.mcMute}` : s.mcTiny}
          onPointerDown={(e) => { e.stopPropagation(); dispatch({ type: 'insert.update', id: insert.id, patch: { mute: !insert.mute } }); }}
        >M</button>
        <button
          type="button"
          className={insert.solo ? `${s.mcTiny} ${s.mcSolo}` : s.mcTiny}
          onPointerDown={(e) => { e.stopPropagation(); dispatch({ type: 'insert.update', id: insert.id, patch: { solo: !insert.solo } }); }}
        >S</button>
      </div>
      <span className={s.mcName}>{insert.name}</span>
    </div>
  );
}

export default function MixerColumn() {
  const { project, setUi } = useStudio();
  const inserts = (project.inserts || []).slice(0, 8);
  const chain = project.master && project.master.chain ? project.master.chain : [];
  const target = project.master && project.master.target != null ? project.master.target : -14;
  const rows = chain.length
    ? chain.slice(0, 4).map((fx) => ({ name: (fx.type || 'fx').replace(/^\w/, (c) => c.toUpperCase()), val: fx.on === false ? 'off' : 'on' }))
    : [{ name: `Clean master`, val: `${target} LUFS` }];

  return (
    <aside className={s.mixCol}>
      <div className={s.mcHead}>
        <span className={s.mcTitle}>Mixer</span>
        <button type="button" className={s.mcLink} onClick={() => setUi({ view: 'mixer' })}>Mastering →</button>
      </div>
      <div className={s.mcStrips}>
        {inserts.map((ins) => <Strip key={ins.id} insert={ins} />)}
      </div>
      <div className={s.mcMaster}>
        <span className={s.mcTitle}>Mastering chain</span>
        {rows.map((r, i) => (
          <div key={i} className={s.mcRow}>
            <span className={s.mcDot} />
            <span className={s.mcRowName}>{r.name}</span>
            <span className={s.mcRowVal}>{r.val}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
