import React, { useCallback, useEffect, useRef, useState } from 'react';
import s from '../../styles/studio.module.css';
import { useStudio, useRaf } from '../../lib/studio/StudioContext';
import { BAR_TICKS, PPQ, snapTicks, SNAPS, clamp } from '../../lib/studio/constants';
import { patternTicks, songLength } from '../../lib/studio/sequencer';

const LABEL_W = 96;
const HEAD_H = 22;
const TRACK_H = 34;
const TRACKS = 10;

export default function Playlist() {
  const { project, dispatch, engine, ui, setUi, play } = useStudio();
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const view = useRef({ scrollX: 0, pxPerTick: 0.11 });
  const drag = useRef(null);
  const [, bump] = useState(0);

  const dataRef = useRef({});
  dataRef.current = { project, ui };

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
    const v = view.current;
    const d = dataRef.current;

    ctx.fillStyle = '#1b1d22';
    ctx.fillRect(0, 0, w, h);

    const startTick = v.scrollX / v.pxPerTick;
    const endTick = startTick + (w - LABEL_W) / v.pxPerTick;

    // track lanes
    for (let t = 0; t < TRACKS; t++) {
      const y = HEAD_H + t * TRACK_H;
      if (y > h) break;
      ctx.fillStyle = t % 2 ? '#212429' : '#24272d';
      ctx.fillRect(LABEL_W, y, w - LABEL_W, TRACK_H - 1);
    }

    // bar grid
    for (let bar = Math.floor(startTick / BAR_TICKS); bar * BAR_TICKS <= endTick; bar++) {
      const x = LABEL_W + bar * BAR_TICKS * v.pxPerTick - v.scrollX;
      if (x < LABEL_W) continue;
      const strong = bar % 4 === 0;
      ctx.fillStyle = strong ? '#0e1013' : '#191b20';
      ctx.fillRect(Math.round(x), HEAD_H, strong ? 2 : 1, TRACKS * TRACK_H);
      if (v.pxPerTick * BAR_TICKS > 26) {
        for (let b = 1; b < 4; b++) {
          const bx = x + b * PPQ * v.pxPerTick;
          ctx.fillStyle = '#1f2229';
          ctx.fillRect(Math.round(bx), HEAD_H, 1, TRACKS * TRACK_H);
        }
      }
    }

    // clips
    for (const clip of d.project.playlist) {
      const pat = d.project.patterns.find((p) => p.id === clip.patternId);
      if (!pat) continue;
      const x = LABEL_W + clip.start * v.pxPerTick - v.scrollX;
      const cw = Math.max(4, clip.length * v.pxPerTick);
      const y = HEAD_H + clip.track * TRACK_H;
      if (x + cw < LABEL_W || x > w) continue;
      const selected = drag.current && drag.current.id === clip.id;
      ctx.fillStyle = pat.color;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(Math.max(LABEL_W, x), y + 2, x < LABEL_W ? cw - (LABEL_W - x) : cw, TRACK_H - 5);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = selected ? '#fff' : 'rgba(0,0,0,0.6)';
      ctx.strokeRect(Math.max(LABEL_W, x) + 0.5, y + 2.5, Math.max(2, (x < LABEL_W ? cw - (LABEL_W - x) : cw) - 1), TRACK_H - 6);

      // repeat separators
      const plen = patternTicks(pat);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      for (let off = plen; off < clip.length; off += plen) {
        const rx = x + off * v.pxPerTick;
        if (rx < LABEL_W || rx > w) continue;
        ctx.beginPath();
        ctx.moveTo(Math.round(rx) + 0.5, y + 3);
        ctx.lineTo(Math.round(rx) + 0.5, y + TRACK_H - 4);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.font = '10px system-ui, sans-serif';
      ctx.save();
      ctx.beginPath();
      ctx.rect(Math.max(LABEL_W, x), y, cw, TRACK_H);
      ctx.clip();
      ctx.fillText(pat.name, Math.max(LABEL_W, x) + 5, y + 15);
      ctx.restore();
    }

    // header
    ctx.fillStyle = '#15171b';
    ctx.fillRect(0, 0, w, HEAD_H);
    ctx.font = '10px ui-monospace, monospace';
    for (let bar = Math.floor(startTick / BAR_TICKS); bar * BAR_TICKS <= endTick; bar++) {
      const x = LABEL_W + bar * BAR_TICKS * v.pxPerTick - v.scrollX;
      if (x < LABEL_W - 10) continue;
      const strong = bar % 4 === 0;
      ctx.fillStyle = strong ? '#6b727c' : '#3a3f47';
      ctx.fillRect(Math.round(x), strong ? 0 : 12, 1, HEAD_H);
      if (strong) {
        ctx.fillStyle = '#9aa1ab';
        ctx.fillText(String(bar + 1), x + 4, 13);
      }
    }

    // track labels
    ctx.fillStyle = '#1a1c20';
    ctx.fillRect(0, HEAD_H, LABEL_W, h - HEAD_H);
    ctx.fillStyle = '#0e1013';
    ctx.fillRect(LABEL_W - 1, 0, 1, h);
    ctx.font = '11px system-ui, sans-serif';
    for (let t = 0; t < TRACKS; t++) {
      const y = HEAD_H + t * TRACK_H;
      ctx.fillStyle = '#7d848e';
      ctx.fillText(`Track ${t + 1}`, 10, y + 21);
    }

    // playhead
    if (engine.playing && d.ui.mode === 'song') {
      const x = LABEL_W + engine.currentPosition() * v.pxPerTick - v.scrollX;
      if (x >= LABEL_W && x < w) {
        ctx.fillStyle = '#ff8a1f';
        ctx.fillRect(Math.round(x), 0, 1.5, h);
      }
    }
  }, [engine]);

  useRaf(draw);
  useEffect(() => { draw(); }, [draw, project]);

  const posFromEvent = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const v = view.current;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return {
      x, y,
      inHead: y < HEAD_H,
      inLabels: x < LABEL_W,
      tick: (x - LABEL_W + v.scrollX) / v.pxPerTick,
      track: Math.floor((y - HEAD_H) / TRACK_H),
    };
  };

  const clipAt = (tick, track) => dataRef.current.project.playlist.find(
    (c) => c.track === track && tick >= c.start && tick <= c.start + c.length,
  ) || null;

  const onPointerDown = useCallback((e) => {
    const p = posFromEvent(e);
    const v = view.current;
    canvasRef.current.setPointerCapture(e.pointerId);
    const snap = Math.max(snapTicks(ui.snap), PPQ);

    if (p.inHead) {
      const tick = Math.max(0, Math.floor(p.tick / BAR_TICKS) * BAR_TICKS);
      play('song', tick);
      return;
    }
    if (p.inLabels || p.track < 0 || p.track >= TRACKS) return;

    const hit = clipAt(p.tick, p.track);
    if (e.button === 2) {
      if (hit) dispatch({ type: 'clip.remove', id: hit.id });
      drag.current = { mode: 'erase' };
      return;
    }
    if (hit) {
      const rightEdge = LABEL_W + (hit.start + hit.length) * v.pxPerTick - v.scrollX;
      if (Math.abs(p.x - rightEdge) < 8) {
        drag.current = { mode: 'resize', id: hit.id, snap };
      } else {
        drag.current = { mode: 'move', id: hit.id, snap, offset: p.tick - hit.start, track: p.track };
      }
      dispatch({ type: 'pattern.select', id: hit.patternId });
      bump((n) => n + 1);
      return;
    }
    const start = Math.max(0, Math.round(p.tick / BAR_TICKS) * BAR_TICKS);
    dispatch({ type: 'clip.add', patternId: project.activePattern, track: p.track, start });
    drag.current = { mode: 'none' };
    bump((n) => n + 1);
  }, [dispatch, play, project.activePattern, ui.snap]); // eslint-disable-line react-hooks/exhaustive-deps

  const onPointerMove = useCallback((e) => {
    const dr = drag.current;
    if (!dr || dr.mode === 'none') return;
    const p = posFromEvent(e);
    if (dr.mode === 'erase') {
      const hit = clipAt(p.tick, p.track);
      if (hit) dispatch({ type: 'clip.remove', id: hit.id });
      return;
    }
    const clip = dataRef.current.project.playlist.find((c) => c.id === dr.id);
    if (!clip) return;
    if (dr.mode === 'move') {
      const start = Math.max(0, Math.round((p.tick - dr.offset) / dr.snap) * dr.snap);
      const track = clamp(p.track, 0, TRACKS - 1);
      if (start !== clip.start || track !== clip.track) {
        dispatch({ type: 'clip.update', id: clip.id, patch: { start, track }, live: true, key: 'move' });
      }
      return;
    }
    if (dr.mode === 'resize') {
      const pat = dataRef.current.project.patterns.find((x) => x.id === clip.patternId);
      const unit = pat ? patternTicks(pat) : BAR_TICKS;
      const length = Math.max(unit, Math.round((p.tick - clip.start) / unit) * unit);
      if (length !== clip.length) {
        dispatch({ type: 'clip.update', id: clip.id, patch: { length }, live: true, key: 'len' });
      }
    }
  }, [dispatch]);

  const onPointerUp = useCallback(() => { drag.current = null; bump((n) => n + 1); }, []);

  const onWheel = useCallback((e) => {
    const v = view.current;
    if (e.ctrlKey || e.metaKey) v.pxPerTick = clamp(v.pxPerTick * (e.deltaY < 0 ? 1.15 : 0.87), 0.02, 1.2);
    else v.scrollX = Math.max(0, v.scrollX + e.deltaY);
    draw();
  }, [draw]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const handler = (ev) => { ev.preventDefault(); onWheel(ev); };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [onWheel]);

  const bars = Math.ceil(songLength(project) / BAR_TICKS);

  return (
    <div className={s.panel}>
      <div className={s.panelHead}>
        <span className={s.panelTitle}>Playlist</span>
        <span className={s.dim}>Placerar:</span>
        <select
          className={s.select}
          value={project.activePattern}
          onChange={(e) => dispatch({ type: 'pattern.select', id: e.target.value })}
        >
          {project.patterns.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div className={s.group}>
          <span className={s.dim}>Snap</span>
          <select className={s.select} value={ui.snap} onChange={(e) => setUi({ snap: e.target.value })}>
            {SNAPS.map((sn) => <option key={sn.id} value={sn.id}>{sn.label}</option>)}
          </select>
        </div>
        <button type="button" className={s.btn} onClick={() => { view.current.pxPerTick = clamp(view.current.pxPerTick * 1.25, 0.02, 1.2); draw(); }}>+</button>
        <button type="button" className={s.btn} onClick={() => { view.current.pxPerTick = clamp(view.current.pxPerTick * 0.8, 0.02, 1.2); draw(); }}>−</button>
        <button type="button" className={s.btn} onClick={() => play('song')}>Spela laten</button>
        <div className={s.spacer} />
        <span className={s.dim}>{project.playlist.length} klipp · {bars} takter</span>
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
  );
}
