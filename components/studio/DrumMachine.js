import React, { useCallback, useMemo, useRef, useState } from 'react';
import s from '../../styles/studio.module.css';
import { useStudio, useRaf } from '../../lib/studio/StudioContext';
import { STEP_TICKS, BAR_TICKS, clamp } from '../../lib/studio/constants';
import { patternSteps, patternTicks } from '../../lib/studio/sequencer';
import { INSTRUMENTS } from '../../lib/studio/audio/instruments';
import {
  KITS, PAD_ROWS, ROLES, roleInfo, padChannels, euclid, randomSteps,
  stepsToNotes, humanizeNotes, doubleNotes, rollNotes, notesInStep,
} from '../../lib/studio/drums';
import Knob from './Knob';

/** Instrument-specific knobs shown for the selected pad. */
const QUICK = {
  kick: ['tune', 'decay', 'punch', 'click', 'drive'],
  snare: ['tune', 'decay', 'tone', 'snap', 'drive'],
  clap: ['freq', 'decay', 'spread', 'width'],
  hat: ['tune', 'decay', 'hpf', 'metal'],
  tom: ['tune', 'decay', 'bend', 'noise'],
  perc: ['tune', 'decay', 'ratio', 'noise'],
};

function Pad({ channel, role, selected, onSelect }) {
  const { engine, dispatch } = useStudio();
  const ref = useRef(null);
  const info = roleInfo(role);

  useRaf(() => {
    if (!ref.current) return;
    const since = channel ? engine.sinceHit(channel.id) : Infinity;
    const lit = since < 0.13 ? 1 - since / 0.13 : 0;
    ref.current.style.setProperty('--lit', lit.toFixed(3));
  });

  if (!channel) {
    return (
      <div className={`${s.pad} ${s.padEmpty}`}>
        <span className={s.padName}>{info ? info.name : role}</span>
        <span className={s.padKey}>—</span>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={[s.pad, selected ? s.padSel : '', channel.mute ? s.padMuted : ''].filter(Boolean).join(' ')}
      style={{ '--pad': channel.color }}
      onPointerDown={(e) => {
        if (e.button === 2) return;
        onSelect(channel.id);
        engine.preview(channel.id, 60, 1);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        dispatch({ type: 'channel.update', id: channel.id, patch: { mute: !channel.mute } });
      }}
      title={`${channel.name} — klicka for att spela, hogerklicka for mute (${info ? info.key.toUpperCase() : ''})`}
    >
      <span className={s.padGlow} />
      <span className={s.padName}>{channel.name}</span>
      <span className={s.padKey}>{info ? info.key.toUpperCase() : ''}</span>
      {channel.choke > 0 && <span className={s.padChoke}>CH{channel.choke}</span>}
    </div>
  );
}

export default function DrumMachine() {
  const { project, dispatch, engine, ui, setUi, setHint } = useStudio();
  const pattern = project.patterns.find((p) => p.id === project.activePattern) || project.patterns[0];
  const steps = patternSteps(pattern);
  const byRole = useMemo(() => padChannels(project), [project]);
  const pads = PAD_ROWS.map((row) => row.map((role) => ({ role, channel: byRole.get(role) || null })));

  const [euclidHits, setEuclidHits] = useState(4);
  const cursorRef = useRef(null);
  const drag = useRef(null);

  const selectedId = ui.padChannel && project.channels.find((c) => c.id === ui.padChannel)
    ? ui.padChannel
    : (byRole.get('kick') || project.channels[0] || {}).id;
  const channel = project.channels.find((c) => c.id === selectedId) || null;
  const notes = (channel && pattern.notes && pattern.notes[channel.id]) || [];

  const selectPad = useCallback((id) => {
    setUi({ padChannel: id });
    dispatch({ type: 'select.channel', id });
  }, [dispatch, setUi]);

  useRaf(() => {
    const el = cursorRef.current;
    if (!el) return;
    if (!engine.playing || ui.mode !== 'pattern') { el.style.opacity = '0'; return; }
    el.style.opacity = '1';
    el.style.setProperty('--step', String(Math.floor(engine.currentPosition() / STEP_TICKS)));
  });

  const writeStep = (step, list) => dispatch({
    type: 'step.write', patternId: pattern.id, channelId: channel.id, step, notes: list,
  });

  const stepInfo = useCallback((i) => {
    const hits = notesInStep(notes, i);
    if (!hits.length) return null;
    return { count: hits.length, vel: Math.max(...hits.map((n) => (n.v == null ? 0.85 : n.v))) };
  }, [notes]);

  const onStepDown = (e, i) => {
    if (!channel) return;
    e.preventDefault();
    const cur = stepInfo(i);
    if (e.button === 2) {                       // right click cycles the roll
      const next = cur ? (cur.count % 4) + 1 : 2;
      writeStep(i, rollNotes(i, next, cur ? cur.vel : 0.9));
      engine.preview(channel.id, 60, cur ? cur.vel : 0.9);
      return;
    }
    if (cur) {
      if (e.shiftKey) {                          // shift = accent
        writeStep(i, rollNotes(i, cur.count, 1));
        engine.preview(channel.id, 60, 1);
      } else {
        writeStep(i, []);
      }
      drag.current = { mode: 'vel', step: i, y: e.clientY, vel: cur.vel, count: cur.count, moved: false };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }
    const vel = e.shiftKey ? 1 : 0.9;
    writeStep(i, rollNotes(i, 1, vel));
    engine.preview(channel.id, 60, vel);
    drag.current = { mode: 'vel', step: i, y: e.clientY, vel, count: 1, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onStepMove = (e) => {
    const d = drag.current;
    if (!d || d.mode !== 'vel') return;
    const dy = d.y - e.clientY;
    if (Math.abs(dy) < 4 && !d.moved) return;
    d.moved = true;
    const vel = clamp(d.vel + dy / 120, 0.1, 1);
    dispatch({
      type: 'step.write',
      patternId: pattern.id,
      channelId: channel.id,
      step: d.step,
      notes: rollNotes(d.step, d.count, vel),
      live: true,
      gesture: `padvel:${d.step}`,
    });
  };

  const endDrag = () => { drag.current = null; };

  /* ---------------------------------------------------------------- tools */

  const drumChannels = () => ROLES.map((r) => byRole.get(r.id)).filter(Boolean);

  const tool = (name) => {
    if (!channel) return;
    const patLen = patternTicks(pattern);
    if (name === 'clearPad') {
      dispatch({ type: 'notes.setMany', patternId: pattern.id, byChannel: { [channel.id]: [] } });
      setHint(`Rensade ${channel.name}.`);
      return;
    }
    if (name === 'clearAll') {
      const byChannel = {};
      drumChannels().forEach((ch) => { byChannel[ch.id] = []; });
      dispatch({ type: 'notes.setMany', patternId: pattern.id, byChannel });
      setHint('Rensade alla pads i monstret.');
      return;
    }
    if (name === 'random') {
      const byChannel = {};
      drumChannels().forEach((ch) => {
        byChannel[ch.id] = stepsToNotes(randomSteps(ch.role, steps));
      });
      dispatch({ type: 'notes.setMany', patternId: pattern.id, byChannel });
      setHint('Slumpade ett nytt beat.');
      return;
    }
    if (name === 'euclid') {
      const grid = euclid(steps, clamp(euclidHits, 1, steps));
      const list = [];
      grid.forEach((on, i) => { if (on) list.push({ step: i, vel: i % 4 === 0 ? 1 : 0.8 }); });
      dispatch({ type: 'notes.setMany', patternId: pattern.id, byChannel: { [channel.id]: stepsToNotes(list) } });
      setHint(`Euclid ${euclidHits}/${steps} pa ${channel.name}.`);
      return;
    }
    if (name === 'humanize') {
      const byChannel = {};
      drumChannels().forEach((ch) => {
        const list = (pattern.notes && pattern.notes[ch.id]) || [];
        if (list.length) byChannel[ch.id] = humanizeNotes(list);
      });
      dispatch({ type: 'notes.setMany', patternId: pattern.id, byChannel });
      setHint('Humaniserade timing och velocity.');
      return;
    }
    if (name === 'double') {
      const bars = clamp((pattern.bars || 1) * 2, 1, 16);
      const byChannel = {};
      drumChannels().forEach((ch) => {
        const list = (pattern.notes && pattern.notes[ch.id]) || [];
        if (list.length) byChannel[ch.id] = doubleNotes(list, patLen);
      });
      dispatch({ type: 'pattern.update', id: pattern.id, patch: { bars } });
      dispatch({ type: 'notes.setMany', patternId: pattern.id, byChannel });
      setHint(`Dubblade monstret till ${bars} takter.`);
    }
  };

  const inst = channel ? INSTRUMENTS[channel.inst] : null;
  const quickKeys = (inst && QUICK[inst.id]) || [];

  return (
    <div className={s.panel}>
      <div className={s.panelHead}>
        <span className={s.panelTitle}>Trummaskin</span>
        <select
          className={s.select}
          value={project.kit || 'tr808'}
          onChange={(e) => {
            dispatch({ type: 'kit.apply', kitId: e.target.value });
            const k = KITS.find((x) => x.id === e.target.value);
            setHint(`Kit "${k.name}" laddat — ${k.desc}`);
          }}
        >
          {KITS.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
        </select>
        <select
          className={s.select}
          value={pattern.id}
          onChange={(e) => dispatch({ type: 'pattern.select', id: e.target.value })}
        >
          {project.patterns.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div className={s.group}>
          <span className={s.dim}>Takter</span>
          <button
            type="button" className={s.btn}
            onClick={() => dispatch({ type: 'pattern.update', id: pattern.id, patch: { bars: clamp((pattern.bars || 1) - 1, 1, 16) } })}
          >−</button>
          <span className={s.numBox}>{pattern.bars}</span>
          <button
            type="button" className={s.btn}
            onClick={() => dispatch({ type: 'pattern.update', id: pattern.id, patch: { bars: clamp((pattern.bars || 1) + 1, 1, 16) } })}
          >+</button>
        </div>
        <Knob
          size={26} label="Swing"
          spec={{ min: 0, max: 0.7, def: 0 }}
          value={project.swing || 0}
          onChange={(v, live) => dispatch({ type: 'patch', patch: { swing: v }, live, id: 'swing' })}
        />
        <div className={s.spacer} />
        <span className={s.dim}>{KITS.find((k) => k.id === (project.kit || 'tr808')).desc}</span>
      </div>

      <div className={s.dmTools}>
        <span className={s.toolLabel}>Verktyg</span>
        <button type="button" className={s.btn} onClick={() => tool('random')} title="Slumpa fram ett helt nytt beat">Slumpa beat</button>
        <div className={s.group}>
          <button type="button" className={s.btn} onClick={() => tool('euclid')} title="Fordela traffarna jamnt over stegen">Euclid</button>
          <input
            className={s.numInput}
            type="number" min={1} max={steps}
            value={euclidHits}
            onChange={(e) => setEuclidHits(clamp(parseInt(e.target.value, 10) || 1, 1, steps))}
          />
          <span className={s.dim}>/ {steps}</span>
        </div>
        <button type="button" className={s.btn} onClick={() => tool('humanize')} title="Slumpa timing och velocity nagot">Humanisera</button>
        <button type="button" className={s.btn} onClick={() => tool('double')} title="Dubbla monsterlangden och kopiera beatet">Dubbla</button>
        <div className={s.spacer} />
        <button type="button" className={s.btn} onClick={() => tool('clearPad')}>Rensa pad</button>
        <button type="button" className={s.btn} onClick={() => tool('clearAll')}>Rensa alla</button>
      </div>

      <div className={s.dmBody}>
        <div className={s.padWrap}>
          <div className={s.padGrid}>
            {pads.map((row, ri) => row.map(({ role, channel: ch }) => (
              <Pad
                key={role + ri}
                role={role}
                channel={ch}
                selected={ch && ch.id === selectedId}
                onSelect={selectPad}
              />
            )))}
          </div>
          <div className={s.padHint}>
            Pads spelas med <b>Z X C V / A S D F / Q W E R</b> nar trummaskinen ar oppen.
            Hogerklick pa en pad = mute.
          </div>
        </div>

        <div className={s.dmMain}>
          <div className={s.dmLaneHead}>
            <span className={s.dmPadName} style={{ color: channel ? channel.color : undefined }}>
              {channel ? channel.name : 'Ingen pad'}
            </span>
            <span className={s.dim}>{inst ? inst.name : ''}</span>
            {channel && (
              <>
                <button
                  type="button"
                  className={channel.mute ? `${s.tinyBtn} ${s.muteOn}` : s.tinyBtn}
                  onClick={() => dispatch({ type: 'channel.update', id: channel.id, patch: { mute: !channel.mute } })}
                >M</button>
                <button
                  type="button"
                  className={channel.solo ? `${s.tinyBtn} ${s.soloOn}` : s.tinyBtn}
                  onClick={() => dispatch({ type: 'channel.update', id: channel.id, patch: { solo: !channel.solo } })}
                >S</button>
                <div className={s.group}>
                  <span className={s.dim}>Choke</span>
                  <select
                    className={s.select}
                    value={channel.choke || 0}
                    onChange={(e) => dispatch({ type: 'channel.update', id: channel.id, patch: { choke: Number(e.target.value) } })}
                  >
                    <option value={0}>Av</option>
                    <option value={1}>Grupp 1</option>
                    <option value={2}>Grupp 2</option>
                    <option value={3}>Grupp 3</option>
                  </select>
                </div>
              </>
            )}
            <div className={s.spacer} />
            <span className={s.dim}>{notes.length} traffar</span>
          </div>

          <div className={s.dmSteps} style={{ '--stepw': '38px' }}>
            {Array.from({ length: steps }, (_, i) => {
              const info = stepInfo(i);
              const beat = i % 4 === 0;
              const bar = i % 16 === 0;
              return (
                <button
                  key={i}
                  type="button"
                  className={[
                    s.bigStep, info ? s.bigStepOn : '', beat ? s.bigStepBeat : '', bar ? s.bigStepBar : '',
                  ].filter(Boolean).join(' ')}
                  style={info && channel ? { '--v': info.vel, '--pad': channel.color } : undefined}
                  onPointerDown={(e) => onStepDown(e, i)}
                  onPointerMove={onStepMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  onContextMenu={(e) => e.preventDefault()}
                  title={info ? `Steg ${i + 1} · velocity ${(info.vel * 100).toFixed(0)}% · ${info.count} traff(ar)` : `Steg ${i + 1}`}
                >
                  <span className={s.bigStepFill} />
                  <span className={s.bigStepNum}>{i + 1}</span>
                  {info && info.count > 1 && (
                    <span className={s.rollDots}>
                      {Array.from({ length: info.count }, (_, r) => <i key={r} />)}
                    </span>
                  )}
                </button>
              );
            })}
            <div className={s.stepCursor} ref={cursorRef} />
          </div>

          {channel && (
            <div className={s.dmKnobs}>
              <Knob
                label="Level" color="#7ee787"
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
              {quickKeys.map((key) => {
                const spec = inst.params[key];
                if (!spec) return null;
                const value = channel.params[key] == null ? spec.def : channel.params[key];
                return (
                  <Knob
                    key={key}
                    label={spec.label}
                    spec={spec}
                    color={channel.color}
                    value={value}
                    onChange={(v, live) => dispatch({ type: 'channel.param', id: channel.id, key, value: v, live })}
                  />
                );
              })}
              <button type="button" className={s.btn} onClick={() => setUi({ pluginOpen: true })}>Alla parametrar…</button>
            </div>
          )}

          <div className={s.dmOverview}>
            {ROLES.map((r) => {
              const ch = byRole.get(r.id);
              if (!ch) return null;
              const list = (pattern.notes && pattern.notes[ch.id]) || [];
              const set = new Set(list.map((n) => Math.floor(n.t / STEP_TICKS)));
              return (
                <div key={r.id} className={ch.id === selectedId ? `${s.ovRow} ${s.ovSel}` : s.ovRow}>
                  <button type="button" className={s.ovName} onClick={() => selectPad(ch.id)}>
                    <span className={s.swatch} style={{ background: ch.color }} />
                    {ch.name}
                  </button>
                  <div className={s.ovSteps}>
                    {Array.from({ length: steps }, (_, i) => (
                      <span
                        key={i}
                        className={[s.ovStep, set.has(i) ? s.ovOn : '', i % 4 === 0 ? s.ovBeat : ''].filter(Boolean).join(' ')}
                        style={set.has(i) ? { background: ch.color } : undefined}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={s.rackFoot}>
        <span className={s.dim}>
          Klick = traff · Shift+klick = accent · Dra upp/ner = velocity · Hogerklick = roll (2-4 traffar)
        </span>
        <div className={s.spacer} />
        <span className={s.dim}>{steps} steg · {(pattern.bars || 1) * BAR_TICKS} ticks</span>
      </div>
    </div>
  );
}
