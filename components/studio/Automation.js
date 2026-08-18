import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import s from '../../styles/studio.module.css';
import { useStudio, useRaf } from '../../lib/studio/StudioContext';
import { BAR_TICKS, PPQ, STEP_TICKS, snapTicks, SNAPS, clamp, COLORS } from '../../lib/studio/constants';
import { patternTicks } from '../../lib/studio/sequencer';
import { listTargets, valueAt, denorm, shapePoints, sortPoints } from '../../lib/studio/automation';
import { longPress } from '../../lib/studio/touch';

const HEAD_H = 22;
const PAD = 14;

export default function Automation() {
  const { project, dispatch, engine, ui, setUi, setHint, play } = useStudio();
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const drag = useRef(null);
  const [, bump] = useState(0);
  const [pick, setPick] = useState('');
  const press = useRef(null);
  if (!press.current) press.current = longPress();

  const pattern = project.patterns.find((p) => p.id === project.activePattern) || project.patterns[0];
  const lanes = pattern.automation || [];
  const targets = useMemo(() => listTargets(project), [project]);
  const groups = useMemo(() => targets.reduce((acc, t) => {
    (acc[t.group] = acc[t.group] || []).push(t);
    return acc;
  }, {}), [targets]);

  const selId = ui.autoLane && lanes.find((l) => l.id === ui.autoLane) ? ui.autoLane : (lanes[0] && lanes[0].id);
  const lane = lanes.find((l) => l.id === selId) || null;
  const meta = lane ? targets.find((t) => t.id === lane.target) : null;
  const len = patternTicks(pattern);

  const dataRef = useRef({});
  const barLen = project.barTicks || BAR_TICKS;
  dataRef.current = { lanes, lane, meta, len, ui, barLen };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = window.devicePixelRatio || 1;
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const d = dataRef.current;
    const plotH = h - HEAD_H - PAD * 2;
    const px = (t) => (t / Math.max(1, d.len)) * (w - PAD * 2) + PAD;
    const py = (v) => HEAD_H + PAD + (1 - clamp(v, 0, 1)) * plotH;

    ctx.fillStyle = '#1b1d22';
    ctx.fillRect(0, 0, w, h);

    // horizontal guides
    for (let i = 0; i <= 4; i++) {
      const y = HEAD_H + PAD + (plotH * i) / 4;
      ctx.fillStyle = i === 2 ? '#2b2f36' : '#212429';
      ctx.fillRect(PAD, Math.round(y), w - PAD * 2, 1);
    }
    // bars
    const bars = Math.max(1, Math.round(d.len / d.barLen));
    for (let b = 0; b <= bars; b++) {
      const x = px(b * d.barLen);
      ctx.fillStyle = '#0e1013';
      ctx.fillRect(Math.round(x), HEAD_H, 1, h - HEAD_H);
      for (let q = 1; q < 4; q++) {
        const qx = px(b * d.barLen + q * PPQ);
        if (qx > w - PAD) continue;
        ctx.fillStyle = '#1f2229';
        ctx.fillRect(Math.round(qx), HEAD_H, 1, h - HEAD_H);
      }
    }

    // other lanes, dimmed
    for (const l of d.lanes) {
      if (d.lane && l.id === d.lane.id) continue;
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const pts = sortPoints(l.points || []);
      pts.forEach((p, i) => (i ? ctx.lineTo(px(p.t), py(p.v)) : ctx.moveTo(px(p.t), py(p.v))));
      ctx.stroke();
    }

    if (d.lane) {
      const pts = sortPoints(d.lane.points || []);
      const color = d.lane.color || '#4dabf7';
      // filled curve
      ctx.beginPath();
      ctx.moveTo(px(0), py(valueAt(pts, 0)));
      for (let x = PAD; x <= w - PAD; x += 2) {
        const t = ((x - PAD) / (w - PAD * 2)) * d.len;
        ctx.lineTo(x, py(valueAt(pts, t)));
      }
      ctx.lineTo(w - PAD, h - PAD);
      ctx.lineTo(PAD, h - PAD);
      ctx.closePath();
      ctx.fillStyle = `${color}22`;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(px(0), py(valueAt(pts, 0)));
      for (let x = PAD; x <= w - PAD; x += 2) {
        const t = ((x - PAD) / (w - PAD * 2)) * d.len;
        ctx.lineTo(x, py(valueAt(pts, t)));
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.stroke();

      for (const p of pts) {
        ctx.beginPath();
        ctx.arc(px(p.t), py(p.v), 4.5, 0, Math.PI * 2);
        ctx.fillStyle = '#15171b';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // ruler
    ctx.fillStyle = '#15171b';
    ctx.fillRect(0, 0, w, HEAD_H);
    ctx.font = '10px ui-monospace, monospace';
    for (let b = 0; b <= bars; b++) {
      const x = px(b * d.barLen);
      ctx.fillStyle = '#4b5058';
      ctx.fillRect(Math.round(x), 0, 1, HEAD_H);
      ctx.fillStyle = '#8b929c';
      ctx.fillText(String(b + 1), x + 4, 14);
    }

    // playhead
    if (engine.playing) {
      const pos = engine.currentPosition() % Math.max(1, d.len);
      const x = px(pos);
      ctx.fillStyle = '#ff8a1f';
      ctx.fillRect(Math.round(x), 0, 1.5, h);
    }
  }, [engine]);

  useRaf(draw);
  useEffect(() => { draw(); }, [draw, project, ui]);

  const posFromEvent = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const plotH = h - HEAD_H - PAD * 2;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return {
      x, y,
      inHead: y < HEAD_H,
      t: clamp(((x - PAD) / (w - PAD * 2)) * len, 0, len),
      v: clamp(1 - (y - HEAD_H - PAD) / plotH, 0, 1),
    };
  };

  const commit = (points, gesture) => dispatch({
    type: 'auto.points', patternId: pattern.id, laneId: lane.id, points, live: !!gesture, gesture,
  });

  const onPointerDown = (e) => {
    if (!lane) return;
    const p = posFromEvent(e);
    canvasRef.current.setPointerCapture(e.pointerId);
    if (p.inHead) {
      play(ui.mode === 'song' ? 'song' : 'pattern', Math.max(0, Math.floor(p.t / barLen) * barLen));
      return;
    }
    const snap = snapTicks(ui.snap);
    const pts = sortPoints(lane.points || []);
    const rect = canvasRef.current.getBoundingClientRect();
    const px = (t) => (t / Math.max(1, len)) * (rect.width - PAD * 2) + PAD;
    const hit = pts.findIndex((q) => Math.abs(px(q.t) - p.x) < 8);

    if (e.button === 2) {
      if (hit >= 0 && pts.length > 1) commit(pts.filter((_, i) => i !== hit));
      return;
    }
    if (hit >= 0) {
      press.current.start(e, () => {
        if (pts.length > 1) commit(pts.filter((_, i) => i !== hit));
        drag.current = null;
      });
      drag.current = { mode: 'point', index: hit, snap };
      return;
    }
    const t = Math.round(p.t / snap) * snap;
    const next = sortPoints([...pts.filter((q) => q.t !== t), { t, v: p.v }]);
    commit(next);
    drag.current = { mode: 'point', index: next.findIndex((q) => q.t === t), snap };
  };

  const onPointerMove = (e) => {
    press.current.move(e);
    const d = drag.current;
    if (!d || !lane) return;
    const p = posFromEvent(e);
    const pts = sortPoints(lane.points || []);
    if (d.mode !== 'point' || !pts[d.index]) return;
    const t = Math.max(0, Math.round(p.t / d.snap) * d.snap);
    const next = pts.map((q, i) => (i === d.index ? { t, v: p.v } : q));
    commit(next, `autopt:${lane.id}:${d.index}`);
  };

  const onPointerUp = () => { press.current.cancel(); drag.current = null; bump((n) => n + 1); };

  const addLane = (targetId) => {
    if (!targetId) return;
    const t = targets.find((x) => x.id === targetId);
    if (!t) return;
    dispatch({
      type: 'auto.add',
      patternId: pattern.id,
      target: targetId,
      label: t.label,
      color: COLORS[(lanes.length * 3) % COLORS.length],
    });
    setHint(`Automation lane for ${t.label} added.`);
  };

  useEffect(() => {
    if (lane && ui.autoLane !== lane.id) setUi({ autoLane: lane.id });
  }, [lane, setUi, ui.autoLane]);

  const shape = (kind) => {
    if (!lane) return;
    const cycles = Math.max(1, Math.round(len / barLen));
    commit(shapePoints(kind, len, kind === 'up' || kind === 'down' ? 1 : cycles));
    setHint(`Filled the lane with ${kind}.`);
  };

  const current = lane && meta
    ? denorm(meta.spec, valueAt(sortPoints(lane.points || []), engine.playing ? engine.currentPosition() % Math.max(1, len) : 0))
    : null;

  return (
    <div className={s.panel}>
      <div className={s.panelHead}>
        <span className={s.panelTitle}>Automation</span>
        <select className={s.select} value={pattern.id} onChange={(e) => dispatch({ type: 'pattern.select', id: e.target.value })}>
          {project.patterns.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div className={s.group}>
          <span className={s.dim}>New lane</span>
          <select
            className={s.selectWide}
            value={pick}
            onChange={(e) => { addLane(e.target.value); setPick(''); }}
          >
            <option value="">Choose parameter…</option>
            {Object.entries(groups).map(([group, list]) => (
              <optgroup key={group} label={group}>
                {list.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
        <div className={s.group}>
          <span className={s.dim}>Snap</span>
          <select className={s.select} value={ui.snap} onChange={(e) => setUi({ snap: e.target.value })}>
            {SNAPS.map((sn) => <option key={sn.id} value={sn.id}>{sn.label}</option>)}
          </select>
        </div>
        <div className={s.spacer} />
        {meta && (
          <span className={s.dim}>
            {meta.label}: {current == null ? '—' : current.toFixed(2)}{meta.spec.unit ? ` ${meta.spec.unit}` : ''}
            {meta.perNote ? ' · applies from the next note' : ''}
          </span>
        )}
      </div>

      <div className={s.dmTools}>
        <span className={s.toolLabel}>Fill</span>
        <button type="button" className={s.btn} disabled={!lane} onClick={() => shape('up')}>Ramp up</button>
        <button type="button" className={s.btn} disabled={!lane} onClick={() => shape('down')}>Ramp down</button>
        <button type="button" className={s.btn} disabled={!lane} onClick={() => shape('sine')}>LFO sine</button>
        <button type="button" className={s.btn} disabled={!lane} onClick={() => shape('saw')}>LFO saw</button>
        <button type="button" className={s.btn} disabled={!lane} onClick={() => shape('square')}>LFO square</button>
        <button type="button" className={s.btn} disabled={!lane} onClick={() => shape('pump')}>Pump (sidechain)</button>
        <div className={s.spacer} />
        <button
          type="button" className={s.btn} disabled={!lane}
          onClick={() => commit([{ t: 0, v: 0.5 }])}
        >Reset lane</button>
      </div>

      <div className={s.autoBody}>
        <div className={s.laneList}>
          {lanes.length === 0 && <div className={s.emptyFx}>No automation in this pattern. Choose a parameter above.</div>}
          {lanes.map((l) => {
            const t = targets.find((x) => x.id === l.target);
            return (
              <div key={l.id} className={l.id === selId ? `${s.laneItem} ${s.sel}` : s.laneItem}>
                <button type="button" className={s.laneName} onClick={() => setUi({ autoLane: l.id })}>
                  <span className={s.swatch} style={{ background: l.color }} />
                  <span className={s.laneText}>{t ? t.label : l.label || 'Unknown parameter'}</span>
                </button>
                <span className={s.dim}>{(l.points || []).length}p</span>
                <button
                  type="button" className={s.xBtn}
                  onClick={() => dispatch({ type: 'auto.remove', patternId: pattern.id, laneId: l.id })}
                >×</button>
              </div>
            );
          })}
          {lanes.some((l) => !targets.find((x) => x.id === l.target)) && (
            <div className={s.warnBox}>A lane points to a parameter that no longer exists.</div>
          )}
        </div>

        <div className={s.canvasWrap} ref={wrapRef}>
          <canvas
            ref={canvasRef}
            className={s.canvas}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onContextMenu={(e) => e.preventDefault()}
          />
        </div>
      </div>

      <div className={s.rackFoot}>
        <span className={s.dim}>
          Click = new point · drag = move · right-click = delete · automation follows the pattern in both PAT and SONG
        </span>
      </div>
    </div>
  );
}
