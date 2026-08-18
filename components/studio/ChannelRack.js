import React, { useCallback, useMemo, useRef } from 'react';
import s from '../../styles/studio.module.css';
import { useStudio, useRaf } from '../../lib/studio/StudioContext';
import { STEP_TICKS, BAR_TICKS, clamp } from '../../lib/studio/constants';
import { patternSteps } from '../../lib/studio/sequencer';
import { INSTRUMENTS } from '../../lib/studio/audio/instruments';
import Knob from './Knob';

const STEP_W = 26;

function ChannelRow({ channel, pattern, steps, selected }) {
  const { dispatch, engine, setUi, project } = useStudio();
  const paint = useRef(null);
  const notes = (pattern.notes && pattern.notes[channel.id]) || [];

  const on = useMemo(() => {
    const set = new Map();
    for (const n of notes) {
      const idx = Math.floor(n.t / STEP_TICKS);
      if (!set.has(idx) || set.get(idx) < n.v) set.set(idx, n.v);
    }
    return set;
  }, [notes]);

  const toggle = useCallback((step, force) => {
    dispatch({ type: 'step.toggle', patternId: pattern.id, channelId: channel.id, step, force });
  }, [dispatch, pattern.id, channel.id]);

  const insert = project.inserts.find((i) => i.id === channel.insert);

  return (
    <div className={selected ? `${s.chanRow} ${s.chanSel}` : s.chanRow}>
      <div className={s.chanLeft}>
        <span className={s.chanColor} style={{ background: channel.color }} />
        <button
          type="button"
          className={s.led}
          title="Valj kanal / forhandslyssna"
          onClick={() => { dispatch({ type: 'select.channel', id: channel.id }); engine.preview(channel.id); }}
        >
          <span className={selected ? `${s.ledDot} ${s.ledOn}` : s.ledDot} />
        </button>
        <button
          type="button"
          className={s.chanName}
          onClick={() => { dispatch({ type: 'select.channel', id: channel.id }); setUi({ pluginOpen: true }); }}
          onDoubleClick={() => {
            const name = window.prompt('Kanalnamn', channel.name);
            if (name) dispatch({ type: 'channel.update', id: channel.id, patch: { name } });
          }}
          title={`${INSTRUMENTS[channel.inst] ? INSTRUMENTS[channel.inst].name : channel.inst} - klicka for instrumentpanelen`}
        >
          {channel.name}
        </button>
        <button
          type="button"
          className={channel.mute ? `${s.tinyBtn} ${s.muteOn}` : s.tinyBtn}
          onClick={() => dispatch({ type: 'channel.update', id: channel.id, patch: { mute: !channel.mute } })}
          title="Mute"
        >M</button>
        <button
          type="button"
          className={channel.solo ? `${s.tinyBtn} ${s.soloOn}` : s.tinyBtn}
          onClick={() => dispatch({ type: 'channel.update', id: channel.id, patch: { solo: !channel.solo } })}
          title="Solo"
        >S</button>
        <div className={s.miniKnobs}>
          <Knob
            size={22} label={null}
            spec={{ min: -1, max: 1, def: 0, label: 'Pan' }}
            value={channel.pan}
            onChange={(v, live) => dispatch({ type: 'channel.update', id: channel.id, patch: { pan: v }, live, key: 'pan' })}
          />
          <Knob
            size={22} label={null} color="#7ee787"
            spec={{ min: 0, max: 1.2, def: 0.8, label: 'Volym' }}
            value={channel.vol}
            onChange={(v, live) => dispatch({ type: 'channel.update', id: channel.id, patch: { vol: v }, live, key: 'vol' })}
          />
        </div>
        <button
          type="button"
          className={s.insBadge}
          title="Mixer-kanal"
          onClick={() => { if (insert) { dispatch({ type: 'select.insert', id: insert.id }); setUi({ view: 'mixer' }); } }}
        >
          {insert ? insert.name.replace('Insert ', 'INS ') : 'MASTER'}
        </button>
        <button
          type="button"
          className={s.xBtn}
          title="Ta bort kanal"
          onClick={() => dispatch({ type: 'channel.remove', id: channel.id })}
        >×</button>
      </div>

      <div
        className={s.stepRow}
        onPointerLeave={() => { paint.current = null; }}
        onPointerUp={() => { paint.current = null; }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {Array.from({ length: steps }, (_, i) => {
          const vel = on.get(i);
          const isOn = vel != null;
          const beat = i % 4 === 0;
          const bar = i % 16 === 0;
          return (
            <button
              key={i}
              type="button"
              className={[s.step, isOn ? s.stepOn : '', beat ? s.stepBeat : '', bar ? s.stepBar : ''].filter(Boolean).join(' ')}
              style={isOn ? { background: channel.color, opacity: 0.45 + vel * 0.55 } : undefined}
              onPointerDown={(e) => {
                e.preventDefault();
                const erase = e.button === 2 || isOn;
                paint.current = erase ? 'off' : 'on';
                toggle(i, erase ? 'off' : 'on');
                if (!erase) engine.preview(channel.id);
              }}
              onPointerEnter={() => {
                if (!paint.current) return;
                if (paint.current === 'on' && !isOn) toggle(i, 'on');
                if (paint.current === 'off' && isOn) toggle(i, 'off');
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function ChannelRack() {
  const { project, dispatch, engine, ui, setUi } = useStudio();
  const pattern = project.patterns.find((p) => p.id === project.activePattern) || project.patterns[0];
  const steps = patternSteps(pattern);
  const headRef = useRef(null);
  const spacerRef = useRef(null);

  useRaf(() => {
    const el = headRef.current;
    if (!el) return;
    if (!engine.playing || ui.mode !== 'pattern') { el.style.opacity = '0'; return; }
    const offset = spacerRef.current ? spacerRef.current.offsetWidth : 330;
    el.style.opacity = '1';
    el.style.height = `${20 + project.channels.length * 30}px`;
    const step = Math.floor(engine.currentPosition() / STEP_TICKS);
    el.style.transform = `translateX(${offset + step * STEP_W}px)`;
  });

  const setBars = (delta) => {
    const bars = clamp((pattern.bars || 1) + delta, 1, 16);
    dispatch({ type: 'pattern.update', id: pattern.id, patch: { bars } });
  };

  return (
    <div className={s.panel}>
      <div className={s.panelHead}>
        <span className={s.panelTitle}>Channel Rack</span>
        <span className={s.patName} style={{ borderColor: pattern.color }}>
          <select
            className={s.patSelect}
            value={pattern.id}
            onChange={(e) => dispatch({ type: 'pattern.select', id: e.target.value })}
          >
            {project.patterns.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </span>
        <div className={s.group}>
          <span className={s.dim}>Takter</span>
          <button type="button" className={s.btn} onClick={() => setBars(-1)}>−</button>
          <span className={s.numBox}>{pattern.bars}</span>
          <button type="button" className={s.btn} onClick={() => setBars(1)}>+</button>
        </div>
        <div className={s.group}>
          <Knob
            size={26} label="Swing"
            spec={{ min: 0, max: 0.7, def: 0 }}
            value={project.swing || 0}
            onChange={(v, live) => dispatch({ type: 'patch', patch: { swing: v }, live, id: 'swing' })}
          />
        </div>
        <div className={s.spacer} />
        <button
          type="button"
          className={s.btn}
          onClick={() => { setUi({ view: 'piano' }); }}
        >Piano Roll ▸</button>
        <button
          type="button"
          className={s.btn}
          onClick={() => dispatch({ type: 'pattern.clone', id: pattern.id })}
        >Duplicera</button>
      </div>

      <div className={s.rackBody}>
        <div className={s.rackScroll}>
          <div className={s.stepPlayhead} ref={headRef} style={{ width: STEP_W }} />
          <div className={s.rulerRow}>
            <div className={s.chanLeftSpacer} ref={spacerRef} />
            <div className={s.ruler} style={{ width: steps * STEP_W }}>
              {Array.from({ length: Math.ceil(steps / 4) }, (_, i) => (
                <div key={i} className={i % 4 === 0 ? `${s.rulerTick} ${s.rulerBar}` : s.rulerTick} style={{ width: STEP_W * 4 }}>
                  {i % 4 === 0 ? i / 4 + 1 : ''}
                </div>
              ))}
            </div>
          </div>

          {project.channels.map((ch) => (
            <ChannelRow
              key={ch.id}
              channel={ch}
              pattern={pattern}
              steps={steps}
              selected={ch.id === project.selectedChannel}
            />
          ))}
        </div>
      </div>

      <div className={s.rackFoot}>
        <span className={s.dim}>{project.channels.length} kanaler · {steps} steg · {(pattern.bars || 1) * BAR_TICKS} ticks</span>
        <div className={s.spacer} />
        <span className={s.dim}>Vansterklick = lagg till steg · Hogerklick = ta bort · dra for att mala</span>
      </div>
    </div>
  );
}
