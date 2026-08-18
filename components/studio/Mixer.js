import React, { useCallback, useRef } from 'react';
import s from '../../styles/studio.module.css';
import { useStudio, useRaf } from '../../lib/studio/StudioContext';
import { clamp, gainToDb } from '../../lib/studio/constants';
import { EFFECT_LIST, EFFECTS, mergedFxParams } from '../../lib/studio/audio/effects';
import Knob, { ParamGrid } from './Knob';

function Fader({ value, onChange, color = '#ff8a1f' }) {
  const drag = useRef(null);
  const onDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { y: e.clientY, v: value };
  };
  const onMove = (e) => {
    if (!drag.current) return;
    const speed = e.shiftKey ? 600 : 180;
    onChange(clamp(drag.current.v + (drag.current.y - e.clientY) / speed * 1.5, 0, 1.5), true);
  };
  const end = () => { drag.current = null; };
  const pct = clamp(value / 1.5, 0, 1);
  return (
    <div
      className={s.fader}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={end}
      onPointerCancel={end}
      onDoubleClick={() => onChange(0.8, false)}
      title={`${gainToDb(value).toFixed(1)} dB`}
    >
      <div className={s.faderTrack} />
      <div className={s.faderFill} style={{ height: `${pct * 100}%`, background: color }} />
      <div className={s.faderCap} style={{ bottom: `calc(${pct * 100}% - 6px)` }} />
    </div>
  );
}

function Strip({ insert, master }) {
  const { project, dispatch, engine } = useStudio();
  const meterRef = useRef(null);
  const selected = !master && project.selectedInsert === insert.id;

  useRaf(() => {
    if (!meterRef.current) return;
    const lvl = master ? engine.masterLevel() : engine.insertLevel(insert.id);
    meterRef.current.style.height = `${Math.min(100, lvl * 100)}%`;
    meterRef.current.style.background = lvl > 0.96 ? '#ff4d4d' : lvl > 0.75 ? '#ffd43b' : '#7ee787';
  });

  const vol = master ? project.master.vol : insert.vol;
  const setVol = (v, live) => (master
    ? dispatch({ type: 'master', patch: { vol: v }, live, id: 'mastervol' })
    : dispatch({ type: 'insert.update', id: insert.id, patch: { vol: v }, live, key: 'vol' }));

  const routed = master ? [] : project.channels.filter((c) => c.insert === insert.id);

  return (
    <div
      className={[s.strip, selected ? s.stripSel : '', master ? s.stripMaster : ''].filter(Boolean).join(' ')}
      onPointerDown={() => !master && dispatch({ type: 'select.insert', id: insert.id })}
    >
      <div
        className={s.stripName}
        onDoubleClick={() => {
          if (master) return;
          const name = window.prompt('Namn pa mixerkanal', insert.name);
          if (name) dispatch({ type: 'insert.update', id: insert.id, patch: { name } });
        }}
      >
        {master ? 'MASTER' : insert.name}
      </div>
      <Knob
        size={26} label={null}
        spec={{ min: -1, max: 1, def: 0, label: 'Pan' }}
        value={master ? 0 : insert.pan}
        onChange={(v, live) => !master && dispatch({ type: 'insert.update', id: insert.id, patch: { pan: v }, live, key: 'pan' })}
      />
      <div className={s.stripBody}>
        <Fader value={vol} onChange={setVol} color={master ? '#ff8a1f' : '#4dabf7'} />
        <div className={s.vMeter}><div className={s.vMeterFill} ref={meterRef} /></div>
      </div>
      <div className={s.stripBtns}>
        {!master && (
          <>
            <button
              type="button"
              className={insert.mute ? `${s.tinyBtn} ${s.muteOn}` : s.tinyBtn}
              onClick={() => dispatch({ type: 'insert.update', id: insert.id, patch: { mute: !insert.mute } })}
            >M</button>
            <button
              type="button"
              className={insert.solo ? `${s.tinyBtn} ${s.soloOn}` : s.tinyBtn}
              onClick={() => dispatch({ type: 'insert.update', id: insert.id, patch: { solo: !insert.solo } })}
            >S</button>
          </>
        )}
      </div>
      <div className={s.stripRoute}>
        {master ? `${project.inserts.length} inserts` : routed.map((c) => c.name).join(', ') || '—'}
      </div>
      {!master && (insert.fx || []).length > 0 && (
        <div className={s.stripFx}>{insert.fx.length} FX</div>
      )}
    </div>
  );
}

export default function Mixer() {
  const { project, dispatch } = useStudio();
  const insert = project.inserts.find((i) => i.id === project.selectedInsert) || project.inserts[0];

  const addFx = useCallback((type) => {
    if (!type) return;
    dispatch({ type: 'fx.add', insertId: insert.id, fxType: type });
  }, [dispatch, insert]);

  return (
    <div className={s.panel}>
      <div className={s.panelHead}>
        <span className={s.panelTitle}>Mixer</span>
        <span className={s.dim}>Vald: {insert ? insert.name : '—'}</span>
        <div className={s.spacer} />
        <button type="button" className={s.btn} onClick={() => dispatch({ type: 'insert.add' })}>+ Insert</button>
      </div>

      <div className={s.mixerBody}>
        <div className={s.strips}>
          <Strip insert={{ id: 'master', name: 'MASTER' }} master />
          <div className={s.stripGap} />
          {project.inserts.map((ins) => <Strip key={ins.id} insert={ins} />)}
        </div>

        <div className={s.fxRack}>
          <div className={s.fxHead}>
            <span>Effektkedja — {insert ? insert.name : ''}</span>
            <select className={s.select} value="" onChange={(e) => { addFx(e.target.value); e.target.value = ''; }}>
              <option value="">+ Lagg till effekt</option>
              {EFFECT_LIST.map((fx) => <option key={fx.id} value={fx.id}>{fx.name}</option>)}
            </select>
          </div>
          <div className={s.fxList}>
            {(insert.fx || []).length === 0 && (
              <div className={s.emptyFx}>Inga effekter. Lagg till reverb, delay, EQ eller distortion ovan.</div>
            )}
            {(insert.fx || []).map((slot) => {
              const def = EFFECTS[slot.type];
              if (!def) return null;
              return (
                <div key={slot.id} className={s.fxSlot}>
                  <div className={s.fxSlotHead}>
                    <button
                      type="button"
                      className={slot.on === false ? s.tinyBtn : `${s.tinyBtn} ${s.fxOn}`}
                      onClick={() => dispatch({ type: 'fx.update', insertId: insert.id, fxId: slot.id, patch: { on: slot.on === false } })}
                      title="Bypass"
                    >⏻</button>
                    <span className={s.fxName}>{def.name}</span>
                    <div className={s.spacer} />
                    <button
                      type="button"
                      className={s.xBtn}
                      onClick={() => dispatch({ type: 'fx.remove', insertId: insert.id, fxId: slot.id })}
                    >×</button>
                  </div>
                  <ParamGrid
                    params={def.params}
                    values={mergedFxParams(slot)}
                    color="#4dabf7"
                    onChange={(key, value, live) => dispatch({
                      type: 'fx.param', insertId: insert.id, fxId: slot.id, key, value, live,
                    })}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
