import React, { useCallback, useEffect, useRef, useState } from 'react';
import s from '../../styles/studio.module.css';
import { useStudio } from '../../lib/studio/StudioContext';
import { clamp } from '../../lib/studio/constants';
import { INSTRUMENTS, INSTRUMENT_LIST, defaultParams, mergedParams } from '../../lib/studio/audio/instruments';
import { saveUserSound } from '../../lib/studio/library';
import { uid } from '../../lib/studio/constants';
import Knob, { ParamGrid } from './Knob';

function Waveform({ channel }) {
  const { engine, dispatch, project, loadSampleFile, setHint } = useStudio();
  const ref = useRef(null);
  const fileRef = useRef(null);
  const drag = useRef(null);
  const [over, setOver] = useState(false);
  const [, bump] = useState(0);
  const sample = channel.sampleId ? (project.samples || {})[channel.sampleId] : null;
  const decoded = channel.sampleId ? engine.buffers[channel.sampleId] : null;
  const start = channel.params.start == null ? 0 : channel.params.start;
  const end = channel.params.end == null ? 1 : channel.params.end;

  useEffect(() => engine.subscribe(() => bump((n) => n + 1)), [engine]);

  const draw = useCallback(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    if (canvas.width !== Math.floor(w * dpr)) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = over ? '#232a24' : '#15171b';
    ctx.fillRect(0, 0, w, h);
    if (!decoded) {
      ctx.fillStyle = '#6d747e';
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillText(sample ? 'Avkodar…' : 'Dra en ljudfil hit eller klicka pa "Ladda sample"', 10, h / 2);
      return;
    }
    const pk = decoded.peaks;
    const mid = h / 2;
    for (let i = 0; i < pk.length; i++) {
      const x = (i / pk.length) * w;
      const bh = pk[i] * (h / 2 - 4);
      const inside = i / pk.length >= Math.min(start, end) && i / pk.length <= Math.max(start, end);
      ctx.fillStyle = inside ? channel.color : '#3a3f47';
      ctx.fillRect(x, mid - bh, Math.max(1, w / pk.length - 0.5), bh * 2);
    }
    [start, end].forEach((m, i) => {
      const x = clamp(m, 0, 1) * w;
      ctx.fillStyle = i === 0 ? '#7ee787' : '#ff5a5a';
      ctx.fillRect(x - 1, 0, 2, h);
    });
    ctx.fillStyle = '#8d949e';
    ctx.font = '9px ui-monospace, monospace';
    ctx.fillText(`${sample ? sample.name : ''} · ${decoded.fwd.duration.toFixed(2)}s`, 8, 12);
  }, [channel.color, decoded, end, over, sample, start]);

  useEffect(() => { draw(); }, [draw]);

  const onDown = (e) => {
    if (!decoded) return;
    const rect = ref.current.getBoundingClientRect();
    const x = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    const which = Math.abs(x - start) < Math.abs(x - end) ? 'start' : 'end';
    drag.current = which;
    e.currentTarget.setPointerCapture(e.pointerId);
    dispatch({ type: 'channel.param', id: channel.id, key: which, value: x, live: true });
  };
  const onMove = (e) => {
    if (!drag.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    dispatch({ type: 'channel.param', id: channel.id, key: drag.current, value: x, live: true });
  };

  return (
    <div className={s.waveBox}>
      <canvas
        ref={ref}
        className={s.wave}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={() => { drag.current = null; }}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOver(false);
          const f = e.dataTransfer.files && e.dataTransfer.files[0];
          if (f) loadSampleFile(f, channel.id);
        }}
      />
      <div className={s.waveBtns}>
        <button type="button" className={s.btn} onClick={() => fileRef.current.click()}>Ladda sample…</button>
        {channel.sampleId && (
          <button
            type="button"
            className={s.btn}
            onClick={() => { dispatch({ type: 'sample.remove', sampleId: channel.sampleId }); setHint('Sample borttagen.'); }}
          >Ta bort</button>
        )}
        <span className={s.dim}>Dra i grona/roda markorerna for start och slut</span>
        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          className={s.hiddenFile}
          onChange={(e) => {
            const f = e.target.files && e.target.files[0];
            if (f) loadSampleFile(f, channel.id);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}

export default function PluginPanel() {
  const { project, dispatch, engine, ui, setUi, setHint } = useStudio();
  const channel = project.channels.find((c) => c.id === project.selectedChannel);
  if (!channel) return null;
  const inst = INSTRUMENTS[channel.inst];

  return (
    <div className={s.plugin}>
      <div className={s.pluginHead} style={{ background: `linear-gradient(90deg, ${channel.color}33, transparent)` }}>
        <span className={s.pluginDot} style={{ background: channel.color }} />
        <span className={s.pluginTitle}>{channel.name}</span>
        <span className={s.dim}>{inst ? inst.name : channel.inst}</span>
        <div className={s.spacer} />
        <button type="button" className={s.xBtn} onClick={() => setUi({ pluginOpen: false })}>×</button>
      </div>

      <div className={s.pluginRow}>
        <select
          className={s.select}
          value={channel.inst}
          onChange={(e) => dispatch({
            type: 'channel.update',
            id: channel.id,
            patch: { inst: e.target.value, params: defaultParams(e.target.value) },
          })}
        >
          {INSTRUMENT_LIST.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
        <select
          className={s.select}
          value={channel.insert || ''}
          onChange={(e) => dispatch({ type: 'channel.update', id: channel.id, patch: { insert: e.target.value || null } })}
        >
          <option value="">Master</option>
          {project.inserts.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
        <button type="button" className={s.btn} onClick={() => engine.preview(channel.id)}>Testa</button>
        <button type="button" className={s.btn} onClick={() => dispatch({ type: 'channel.clone', id: channel.id })}>Klona</button>
        <button
          type="button"
          className={s.btn}
          title="Spara instrumentets installningar i biblioteket under Mina ljud"
          onClick={() => {
            const name = window.prompt('Namn pa ljudet', channel.name);
            if (!name) return;
            saveUserSound({
              id: uid('us'),
              name,
              cat: inst ? inst.cat : 'Mina',
              inst: channel.inst,
              params: { ...mergedParams(channel) },
              kind: inst && inst.cat === 'Drums' ? 'drum' : 'inst',
              tags: ['eget'],
            });
            setUi({ soundsVersion: (ui.soundsVersion || 0) + 1 });
            setHint(`"${name}" sparat i biblioteket under Mina ljud.`);
          }}
        >Spara ljud</button>

      </div>

      {inst && inst.needsSample && <Waveform channel={channel} />}

      <div className={s.pluginBody}>
        <div className={s.pluginMix}>
          <Knob
            label="Volym" color="#7ee787"
            spec={{ min: 0, max: 1.2, def: 0.8 }}
            value={channel.vol}
            onChange={(v, live) => dispatch({ type: 'channel.update', id: channel.id, patch: { vol: v }, live, key: 'vol' })}
          />
          <Knob
            label="Pan"
            spec={{ min: -1, max: 1, def: 0 }}
            value={channel.pan}
            onChange={(v, live) => dispatch({ type: 'channel.update', id: channel.id, patch: { pan: v }, live, key: 'pan' })}
          />
        </div>
        {inst && (
          <ParamGrid
            params={inst.params}
            values={mergedParams(channel)}
            color={channel.color}
            onChange={(key, value, live) => dispatch({ type: 'channel.param', id: channel.id, key, value, live })}
          />
        )}
      </div>
    </div>
  );
}
