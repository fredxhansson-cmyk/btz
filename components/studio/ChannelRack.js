import React, { useCallback, useMemo, useRef } from 'react';
import s from '../../styles/studio.module.css';
import { useStudio, useRaf } from '../../lib/studio/StudioContext';
import { STEP_TICKS, BAR_TICKS, clamp, keyName } from '../../lib/studio/constants';
import { patternSteps } from '../../lib/studio/sequencer';
import { INSTRUMENTS } from '../../lib/studio/audio/instruments';
import Knob from './Knob';

const STEP_W = 26;

function ChannelRow({ channel, pattern, steps, selected }) {
  const { dispatch, engine, setUi, project } = useStudio();
  const paint = useRef(null);
  const drag = useRef(null);
  const notes = (pattern.notes && pattern.notes[channel.id]) || [];

  const on = useMemo(() => {
    const set = new Map();
    for (const n of notes) {
      const idx = Math.floor(n.t / STEP_TICKS);
      const cur = set.get(idx);
      if (!cur || cur.v < n.v) set.set(idx, { v: n.v, k: n.k });
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
          title="Select channel / preview"
          onClick={() => { dispatch({ type: 'select.channel', id: channel.id }); engine.preview(channel.id); }}
        >
          <span className={selected ? `${s.ledDot} ${s.ledOn}` : s.ledDot} />
        </button>
        <button
          type="button"
          className={s.chanName}
          onClick={() => { dispatch({ type: 'select.channel', id: channel.id }); setUi({ pluginOpen: true }); }}
          onDoubleClick={() => {
            const name = window.prompt('Channel name', channel.name);
            if (name) dispatch({ type: 'channel.update', id: channel.id, patch: { name } });
          }}
          title={`${INSTRUMENTS[channel.inst] ? INSTRUMENTS[channel.inst].name : channel.inst} - click for the instrument panel`}
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
            spec={{ min: 0, max: 1.2, def: 0.8, label: 'Volume' }}
            value={channel.vol}
            onChange={(v, live) => dispatch({ type: 'channel.update', id: channel.id, patch: { vol: v }, live, key: 'vol' })}
          />
        </div>
        <button
          type="button"
          className={s.insBadge}
          title="Mixer channel"
          onClick={() => { if (insert) { dispatch({ type: 'select.insert', id: insert.id }); setUi({ view: 'mixer' }); } }}
        >
          {insert ? insert.name.replace('Insert ', 'INS ') : 'MASTER'}
        </button>
        <button
          type="button"
          className={s.xBtn}
          title="Remove channel"
          onClick={() => dispatch({ type: 'channel.remove', id: channel.id })}
        >×</button>
      </div>

      <div
        className={s.stepRow}
        onPointerLeave={() => { paint.current = null; drag.current = null; }}
        onPointerUp={() => {
          const d = drag.current;
          if (d) { if (d.mode === 'click') toggle(d.step, 'off'); drag.current = null; }
          paint.current = null;
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          const dy = d.startY - e.clientY;
          if (d.mode === 'click' && Math.abs(dy) > 3) d.mode = 'pitch';
          if (d.mode === 'pitch') {
            const key = clamp(d.baseKey + Math.round(dy / 7), 0, 127);
            if (key !== d.lastKey) {
              d.lastKey = key;
              dispatch({ type: 'step.pitch', patternId: pattern.id, channelId: channel.id, step: d.step, key, live: true });
              engine.preview(channel.id, key, 0.9);
            }
          }
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {Array.from({ length: steps }, (_, i) => {
          const cell = on.get(i);
          const isOn = cell != null;
          const beat = i % 4 === 0;
          const bar = i % 16 === 0;
          return (
            <button
              key={i}
              type="button"
              className={[s.step, isOn ? s.stepOn : '', beat ? s.stepBeat : '', bar ? s.stepBar : ''].filter(Boolean).join(' ')}
              style={isOn ? { background: channel.color, opacity: 0.45 + cell.v * 0.55 } : undefined}
              title={isOn ? `${keyName(cell.k)} — drag up/down to change note` : undefined}
              onPointerDown={(e) => {
                e.preventDefault();
                if (e.button === 2) { paint.current = 'off'; toggle(i, 'off'); return; }
                if (isOn) {
                  // start a pitch drag; a plain click (no vertical move) removes the step
                  drag.current = { step: i, startY: e.clientY, baseKey: cell.k, lastKey: cell.k, mode: 'click' };
                  return;
                }
                paint.current = 'on';
                toggle(i, 'on');
                engine.preview(channel.id);
              }}
              onPointerEnter={() => {
                if (!paint.current) return;
                if (paint.current === 'on' && !isOn) toggle(i, 'on');
                if (paint.current === 'off' && isOn) toggle(i, 'off');
              }}
            >
              {isOn && <span className={s.stepNote}>{keyName(cell.k)}</span>}
            </button>
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
        <span className={s.panelTitle}>Instruments</span>
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
          <span className={s.dim}>Bars</span>
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
        >Duplicate</button>
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
        <span className={s.dim}>{project.channels.length} channels · {steps} steps · {(pattern.bars || 1) * BAR_TICKS} ticks</span>
        <div className={s.spacer} />
        <span className={s.dim}>
          {ui.touch
            ? 'Tap = add/remove · drag a lit step up/down = pitch'
            : 'Click = add · right-click = remove · drag a lit step up/down = pitch'}
        </span>
      </div>
    </div>
  );
}
