import React, { useEffect, useRef, useState } from 'react';
import s from '../../styles/studio.module.css';
import { useStudio, useRaf } from '../../lib/studio/StudioContext';
import { listAudioInputs } from '../../lib/studio/recording';
import Knob from './Knob';

/**
 * Multiple simultaneous live inputs — mic, turntable, line — each routed to its
 * own mixer channel (fader + FX). Independent of the record panel's single
 * input, so recording is unaffected. Inputs live in the engine, so they keep
 * running when you switch views or pop this panel out.
 */
export default function LiveInputsPanel() {
  const {
    engine, project, popOut, attach, detached, setHint,
  } = useStudio();
  const out = detached.includes('liveinputs');
  const [devices, setDevices] = useState([]);
  const [rows, setRows] = useState(() => (engine.liveInputs
    ? [...engine.liveInputs.values()].map((li) => ({
      id: li.id, deviceId: li.deviceId, route: li.route || 'master', gain: li.gain.gain.value,
    }))
    : []));
  const [error, setError] = useState('');
  const meters = useRef(new Map());

  useEffect(() => { listAudioInputs().then(setDevices); }, []);

  useRaf(() => {
    rows.forEach((r) => {
      const el = meters.current.get(r.id);
      if (!el) return;
      const lvl = engine.liveInputLevel(r.id);
      el.style.width = `${Math.min(100, lvl * 100)}%`;
      el.style.background = lvl > 0.97 ? '#f1383e' : lvl > 0.8 ? '#edb417' : '#85c425';
    });
  });

  const add = async () => {
    setError('');
    try {
      const id = await engine.addLiveInput(undefined, undefined, `Live ${rows.length + 1}`);
      setRows((rs) => [...rs, { id, deviceId: '', route: 'master', gain: 1 }]);
      setDevices(await listAudioInputs());
      setHint('Live input added — route it to a mixer channel to give it a fader and FX.');
    } catch (e) {
      setError(e.message || 'Could not open the input.');
    }
  };

  const remove = (id) => {
    engine.removeLiveInput(id);
    setRows((rs) => rs.filter((r) => r.id !== id));
  };

  const changeDevice = async (row, deviceId) => {
    setError('');
    try {
      engine.removeLiveInput(row.id);
      const id = await engine.addLiveInput(deviceId || undefined, row.route === 'master' ? undefined : row.route, `Live`);
      engine.setLiveInputGain(id, row.gain);
      setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, id, deviceId } : r)));
    } catch (e) {
      setError(e.message || 'Could not switch device.');
    }
  };

  const changeRoute = (row, route) => {
    engine.setLiveInputRoute(row.id, route === 'master' ? undefined : route);
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, route } : r)));
  };

  const changeGain = (row, v) => {
    engine.setLiveInputGain(row.id, v);
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, gain: v } : r)));
  };

  return (
    <div className={s.panel}>
      <div className={s.panelHead}>
        <span className={s.panelTitle}>Live inputs</span>
        <span className={s.dim}>mic · turntable · line — several at once, each to its own channel</span>
        <div className={s.spacer} />
        <button type="button" className={`${s.btn} ${s.on}`} onClick={add}>＋ Live input</button>
        <button
          type="button"
          className={s.btn}
          onClick={() => (out ? attach('liveinputs') : popOut('liveinputs'))}
          title="Open in its own window (second screen)"
        >⧉ {out ? 'Bring back' : 'Pop out'}</button>
      </div>

      <div className={s.liveBody}>
        {error && <div className={s.helpBox} style={{ color: 'var(--rec)' }}>{error}</div>}
        {!rows.length && (
          <div className={s.helpBox}>
            Press <b>＋ Live input</b> and allow the microphone / audio interface. Then pick
            the device (turntable / mic / line via your interface) and which mixer channel it
            feeds — it then gets its own fader, panning and FX in the mixer. Hear it by
            raising that channel's fader in the Mixer.
          </div>
        )}
        {rows.map((r) => (
          <div key={r.id} className={s.liveRow}>
            <select className={s.selectWide} value={r.deviceId} onChange={(e) => changeDevice(r, e.target.value)}>
              <option value="">Default input</option>
              {devices.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
            <select
              className={s.select}
              value={r.route}
              title="Route to a mixer channel (own fader + FX) or straight to master"
              onChange={(e) => changeRoute(r, e.target.value)}
            >
              <option value="master">→ Master</option>
              {project.inserts.map((i) => <option key={i.id} value={i.id}>→ {i.name}</option>)}
            </select>
            <Knob
              size={30} label="Gain" color="#85c425"
              spec={{ min: 0, max: 4, def: 1 }}
              value={r.gain}
              onChange={(v) => changeGain(r, v)}
            />
            <div className={s.liveMeter}><div ref={(el) => { if (el) meters.current.set(r.id, el); }} className={s.liveMeterFill} /></div>
            <button type="button" className={s.xBtn} title="Remove this input" onClick={() => remove(r.id)}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
}
