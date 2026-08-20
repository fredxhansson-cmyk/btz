import React, { useCallback, useEffect, useRef } from 'react';
import s from '../../styles/studio.module.css';
import { accent, token } from '../../lib/studio/theme';
import { useStudio, useRaf } from '../../lib/studio/StudioContext';
import { clamp, gainToDb } from '../../lib/studio/constants';
import { EFFECT_LIST, EFFECTS, mergedFxParams } from '../../lib/studio/audio/effects';
import { MASTER_PRESETS, masterPreset, matchGain } from '../../lib/studio/mastering';
import Knob, { ParamGrid } from './Knob';

function Fader({ value, onChange, color = accent() }) {
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
  const selected = master ? project.selectedInsert === 'master' : project.selectedInsert === insert.id;

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
      onPointerDown={() => dispatch({ type: 'select.insert', id: master ? 'master' : insert.id })}
    >
      <div
        className={s.stripName}
        onDoubleClick={() => {
          if (master) return;
          const name = window.prompt('Mixer channel name', insert.name);
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
        <Fader value={vol} onChange={setVol} color={master ? accent() : token('--blue')} />
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

function Spectrum() {
  const { engine } = useStudio();
  const ref = useRef(null);
  const buf = useRef(new Uint8Array(512));
  useRaf(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = token('--meter-track');
    ctx.fillRect(0, 0, w, h);
    const ok = engine.spectrum(buf.current);
    const bins = buf.current.length;
    const bars = 64;
    for (let i = 0; i < bars; i++) {
      // logarithmic bin mapping so the low end is not squashed into one bar
      const lo = Math.floor(Math.pow(i / bars, 2) * bins);
      const hi = Math.max(lo + 1, Math.floor(Math.pow((i + 1) / bars, 2) * bins));
      let peak = 0;
      if (ok) for (let j = lo; j < hi && j < bins; j++) peak = Math.max(peak, buf.current[j]);
      const bh = (peak / 255) * (h - 6);
      const x = (i / bars) * w;
      const bw = w / bars - 1.5;
      const grad = peak > 220 ? '#ff5a5a' : peak > 160 ? '#ffd43b' : '#4dabf7';
      ctx.fillStyle = grad;
      ctx.fillRect(x, h - bh - 2, bw, bh);
    }
    ctx.fillStyle = token('--text-4');
    ctx.font = '9px ui-monospace, monospace';
    ctx.fillText('MASTER SPECTRUM', 6, 12);
  });
  return <canvas ref={ref} className={s.spectrum} />;
}

function Sends({ insert }) {
  const { project, dispatch } = useStudio();
  const others = project.inserts.filter((i) => i.id !== insert.id);
  const amountFor = (id) => {
    const sd = (insert.sends || []).find((x) => x.to === id);
    return sd ? sd.amount : 0;
  };
  return (
    <div className={s.sendBox}>
      <div className={s.sendHead}>Sends (post-fader)</div>
      <div className={s.sendGrid}>
        {others.map((i) => (
          <Knob
            key={i.id}
            size={28}
            label={i.name.replace('Insert ', 'INS ')}
            color="#b197fc"
            spec={{ min: 0, max: 1, def: 0 }}
            value={amountFor(i.id)}
            onChange={(v, live) => dispatch({
              type: 'send.set', insertId: insert.id, to: i.id, amount: v, live, key: `send${i.id}`,
            })}
          />
        ))}
        {!others.length && <span className={s.dim}>No other mixer channels.</span>}
      </div>
    </div>
  );
}

function Mastering() {
  const { project, dispatch, engine, setHint } = useStudio();
  const ref = useRef(null);
  const vals = useRef({ i: null, s: -70, m: -70, p: 0 });
  const target = project.master.target == null ? -14 : project.master.target;

  useRaf(() => {
    const l = engine.updateLoudness();
    vals.current = { i: l.integrated, s: l.short, m: l.momentary, p: l.peak };
    if (!ref.current) return;
    const fmt = (v) => (v == null || v < -60 ? '—' : v.toFixed(1));
    ref.current.textContent = `Integrated ${fmt(l.integrated)} LUFS · short ${fmt(l.short)} · momentary ${fmt(l.momentary)} · peak ${(20 * Math.log10(Math.max(1e-4, l.peak))).toFixed(1)} dB`;
  });

  return (
    <div className={s.masterBox2}>
      <div className={s.fxHead}>
        <span>Mastering</span>
        <div className={s.group}>
          <span className={s.dim}>Target</span>
          <select
            className={s.select}
            value={target}
            onChange={(e) => dispatch({ type: 'master', patch: { target: Number(e.target.value) } })}
          >
            {[-9, -11, -12, -14, -16, -18].map((t) => <option key={t} value={t}>{t} LUFS</option>)}
          </select>
        </div>
      </div>

      <div className={s.presetRow}>
        {MASTER_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={project.master.preset === p.id ? `${s.btn} ${s.on}` : s.btn}
            title={p.desc}
            onClick={() => {
              dispatch({ type: 'master.preset', presetId: p.id, chain: p.chain, target: p.target });
              engine.resetLoudness();
              setHint(`Mastering: ${p.name} — ${p.desc}`);
            }}
          >{p.name}</button>
        ))}
      </div>

      <div className={s.loudRow}>
        <span className={s.loudRead} ref={ref}>—</span>
        <div className={s.spacer} />
        <button type="button" className={s.btn} onClick={() => engine.resetLoudness()}>Reset measurement</button>
        <button
          type="button"
          className={s.btn}
          title="Adjusts the master volume so the measured level lands on the target"
          onClick={() => {
            const measured = vals.current.i;
            if (measured == null) { setHint('Play the track for a bit first so the meter has time to measure.'); return; }
            const next = matchGain(project.master.vol, measured, target);
            dispatch({ type: 'master', patch: { vol: next } });
            setHint(`Master volume adjusted to ${next.toFixed(2)} to hit ${target} LUFS.`);
          }}
        >Match target level</button>
      </div>
      <div className={s.helpBox}>
        Play the whole track once with the meter running — the integrated level is the one
        streaming services normalize against.
      </div>
    </div>
  );
}

export default function Mixer() {
  const { project, dispatch } = useStudio();
  const isMaster = project.selectedInsert === 'master';
  const insert = isMaster
    ? { id: 'master', name: 'Master', fx: project.master.chain || [] }
    : (project.inserts.find((i) => i.id === project.selectedInsert) || project.inserts[0]);

  const addFx = useCallback((type) => {
    if (!type) return;
    dispatch({ type: 'fx.add', insertId: insert.id, fxType: type });
  }, [dispatch, insert]);

  return (
    <div className={s.panel}>
      <div className={s.panelHead}>
        <span className={s.panelTitle}>Mixer</span>
        <span className={s.dim}>Selected: {insert ? insert.name : '—'}</span>
        <div className={s.spacer} />
        <button type="button" className={s.btn} onClick={() => dispatch({ type: 'insert.add' })}>+ Insert</button>
      </div>

      <Spectrum />

      <div className={s.mixerBody}>
        <div className={s.strips}>
          <Strip insert={{ id: 'master', name: 'MASTER' }} master />
          <div className={s.stripGap} />
          {project.inserts.map((ins) => <Strip key={ins.id} insert={ins} />)}
        </div>

        <div className={s.fxRack}>
          <div className={s.fxHead}>
            <span>Effect chain — {insert ? insert.name : ''}{isMaster ? ' (master bus)' : ''}</span>
            <select className={s.select} value="" onChange={(e) => { addFx(e.target.value); e.target.value = ''; }}>
              <option value="">+ Add effect</option>
              {EFFECT_LIST.map((fx) => <option key={fx.id} value={fx.id}>{fx.name}</option>)}
            </select>
          </div>
          <div className={s.fxList}>
            {isMaster && <Mastering />}
            {!isMaster && insert && <Sends insert={insert} />}
            {(insert.fx || []).length === 0 && (
              <div className={s.emptyFx}>No effects. Add reverb, delay, EQ or distortion above.</div>
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
