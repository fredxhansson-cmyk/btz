import React, { useRef } from 'react';
import s from '../../styles/studio.module.css';
import { useStudio } from '../../lib/studio/StudioContext';
import { INSTRUMENTS, INSTRUMENT_LIST, defaultParams, mergedParams } from '../../lib/studio/audio/instruments';
import Knob, { ParamGrid } from './Knob';

export default function PluginPanel() {
  const { project, dispatch, engine, setUi, setHint } = useStudio();
  const channel = project.channels.find((c) => c.id === project.selectedChannel);
  const fileRef = useRef(null);
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
        {inst && inst.needsSample && (
          <>
            <button type="button" className={s.btn} onClick={() => fileRef.current.click()}>Ladda sample…</button>
            <input
              ref={fileRef}
              type="file"
              accept="audio/*"
              className={s.hiddenFile}
              onChange={async (e) => {
                const f = e.target.files && e.target.files[0];
                if (!f) return;
                try {
                  await engine.loadSample(channel.id, f);
                  setHint(`Sample "${f.name}" laddad i ${channel.name}. (Sparas inte i projektfilen.)`);
                } catch (err) {
                  setHint('Kunde inte avkoda ljudfilen.');
                }
                e.target.value = '';
              }}
            />
          </>
        )}
      </div>

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
