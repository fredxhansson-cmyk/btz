import React, { useCallback, useEffect, useRef, useState } from 'react';
import s from '../../styles/studio.module.css';
import { useStudio, useRaf } from '../../lib/studio/StudioContext';
import {
  PPQ, BAR_TICKS, STEP_TICKS, MIN_KEY, MAX_KEY, IS_BLACK,
  keyName, snapTicks, SNAPS, clamp, uid,
} from '../../lib/studio/constants';
import { patternTicks } from '../../lib/studio/sequencer';

const KEY_W = 62;
const HEAD_H = 22;
const VEL_H = 64;
const KEYS = MAX_KEY - MIN_KEY + 1;

export default function PianoRoll() {
  const { project, dispatch, engine, ui, setUi, setHint, play } = useStudio();
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const view = useRef({ scrollX: 0, scrollY: 0, pxPerTick: 0.5, rowH: 13, inited: false });
  const drag = useRef(null);
  const sel = useRef(new Set());
  const lastLen = useRef(STEP_TICKS);
  const [, bump] = useState(0);

  const pattern = project.patterns.find((p) => p.id === project.activePattern) || project.patterns[0];
  const channel = project.channels.find((c) => c.id === project.selectedChannel) || project.channels[0];
  const notes = (pattern.notes && pattern.notes[channel.id]) || [];

  const dataRef = useRef({});
  dataRef.current = { project, pattern, channel, notes, ui };

  useEffect(() => {
    if (view.current.inited) return;
    view.current.inited = true;
    view.current.scrollY = Math.max(0, (MAX_KEY - 84) * view.current.rowH);
  }, []);

  /* ------------------------------------------------------------- drawing */

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
    const gridH = h - HEAD_H - VEL_H;
    const patLen = patternTicks(d.pattern);
    const snap = snapTicks(d.ui.snap);

    ctx.fillStyle = '#1b1d22';
    ctx.fillRect(0, 0, w, h);

    // rows
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, HEAD_H, w, gridH);
    ctx.clip();
    const firstKeyIdx = Math.floor(v.scrollY / v.rowH);
    const rows = Math.ceil(gridH / v.rowH) + 1;
    for (let i = 0; i < rows; i++) {
      const idx = firstKeyIdx + i;
      const key = MAX_KEY - idx;
      if (key < MIN_KEY) break;
      const y = HEAD_H + idx * v.rowH - v.scrollY;
      const black = IS_BLACK[((key % 12) + 12) % 12];
      ctx.fillStyle = black ? '#202329' : '#262a31';
      ctx.fillRect(KEY_W, y, w - KEY_W, v.rowH);
      if (key % 12 === 0) {
        ctx.fillStyle = '#15171b';
        ctx.fillRect(KEY_W, y + v.rowH - 1, w - KEY_W, 1);
      }
    }

    ctx.restore();

    // vertical grid
    const startTick = v.scrollX / v.pxPerTick;
    const endTick = startTick + (w - KEY_W) / v.pxPerTick;
    const minStep = Math.max(snap, STEP_TICKS);
    for (let t = Math.floor(startTick / minStep) * minStep; t <= endTick; t += minStep) {
      const x = KEY_W + t * v.pxPerTick - v.scrollX;
      if (x < KEY_W) continue;
      const isBar = t % BAR_TICKS === 0;
      const isBeat = t % PPQ === 0;
      ctx.fillStyle = isBar ? '#0e1013' : isBeat ? '#191b20' : '#212429';
      ctx.fillRect(Math.round(x), HEAD_H, isBar ? 2 : 1, gridH);
    }

    // out-of-pattern shading
    const endX = KEY_W + patLen * v.pxPerTick - v.scrollX;
    if (endX < w) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(Math.max(KEY_W, endX), HEAD_H, w - Math.max(KEY_W, endX), gridH);
    }

    // ghost notes from the other channels
    for (const ch of d.project.channels) {
      if (ch.id === d.channel.id) continue;
      const list = (d.pattern.notes && d.pattern.notes[ch.id]) || [];
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      for (const n of list) {
        const x = KEY_W + n.t * v.pxPerTick - v.scrollX;
        const y = HEAD_H + (MAX_KEY - n.k) * v.rowH - v.scrollY;
        if (x > w || y < HEAD_H - v.rowH || y > HEAD_H + gridH) continue;
        ctx.fillRect(Math.max(KEY_W, x), y + 1, Math.max(2, n.d * v.pxPerTick), v.rowH - 2);
      }
    }

    // notes
    for (const n of d.notes) {
      const x = KEY_W + n.t * v.pxPerTick - v.scrollX;
      const y = HEAD_H + (MAX_KEY - n.k) * v.rowH - v.scrollY;
      const nw = Math.max(3, n.d * v.pxPerTick);
      if (x + nw < KEY_W || x > w || y + v.rowH < HEAD_H || y > HEAD_H + gridH) continue;
      const selected = sel.current.has(n.id);
      ctx.fillStyle = d.channel.color;
      ctx.globalAlpha = 0.35 + n.v * 0.65;
      ctx.fillRect(x, y + 1, nw, v.rowH - 2);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = selected ? '#ffffff' : 'rgba(0,0,0,0.55)';
      ctx.lineWidth = selected ? 1.5 : 1;
      ctx.strokeRect(x + 0.5, y + 1.5, nw - 1, v.rowH - 3);
    }

    // header ruler
    ctx.fillStyle = '#15171b';
    ctx.fillRect(0, 0, w, HEAD_H);
    ctx.font = '10px ui-monospace, monospace';
    for (let bar = Math.floor(startTick / BAR_TICKS); bar * BAR_TICKS <= endTick; bar++) {
      const x = KEY_W + bar * BAR_TICKS * v.pxPerTick - v.scrollX;
      if (x < KEY_W - 20) continue;
      ctx.fillStyle = '#4b5058';
      ctx.fillRect(Math.round(x), 0, 1, HEAD_H);
      ctx.fillStyle = '#8b929c';
      ctx.fillText(String(bar + 1), x + 4, 14);
    }

    // velocity lane
    const velY = h - VEL_H;
    ctx.fillStyle = '#17191d';
    ctx.fillRect(0, velY, w, VEL_H);
    ctx.fillStyle = '#0e1013';
    ctx.fillRect(0, velY, w, 1);
    for (const n of d.notes) {
      const x = KEY_W + n.t * v.pxPerTick - v.scrollX;
      if (x < KEY_W || x > w) continue;
      const bh = (VEL_H - 12) * n.v;
      ctx.fillStyle = sel.current.has(n.id) ? '#ffffff' : d.channel.color;
      ctx.fillRect(x, velY + VEL_H - 6 - bh, 3, bh);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillRect(x, velY + VEL_H - 6 - bh - 2, 3, 2);
    }
    ctx.fillStyle = '#5a616b';
    ctx.font = '9px ui-monospace, monospace';
    ctx.fillText('VELOCITY', 6, velY + 12);

    // piano keyboard
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, HEAD_H, KEY_W, gridH);
    ctx.clip();
    ctx.fillStyle = '#d8dce2';
    ctx.fillRect(0, HEAD_H, KEY_W - 6, gridH);
    for (let i = 0; i < rows; i++) {
      const idx = firstKeyIdx + i;
      const key = MAX_KEY - idx;
      if (key < MIN_KEY) break;
      const y = HEAD_H + idx * v.rowH - v.scrollY;
      const pc = ((key % 12) + 12) % 12;
      if (IS_BLACK[pc]) {
        ctx.fillStyle = '#15171b';
        ctx.fillRect(0, y, KEY_W - 24, v.rowH);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(KEY_W - 24, y + v.rowH / 2 - 0.5, 18, 1);
      } else if (pc === 0 || pc === 5) {
        ctx.fillStyle = '#a8aeb6';
        ctx.fillRect(0, y + v.rowH - 1, KEY_W - 6, 1);
      }
      if (pc === 0) {
        ctx.fillStyle = '#5a616b';
        ctx.font = '9px ui-monospace, monospace';
        ctx.fillText(keyName(key), KEY_W - 26, y + v.rowH - 2);
      }
    }
    ctx.restore();
    ctx.fillStyle = '#0e1013';
    ctx.fillRect(KEY_W - 6, HEAD_H, 6, gridH);

    // playhead
    if (engine.playing) {
      const pos = d.ui.mode === 'pattern' ? engine.currentPosition() : engine.currentPosition() % Math.max(1, patLen);
      const x = KEY_W + pos * v.pxPerTick - v.scrollX;
      if (x >= KEY_W && x < w) {
        ctx.fillStyle = '#ff8a1f';
        ctx.fillRect(Math.round(x), 0, 1.5, h - VEL_H);
      }
    }
  }, [engine]);

  useRaf(draw);
  useEffect(() => { draw(); }, [draw, project, ui.snap]);

  /* -------------------------------------------------------- hit testing */

  const posFromEvent = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const v = view.current;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return {
      x, y,
      inKeys: x < KEY_W,
      inVel: y > rect.height - VEL_H,
      inHead: y < HEAD_H,
      tick: (x - KEY_W + v.scrollX) / v.pxPerTick,
      key: MAX_KEY - Math.floor((y - HEAD_H + v.scrollY) / v.rowH),
    };
  };

  const noteAt = (tick, key) => {
    const list = dataRef.current.notes;
    for (let i = list.length - 1; i >= 0; i--) {
      const n = list[i];
      if (n.k === key && tick >= n.t && tick <= n.t + n.d) return n;
    }
    return null;
  };

  const commitNotes = (next) => {
    dispatch({ type: 'notes.set', patternId: pattern.id, channelId: channel.id, notes: next, live: true, id: 'roll' });
  };

  const onPointerDown = useCallback((e) => {
    const p = posFromEvent(e);
    const v = view.current;
    const d = dataRef.current;
    canvasRef.current.setPointerCapture(e.pointerId);

    if (p.inHead) {
      play(d.ui.mode === 'song' ? 'song' : 'pattern', Math.max(0, Math.floor(p.tick / BAR_TICKS) * BAR_TICKS));
      drag.current = null;
      return;
    }
    if (p.inKeys) {
      engine.noteOn(channel.id, clamp(p.key, MIN_KEY, MAX_KEY), 0.9);
      drag.current = { mode: 'audition', key: p.key };
      return;
    }
    if (p.inVel) {
      const target = d.notes.reduce((best, n) => {
        const x = KEY_W + n.t * v.pxPerTick - v.scrollX;
        const dist = Math.abs(x - p.x);
        return !best || dist < best.dist ? { n, dist } : best;
      }, null);
      if (target && target.dist < 14) {
        drag.current = { mode: 'vel', id: target.n.id };
        applyVel(target.n.id, p);
      }
      return;
    }

    const snap = snapTicks(d.ui.snap);
    const hit = noteAt(p.tick, p.key);
    if (e.button === 2) {
      if (hit) {
        dispatch({ type: 'note.remove', patternId: pattern.id, channelId: channel.id, ids: [hit.id] });
        sel.current.delete(hit.id);
      }
      drag.current = { mode: 'erase' };
      return;
    }
    if (hit) {
      const rightEdge = KEY_W + (hit.t + hit.d) * v.pxPerTick - v.scrollX;
      if (!e.shiftKey && !sel.current.has(hit.id)) { sel.current.clear(); sel.current.add(hit.id); }
      else sel.current.add(hit.id);
      if (Math.abs(p.x - rightEdge) < 6) {
        drag.current = { mode: 'resize', id: hit.id, snap };
      } else {
        drag.current = {
          mode: 'move',
          origin: { tick: p.tick, key: p.key },
          snap,
          items: d.notes.filter((n) => sel.current.has(n.id)).map((n) => ({ id: n.id, t: n.t, k: n.k })),
        };
        engine.preview(channel.id, hit.k, hit.v, 0.25);
      }
      bump((n) => n + 1);
      return;
    }
    // create
    const t = Math.max(0, Math.floor(p.tick / snap) * snap);
    const key = clamp(p.key, MIN_KEY, MAX_KEY);
    const note = { id: uid('n'), t, k: key, d: lastLen.current, v: 0.85 };
    dispatch({ type: 'note.add', patternId: pattern.id, channelId: channel.id, note, live: true, gesture: 'draw' });
    sel.current.clear();
    sel.current.add(note.id);
    engine.preview(channel.id, key, 0.85, 0.3);
    drag.current = { mode: 'resize', id: note.id, snap, fresh: true };
  }, [channel, dispatch, engine, pattern.id, play]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyVel = (id, p) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const velTop = rect.height - VEL_H + 6;
    const v = clamp(1 - (p.y - velTop) / (VEL_H - 12), 0.05, 1);
    dispatch({ type: 'note.update', patternId: pattern.id, channelId: channel.id, id, patch: { v }, live: true, key: 'vel' });
  };

  const onPointerMove = useCallback((e) => {
    const dr = drag.current;
    if (!dr) return;
    const p = posFromEvent(e);
    const d = dataRef.current;
    if (dr.mode === 'audition') {
      const key = clamp(p.key, MIN_KEY, MAX_KEY);
      if (key !== dr.key) {
        engine.noteOff(channel.id, dr.key);
        engine.noteOn(channel.id, key, 0.9);
        dr.key = key;
      }
      return;
    }
    if (dr.mode === 'vel') { applyVel(dr.id, p); return; }
    if (dr.mode === 'erase') {
      const hit = noteAt(p.tick, p.key);
      if (hit) dispatch({ type: 'note.remove', patternId: pattern.id, channelId: channel.id, ids: [hit.id] });
      return;
    }
    if (dr.mode === 'resize') {
      const note = d.notes.find((n) => n.id === dr.id);
      if (!note) return;
      const len = Math.max(dr.snap, Math.round((p.tick - note.t) / dr.snap) * dr.snap);
      lastLen.current = len;
      dispatch({
        type: 'note.update',
        patternId: pattern.id,
        channelId: channel.id,
        id: dr.id,
        patch: { d: len },
        live: true,
        gesture: dr.fresh ? 'draw' : `len:${dr.id}`,
      });
      return;
    }
    if (dr.mode === 'move') {
      const dt = Math.round((p.tick - dr.origin.tick) / dr.snap) * dr.snap;
      const dk = p.key - dr.origin.key;
      if (!dt && !dk) return;
      const byId = new Map(dr.items.map((it) => [it.id, it]));
      const next = d.notes.map((n) => {
        const it = byId.get(n.id);
        if (!it) return n;
        return { ...n, t: Math.max(0, it.t + dt), k: clamp(it.k + dk, MIN_KEY, MAX_KEY) };
      });
      commitNotes(next);
    }
  }, [channel, dispatch, engine, pattern.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const onPointerUp = useCallback(() => {
    const dr = drag.current;
    if (dr && dr.mode === 'audition') engine.noteOff(channel.id, dr.key);
    drag.current = null;
    bump((n) => n + 1);
  }, [channel, engine]);

  const onWheel = useCallback((e) => {
    const v = view.current;
    if (e.ctrlKey || e.metaKey) {
      v.pxPerTick = clamp(v.pxPerTick * (e.deltaY < 0 ? 1.15 : 0.87), 0.08, 4);
    } else if (e.shiftKey) {
      v.scrollX = Math.max(0, v.scrollX + e.deltaY);
    } else {
      v.scrollY = clamp(v.scrollY + e.deltaY, 0, Math.max(0, KEYS * v.rowH - 120));
    }
    draw();
  }, [draw]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const handler = (e) => { e.preventDefault(); onWheel(e); };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [onWheel]);

  useEffect(() => {
    const onKey = (e) => {
      if (ui.view !== 'piano') return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!sel.current.size) return;
        e.preventDefault();
        dispatch({ type: 'note.remove', patternId: pattern.id, channelId: channel.id, ids: [...sel.current] });
        sel.current.clear();
      }
      if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        sel.current = new Set(notes.map((n) => n.id));
        bump((n) => n + 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch, pattern.id, channel.id, notes, ui.view]);

  return (
    <div className={s.panel}>
      <div className={s.panelHead}>
        <span className={s.panelTitle}>Piano Roll</span>
        <select
          className={s.select}
          value={channel.id}
          onChange={(e) => dispatch({ type: 'select.channel', id: e.target.value })}
        >
          {project.channels.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select
          className={s.select}
          value={pattern.id}
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
        <button
          type="button"
          className={s.btn}
          onClick={() => { view.current.pxPerTick = clamp(view.current.pxPerTick * 1.25, 0.08, 4); draw(); }}
        >+</button>
        <button
          type="button"
          className={s.btn}
          onClick={() => { view.current.pxPerTick = clamp(view.current.pxPerTick * 0.8, 0.08, 4); draw(); }}
        >−</button>
        <button
          type="button"
          className={s.btn}
          onClick={() => {
            dispatch({ type: 'pattern.clearChannel', patternId: pattern.id, channelId: channel.id });
            setHint(`Rensade ${channel.name} i ${pattern.name}.`);
          }}
        >Rensa kanal</button>
        <div className={s.spacer} />
        <span className={s.dim}>{notes.length} noter</span>
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
