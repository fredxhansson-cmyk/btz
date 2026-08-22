import React, { useCallback, useEffect, useRef, useState } from 'react';
import s from '../../styles/studio.module.css';
import { accent, accentA, token } from '../../lib/studio/theme';
import { useStudio, useRaf } from '../../lib/studio/StudioContext';
import { BAR_TICKS, PPQ, snapTicks, SNAPS, clamp } from '../../lib/studio/constants';
import { patternTicks, songLength } from '../../lib/studio/sequencer';
import { longPress, pinchZoom } from '../../lib/studio/touch';

const LABEL_W = 96;
const HEAD_H = 22;
const TRACK_H = 34;
const DEFAULT_TRACKS = 10;
const MAX_TRACKS = 32;
const MIN_TRACKS = 1;
const MSW = 17;
const MSH = 16;
const M_X = LABEL_W - 2 * MSW - 7;
const S_X = LABEL_W - MSW - 4;

export default function Playlist() {
  const { project, dispatch, engine, ui, setUi, play } = useStudio();
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const view = useRef({ scrollX: 0, pxPerTick: 0.11 });
  const drag = useRef(null);
  const clipboard = useRef(null);
  const selClip = useRef(null);
  const loupeRef = useRef(null);
  const loupe = useRef({ active: false, x: 0, y: 0 });
  const [, bump] = useState(0);
  const gesture = useRef(null);
  const press = useRef(null);
  if (!press.current) press.current = longPress();

  const dataRef = useRef({});
  const barLen = project.barTicks || BAR_TICKS;
  const trackCount = clamp(project.arrangeTracks || DEFAULT_TRACKS, MIN_TRACKS, MAX_TRACKS);
  dataRef.current = { project, ui, barLen, tracks: trackCount };

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
    const TRACKS = d.tracks || DEFAULT_TRACKS;
    const tMute = d.project.trackMute || {};
    const tSolo = d.project.trackSolo || {};
    const anySolo = Object.values(tSolo).some(Boolean);
    const trackMuted = (t) => tMute[t] || (anySolo && !tSolo[t]);

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

    // loop region
    if (d.project.loopEnd > d.project.loopStart) {
      const lx = LABEL_W + d.project.loopStart * v.pxPerTick - v.scrollX;
      const lw = (d.project.loopEnd - d.project.loopStart) * v.pxPerTick;
      ctx.fillStyle = d.project.loop === false ? 'rgba(255,255,255,0.04)' : accentA(0.09);
      ctx.fillRect(Math.max(LABEL_W, lx), HEAD_H, Math.max(0, lw - Math.max(0, LABEL_W - lx)), TRACKS * TRACK_H);
    }

    // bar grid
    for (let bar = Math.floor(startTick / d.barLen); bar * d.barLen <= endTick; bar++) {
      const x = LABEL_W + bar * d.barLen * v.pxPerTick - v.scrollX;
      if (x < LABEL_W) continue;
      const strong = bar % 4 === 0;
      ctx.fillStyle = strong ? '#0e1013' : '#191b20';
      ctx.fillRect(Math.round(x), HEAD_H, strong ? 2 : 1, TRACKS * TRACK_H);
      if (v.pxPerTick * d.barLen > 26) {
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
      ctx.globalAlpha = trackMuted(clip.track) ? 0.25 : 0.85;
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
    for (let bar = Math.floor(startTick / d.barLen); bar * d.barLen <= endTick; bar++) {
      const x = LABEL_W + bar * d.barLen * v.pxPerTick - v.scrollX;
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
    for (let t = 0; t < TRACKS; t++) {
      const y = HEAD_H + t * TRACK_H;
      const by = y + (TRACK_H - MSH) / 2;
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillStyle = token('--text-4');
      ctx.fillText((d.project.trackNames && d.project.trackNames[t]) || `Tr ${t + 1}`, 8, y + 21);
      const muted = !!tMute[t];
      const soloed = !!tSolo[t];
      ctx.font = '10px system-ui, sans-serif';
      ctx.fillStyle = muted ? token('--rec') : token('--surface');
      ctx.fillRect(M_X, by, MSW, MSH);
      ctx.fillStyle = muted ? '#ffffff' : token('--text-4');
      ctx.fillText('M', M_X + 4, by + 11);
      ctx.fillStyle = soloed ? accent() : token('--surface');
      ctx.fillRect(S_X, by, MSW, MSH);
      ctx.fillStyle = soloed ? token('--accent-ink') : token('--text-4');
      ctx.fillText('S', S_X + 5, by + 11);
    }

    // loop handles in the ruler
    if (d.project.loopEnd > d.project.loopStart) {
      const lx = LABEL_W + d.project.loopStart * v.pxPerTick - v.scrollX;
      const rx = LABEL_W + d.project.loopEnd * v.pxPerTick - v.scrollX;
      ctx.fillStyle = d.project.loop === false ? '#5a616b' : accent();
      if (lx >= LABEL_W) ctx.fillRect(Math.round(lx), 0, 2, HEAD_H);
      if (rx >= LABEL_W && rx < w) ctx.fillRect(Math.round(rx) - 2, 0, 2, HEAD_H);
      if (lx < w && rx > LABEL_W) {
        ctx.fillRect(Math.max(LABEL_W, lx), HEAD_H - 3, Math.min(w, rx) - Math.max(LABEL_W, lx), 3);
      }
    }

    // markers
    for (const mk of (d.project.markers || [])) {
      const mx = LABEL_W + mk.tick * v.pxPerTick - v.scrollX;
      if (mx < LABEL_W || mx > w) continue;
      ctx.fillStyle = accent();
      ctx.fillRect(Math.round(mx), 0, 2, h);
      ctx.fillRect(Math.round(mx), 0, 40, 11);
      ctx.fillStyle = token('--accent-ink');
      ctx.font = '9px system-ui, sans-serif';
      ctx.save();
      ctx.beginPath();
      ctx.rect(mx, 0, 40, 11);
      ctx.clip();
      ctx.fillText(mk.name, mx + 3, 9);
      ctx.restore();
    }

    // tempo changes
    for (const tm of (d.project.tempoMap || [])) {
      const tx = LABEL_W + tm.tick * v.pxPerTick - v.scrollX;
      if (tx < LABEL_W || tx > w) continue;
      ctx.fillStyle = token('--warn');
      ctx.fillRect(Math.round(tx), 11, 2, h - 11);
      ctx.fillRect(Math.round(tx), 11, 48, 11);
      ctx.fillStyle = '#1a1a16';
      ctx.font = '9px system-ui, sans-serif';
      ctx.save();
      ctx.beginPath();
      ctx.rect(tx, 11, 48, 11);
      ctx.clip();
      ctx.fillText(`${tm.bpm} bpm`, tx + 3, 20);
      ctx.restore();
    }

    // playhead
    if (engine.playing && d.ui.mode === 'song') {
      const x = LABEL_W + engine.currentPosition() * v.pxPerTick - v.scrollX;
      if (x >= LABEL_W && x < w) {
        ctx.fillStyle = accent();
        ctx.fillRect(Math.round(x), 0, 1.5, h);
      }
    }

    // magnifier loupe (touch) — see under the finger while moving/stretching clips
    const lp = loupe.current;
    const loupeEl = loupeRef.current;
    if (loupeEl) {
      if (lp.active) {
        const LW = 128; const LH = 128; const ZOOM = 2.6;
        if (loupeEl.width !== Math.floor(LW * dpr)) {
          loupeEl.width = Math.floor(LW * dpr);
          loupeEl.height = Math.floor(LH * dpr);
          loupeEl.style.width = `${LW}px`;
          loupeEl.style.height = `${LH}px`;
        }
        const lctx = loupeEl.getContext('2d');
        lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        lctx.imageSmoothingEnabled = false;
        const srcW = LW / ZOOM; const srcH = LH / ZOOM;
        const sx = clamp(lp.x - srcW / 2, 0, Math.max(0, w - srcW));
        const sy = clamp(lp.y - srcH / 2, 0, Math.max(0, h - srcH));
        lctx.clearRect(0, 0, LW, LH);
        lctx.drawImage(canvas, sx * dpr, sy * dpr, srcW * dpr, srcH * dpr, 0, 0, LW, LH);
        lctx.strokeStyle = accentA(0.9);
        lctx.lineWidth = 1;
        lctx.beginPath();
        lctx.moveTo(LW / 2, LH / 2 - 8); lctx.lineTo(LW / 2, LH / 2 + 8);
        lctx.moveTo(LW / 2 - 8, LH / 2); lctx.lineTo(LW / 2 + 8, LH / 2);
        lctx.stroke();
        const px = clamp(lp.x - LW / 2, 4, Math.max(4, w - LW - 4));
        let py = lp.y - LH - 26;
        if (py < 4) py = Math.min(h - LH - 4, lp.y + 26);
        loupeEl.style.transform = `translate(${px}px, ${py}px)`;
        loupeEl.style.display = 'block';
      } else if (loupeEl.style.display !== 'none') {
        loupeEl.style.display = 'none';
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
    if (!gesture.current) gesture.current = pinchZoom(view, draw, { min: 0.02, max: 1.2 });
    if (gesture.current.down(e)) { drag.current = null; press.current.cancel(); loupe.current.active = false; return; }
    const p = posFromEvent(e);
    const v = view.current;
    canvasRef.current.setPointerCapture(e.pointerId);
    const snap = Math.max(snapTicks(ui.snap), PPQ);
    if (e.pointerType === 'touch' && !p.inHead && !p.inLabels) loupe.current = { active: true, x: p.x, y: p.y };

    if (p.inHead) {
      const tick = Math.max(0, Math.floor(p.tick / barLen) * barLen);
      if (e.shiftKey) {
        dispatch({ type: 'patch', patch: { loopStart: tick, loopEnd: tick + barLen, loop: true } });
        drag.current = { mode: 'loop', from: tick };
        return;
      }
      play('song', tick);
      return;
    }
    const TRACKS = dataRef.current.tracks || DEFAULT_TRACKS;
    if (p.inLabels) {
      const t = p.track;
      if (t >= 0 && t < TRACKS) {
        const by = HEAD_H + t * TRACK_H + (TRACK_H - MSH) / 2;
        if (p.y >= by && p.y <= by + MSH) {
          if (p.x >= M_X && p.x < M_X + MSW) { dispatch({ type: 'track.mute', track: t }); bump((n) => n + 1); return; }
          if (p.x >= S_X && p.x < S_X + MSW) { dispatch({ type: 'track.solo', track: t }); bump((n) => n + 1); return; }
        }
      }
      return;
    }
    if (p.track < 0 || p.track >= TRACKS) return;

    const hit = clipAt(p.tick, p.track);
    if (e.button === 2) {
      if (hit) dispatch({ type: 'clip.remove', id: hit.id });
      drag.current = { mode: 'erase' };
      return;
    }
    if (hit) {
      if (e.metaKey || e.ctrlKey) {
        const at = Math.round(p.tick / snap) * snap;
        dispatch({ type: 'clip.split', id: hit.id, at });
        drag.current = null; bump((n) => n + 1); return;
      }
      if (e.altKey) {
        dispatch({ type: 'clip.add', patternId: hit.patternId, track: hit.track, start: hit.start + hit.length, length: hit.length });
        drag.current = null; bump((n) => n + 1); return;
      }
      // No long-press-to-delete — it fought press-and-drag-to-move. Remove
      // clips with right-click / the erase gesture instead.
      const rightEdge = LABEL_W + (hit.start + hit.length) * v.pxPerTick - v.scrollX;
      // Keep the clip body for MOVING; only a wide-enough clip gets a right-hand
      // strip for stretching, so narrow clips stay movable.
      const cwpx = hit.length * v.pxPerTick;
      const edge = e.pointerType === 'touch' ? Math.min(28, Math.max(0, cwpx - 24)) : 8;
      if (edge > 6 && p.x >= rightEdge - edge) {
        drag.current = { mode: 'resize', id: hit.id, snap };
      } else {
        drag.current = { mode: 'move', id: hit.id, snap, offset: p.tick - hit.start, track: p.track };
      }
      dispatch({ type: 'pattern.select', id: hit.patternId });
      selClip.current = hit.id;
      bump((n) => n + 1);
      return;
    }
    const start = Math.max(0, Math.round(p.tick / barLen) * barLen);
    dispatch({ type: 'clip.add', patternId: project.activePattern, track: p.track, start });
    drag.current = { mode: 'none' };
    bump((n) => n + 1);
  }, [dispatch, play, project.activePattern, ui.snap]); // eslint-disable-line react-hooks/exhaustive-deps

  const onPointerMove = useCallback((e) => {
    if (gesture.current && gesture.current.move(e)) { loupe.current.active = false; return; }
    press.current.move(e);
    const dr = drag.current;
    if (!dr || dr.mode === 'none') return;
    const p = posFromEvent(e);
    if (loupe.current.active && e.pointerType === 'touch') { loupe.current.x = p.x; loupe.current.y = p.y; }
    if (dr.mode === 'loop') {
      const tick = Math.max(0, Math.round(p.tick / barLen) * barLen);
      const a = Math.min(dr.from, tick);
      const b = Math.max(dr.from + barLen, tick);
      dispatch({ type: 'patch', patch: { loopStart: a, loopEnd: b }, live: true, id: 'loopregion' });
      return;
    }
    if (dr.mode === 'erase') {
      const hit = clipAt(p.tick, p.track);
      if (hit) dispatch({ type: 'clip.remove', id: hit.id });
      return;
    }
    const clip = dataRef.current.project.playlist.find((c) => c.id === dr.id);
    if (!clip) return;
    if (dr.mode === 'move') {
      const start = Math.max(0, Math.round((p.tick - dr.offset) / dr.snap) * dr.snap);
      const track = clamp(p.track, 0, (dataRef.current.tracks || DEFAULT_TRACKS) - 1);
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

  const onPointerUp = useCallback((e) => {
    if (gesture.current) gesture.current.up(e);
    press.current.cancel();
    drag.current = null;
    loupe.current.active = false;
    bump((n) => n + 1);
  }, []);

  const onDoubleClick = useCallback((e) => {
    const p = posFromEvent(e);
    if (p.inHead) {
      const v = view.current;
      const mk = (dataRef.current.project.markers || []).find((m) => Math.abs(LABEL_W + m.tick * v.pxPerTick - v.scrollX - p.x) < 12);
      if (mk) { dispatch({ type: 'marker.remove', id: mk.id }); bump((n) => n + 1); return; }
      const tm = (dataRef.current.project.tempoMap || []).find((m) => Math.abs(LABEL_W + m.tick * v.pxPerTick - v.scrollX - p.x) < 26);
      if (tm) { dispatch({ type: 'tempo.remove', id: tm.id }); bump((n) => n + 1); }
      return;
    }
    if (p.inLabels) {
      const t = p.track;
      if (t >= 0 && t < TRACKS && p.x < M_X) {
        const cur = (dataRef.current.project.trackNames || {})[t] || `Track ${t + 1}`;
        const name = window.prompt('Track name', cur);
        if (name != null) { dispatch({ type: 'track.rename', track: t, name }); bump((n) => n + 1); }
      }
      return;
    }
    const hit = clipAt(p.tick, p.track);
    if (hit) { dispatch({ type: 'pattern.select', id: hit.patternId }); setUi({ view: 'piano' }); }
  }, [dispatch, setUi]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Copy / paste the selected clip.
  useEffect(() => {
    const onKey = (e) => {
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      const pl = dataRef.current.project.playlist;
      if (k === 'c' && selClip.current) {
        const c = pl.find((x) => x.id === selClip.current);
        if (c) { clipboard.current = { patternId: c.patternId, track: c.track, length: c.length }; e.preventDefault(); }
      } else if (k === 'v' && clipboard.current) {
        const cb = clipboard.current;
        const base = engine.playing ? engine.currentPosition() : (((pl.find((x) => x.id === selClip.current) || {}).start) || 0);
        const snap = Math.max(snapTicks(dataRef.current.ui.snap), PPQ);
        dispatch({ type: 'clip.add', patternId: cb.patternId, track: cb.track, start: Math.round(base / snap) * snap, length: cb.length });
        e.preventDefault();
        bump((n) => n + 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch, engine]);

  const bars = Math.ceil(songLength(project) / barLen);

  return (
    <div className={s.panel}>
      <div className={s.panelHead}>
        <span className={s.panelTitle}>Arrangement</span>
        <span className={s.dim}>Placing:</span>
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
        <div className={s.group}>
          <span className={s.dim}>Zoom</span>
          <button type="button" className={s.btn} title="Zoom in" onClick={() => { view.current.pxPerTick = clamp(view.current.pxPerTick * 1.25, 0.02, 1.2); draw(); }}>+</button>
          <button type="button" className={s.btn} title="Zoom out" onClick={() => { view.current.pxPerTick = clamp(view.current.pxPerTick * 0.8, 0.02, 1.2); draw(); }}>−</button>
        </div>
        <div className={s.group}>
          <span className={s.dim}>Tracks</span>
          <button type="button" className={s.btn} title="Add an arrangement track" onClick={() => dispatch({ type: 'track.add' })}>＋ Track</button>
          <button
            type="button"
            className={s.btn}
            title="Remove the last arrangement track (and any clips on it)"
            onClick={() => { if (window.confirm('Remove the last track and any clips on it?')) dispatch({ type: 'track.remove' }); }}
          >－ Track</button>
        </div>
        <button type="button" className={s.btn} onClick={() => play('song')}>Play song</button>
        <button
          type="button"
          className={s.btn}
          title="Add a marker at the playhead (double-click a marker to remove)"
          onClick={() => { const v = view.current; const at = engine.playing ? engine.currentPosition() : v.scrollX / v.pxPerTick; dispatch({ type: 'marker.add', tick: Math.round(at / barLen) * barLen }); }}
        >+ Marker</button>
        <button
          type="button"
          className={s.btn}
          title="Add a tempo change from the playhead (double-click to remove)"
          onClick={() => {
            const v = view.current;
            const at = engine.playing ? engine.currentPosition() : v.scrollX / v.pxPerTick;
            const bpm = parseFloat(window.prompt('Tempo (BPM) from here on', String(Math.round(project.bpm))));
            if (!Number.isNaN(bpm)) dispatch({ type: 'tempo.add', tick: Math.round(at / barLen) * barLen, bpm });
          }}
        >+ Tempo</button>
        <button
          type="button"
          className={project.loop !== false && project.loopEnd > project.loopStart ? `${s.btn} ${s.on}` : s.btn}
          onClick={() => dispatch({ type: 'patch', patch: { loop: project.loop === false } })}
          title="Shift+drag in the ruler to set a loop region"
        >Loop</button>
        {project.loopEnd > project.loopStart && (
          <button
            type="button"
            className={s.btn}
            onClick={() => dispatch({ type: 'patch', patch: { loopStart: 0, loopEnd: 0 } })}
          >Clear loop</button>
        )}
        <div className={s.spacer} />
        <span className={s.dim}>Ctrl+click = split · Alt+click = duplicate · double-click = edit · {project.playlist.length} clips · {bars} bars</span>
      </div>
      <div className={s.canvasWrap} ref={wrapRef}>
        <canvas
          ref={canvasRef}
          className={s.canvas}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={onDoubleClick}
          onContextMenu={(e) => e.preventDefault()}
        />
        <canvas className={s.loupe} ref={loupeRef} />
      </div>
    </div>
  );
}
