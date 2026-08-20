import React, { useCallback, useEffect, useRef, useState } from 'react';
import s from '../../styles/studio.module.css';
import { accent, accentA, token } from '../../lib/studio/theme';
import { useStudio, useRaf } from '../../lib/studio/StudioContext';
import {
  PPQ, BAR_TICKS, STEP_TICKS, MIN_KEY, MAX_KEY, IS_BLACK, NOTE_NAMES,
  keyName, snapTicks, SNAPS, clamp, uid,
} from '../../lib/studio/constants';
import { patternTicks } from '../../lib/studio/sequencer';
import { longPress, pinchZoom } from '../../lib/studio/touch';
import {
  SCALES, CHORDS, chordKeys, inScale, snapKeyToScale, quantizeNotes, transposeNotes,
  nudgeNotes, strumNotes, arpeggiateNotes, humanizeVelocity, randomizeVelocity,
  legatoNotes, invertNotes, reverseNotes, cloneNotes,
} from '../../lib/studio/theory';

const KEY_W = 62;
const HEAD_H = 22;
const VEL_H = 64;
const KEYS = MAX_KEY - MIN_KEY + 1;

let clipboard = [];   // survives view switches

export default function PianoRoll() {
  const { project, dispatch, engine, ui, setUi, setHint, play, addToArrangement } = useStudio();
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const view = useRef({ scrollX: 0, scrollY: 0, pxPerTick: 0.5, rowH: 13, inited: false });
  const drag = useRef(null);
  const marquee = useRef(null);
  const sel = useRef(new Set());
  const lastLen = useRef(STEP_TICKS);
  const [, bump] = useState(0);
  const [qStrength, setQStrength] = useState(1);
  const gesture = useRef(null);
  const press = useRef(null);
  if (!press.current) press.current = longPress();

  const pattern = project.patterns.find((p) => p.id === project.activePattern) || project.patterns[0];
  const channel = project.channels.find((c) => c.id === project.selectedChannel) || project.channels[0];
  const notes = (pattern.notes && pattern.notes[channel.id]) || [];
  const scale = { root: ui.scaleRoot || 0, id: ui.scale || 'chromatic', snap: !!ui.scaleSnap };

  const dataRef = useRef({});
  const barLen = project.barTicks || BAR_TICKS;
  dataRef.current = { project, pattern, channel, notes, ui, scale, barLen };

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
    const scaleOn = d.scale.id !== 'chromatic';

    ctx.fillStyle = token('--gridsurface');
    ctx.fillRect(0, 0, w, h);

    // key rows, dimmed when the note is outside the chosen scale
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
      const out = scaleOn && !inScale(key, d.scale.root, d.scale.id);
      ctx.fillStyle = out ? (black ? token('--key-black') : token('--step-off')) : (black ? token('--key-black') : token('--key-white'));
      ctx.fillRect(KEY_W, y, w - KEY_W, v.rowH);
      if (key % 12 === d.scale.root && scaleOn) {
        ctx.fillStyle = accentA(0.10);
        ctx.fillRect(KEY_W, y, w - KEY_W, v.rowH);
      }
      if (key % 12 === 0) {
        ctx.fillStyle = token('--panel');
        ctx.fillRect(KEY_W, y + v.rowH - 1, w - KEY_W, 1);
      }
    }
    ctx.restore();

    // time grid
    const startTick = v.scrollX / v.pxPerTick;
    const endTick = startTick + (w - KEY_W) / v.pxPerTick;
    const minStep = Math.max(snap, STEP_TICKS);
    for (let t = Math.floor(startTick / minStep) * minStep; t <= endTick; t += minStep) {
      const x = KEY_W + t * v.pxPerTick - v.scrollX;
      if (x < KEY_W) continue;
      const isBar = t % d.barLen === 0;
      const isBeat = t % PPQ === 0;
      ctx.fillStyle = isBar ? token('--line') : isBeat ? token('--grid-line') : token('--grid-line');
      ctx.fillRect(Math.round(x), HEAD_H, isBar ? 2 : 1, gridH);
    }

    const endX = KEY_W + patLen * v.pxPerTick - v.scrollX;
    if (endX < w) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(Math.max(KEY_W, endX), HEAD_H, w - Math.max(KEY_W, endX), gridH);
    }

    // ghost notes from other channels
    if (d.ui.ghosts !== false) {
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
    }

    // notes
    for (const n of d.notes) {
      const x = KEY_W + n.t * v.pxPerTick - v.scrollX;
      const y = HEAD_H + (MAX_KEY - n.k) * v.rowH - v.scrollY;
      const nw = Math.max(3, n.d * v.pxPerTick);
      if (x + nw < KEY_W || x > w || y + v.rowH < HEAD_H || y > HEAD_H + gridH) continue;
      const selected = sel.current.has(n.id);
      ctx.fillStyle = d.channel.color;
      ctx.globalAlpha = 0.35 + (n.v == null ? 0.85 : n.v) * 0.65;
      ctx.fillRect(x, y + 1, nw, v.rowH - 2);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = selected ? '#ffffff' : 'rgba(0,0,0,0.55)';
      ctx.lineWidth = selected ? 1.5 : 1;
      ctx.strokeRect(x + 0.5, y + 1.5, nw - 1, v.rowH - 3);
    }

    // marquee
    if (marquee.current) {
      const m = marquee.current;
      ctx.strokeStyle = accentA(0.9);
      ctx.fillStyle = accentA(0.12);
      const x = Math.min(m.x0, m.x1);
      const y = Math.min(m.y0, m.y1);
      ctx.fillRect(x, y, Math.abs(m.x1 - m.x0), Math.abs(m.y1 - m.y0));
      ctx.strokeRect(x + 0.5, y + 0.5, Math.abs(m.x1 - m.x0), Math.abs(m.y1 - m.y0));
    }

    // ruler
    ctx.fillStyle = token('--panel');
    ctx.fillRect(0, 0, w, HEAD_H);
    ctx.font = '10px ui-monospace, monospace';
    for (let bar = Math.floor(startTick / d.barLen); bar * d.barLen <= endTick; bar++) {
      const x = KEY_W + bar * d.barLen * v.pxPerTick - v.scrollX;
      if (x < KEY_W - 20) continue;
      ctx.fillStyle = token('--key-black-ink');
      ctx.fillRect(Math.round(x), 0, 1, HEAD_H);
      ctx.fillStyle = token('--key-white-ink');
      ctx.fillText(String(bar + 1), x + 4, 14);
    }

    // velocity lane
    const velY = h - VEL_H;
    ctx.fillStyle = token('--card');
    ctx.fillRect(0, velY, w, VEL_H);
    ctx.fillStyle = token('--line');
    ctx.fillRect(0, velY, w, 1);
    for (const n of d.notes) {
      const x = KEY_W + n.t * v.pxPerTick - v.scrollX;
      if (x < KEY_W || x > w) continue;
      const bh = (VEL_H - 12) * (n.v == null ? 0.85 : n.v);
      ctx.fillStyle = sel.current.has(n.id) ? '#ffffff' : d.channel.color;
      ctx.fillRect(x, velY + VEL_H - 6 - bh, 3, bh);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillRect(x, velY + VEL_H - 6 - bh - 2, 3, 2);
    }
    ctx.fillStyle = token('--text-4');
    ctx.font = '9px ui-monospace, monospace';
    ctx.fillText('VELOCITY', 6, velY + 12);

    // keyboard
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, HEAD_H, KEY_W, gridH);
    ctx.clip();
    ctx.fillStyle = token('--text');
    ctx.fillRect(0, HEAD_H, KEY_W - 6, gridH);
    for (let i = 0; i < rows; i++) {
      const idx = firstKeyIdx + i;
      const key = MAX_KEY - idx;
      if (key < MIN_KEY) break;
      const y = HEAD_H + idx * v.rowH - v.scrollY;
      const pc = ((key % 12) + 12) % 12;
      if (IS_BLACK[pc]) {
        ctx.fillStyle = token('--panel');
        ctx.fillRect(0, y, KEY_W - 24, v.rowH);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(KEY_W - 24, y + v.rowH / 2 - 0.5, 18, 1);
      } else if (pc === 0 || pc === 5) {
        ctx.fillStyle = token('--text-3');
        ctx.fillRect(0, y + v.rowH - 1, KEY_W - 6, 1);
      }
      if (scaleOn && pc === d.scale.root) {
        ctx.fillStyle = accentA(0.35);
        ctx.fillRect(KEY_W - 10, y + 1, 4, v.rowH - 2);
      }
      if (pc === 0) {
        ctx.fillStyle = token('--text-4');
        ctx.font = '9px ui-monospace, monospace';
        ctx.fillText(keyName(key), KEY_W - 26, y + v.rowH - 2);
      }
    }
    ctx.restore();
    ctx.fillStyle = token('--line');
    ctx.fillRect(KEY_W - 6, HEAD_H, 6, gridH);

    // playhead
    if (engine.playing) {
      const pos = engine.currentPosition() % Math.max(1, patLen);
      const x = KEY_W + pos * v.pxPerTick - v.scrollX;
      if (x >= KEY_W && x < w) {
        ctx.fillStyle = accent();
        ctx.fillRect(Math.round(x), 0, 1.5, h - VEL_H);
      }
    }
  }, [engine]);

  useRaf(draw);
  useEffect(() => { draw(); }, [draw, project, ui]);

  /* -------------------------------------------------------- interactions */

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

  const setNotes = (next, gesture) => dispatch({
    type: 'notes.set',
    patternId: pattern.id,
    channelId: channel.id,
    notes: next,
    live: !!gesture,
    gesture,
  });

  const selected = () => notes.filter((n) => sel.current.has(n.id));

  const applyToSelection = (fn, label) => {
    const chosen = selected();
    const list = chosen.length ? chosen : notes;
    if (!list.length) return;
    const changed = fn(list);
    const ids = new Set(list.map((n) => n.id));
    const rest = notes.filter((n) => !ids.has(n.id));
    setNotes([...rest, ...changed]);
    sel.current = new Set(changed.map((n) => n.id));
    if (label) setHint(label);
    bump((n) => n + 1);
  };

  const onPointerDown = useCallback((e) => {
    if (!gesture.current) gesture.current = pinchZoom(view, draw, { min: 0.08, max: 4, maxScrollY: KEYS * view.current.rowH - 120 });
    if (gesture.current.down(e)) { drag.current = null; press.current.cancel(); return; }
    const p = posFromEvent(e);
    const v = view.current;
    const d = dataRef.current;
    canvasRef.current.setPointerCapture(e.pointerId);

    if (p.inHead) {
      play(d.ui.mode === 'song' ? 'song' : 'pattern', Math.max(0, Math.floor(p.tick / d.barLen) * d.barLen));
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
    const tool = d.ui.tool || 'draw';

    if (e.button === 2 || tool === 'erase') {
      if (hit) {
        dispatch({ type: 'note.remove', patternId: pattern.id, channelId: channel.id, ids: [hit.id] });
        sel.current.delete(hit.id);
      }
      drag.current = { mode: 'erase' };
      return;
    }

    if (tool === 'select' || (e.ctrlKey || e.metaKey)) {
      if (!e.shiftKey) sel.current.clear();
      marquee.current = { x0: p.x, y0: p.y, x1: p.x, y1: p.y };
      drag.current = { mode: 'marquee' };
      bump((n) => n + 1);
      return;
    }

    if (hit) {
      // long press on touch removes the note, like a right-click does
      press.current.start(e, () => {
        dispatch({ type: 'note.remove', patternId: pattern.id, channelId: channel.id, ids: [hit.id] });
        sel.current.delete(hit.id);
        drag.current = null;
      });
      const rightEdge = KEY_W + (hit.t + hit.d) * v.pxPerTick - v.scrollX;
      if (!e.shiftKey && !sel.current.has(hit.id)) { sel.current.clear(); sel.current.add(hit.id); }
      else sel.current.add(hit.id);
      if (Math.abs(p.x - rightEdge) < 6) {
        drag.current = { mode: 'resize', id: hit.id, snap, ids: [...sel.current] };
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

    // draw a note or a whole chord
    const t = Math.max(0, Math.floor(p.tick / snap) * snap);
    let key = clamp(p.key, MIN_KEY, MAX_KEY);
    if (d.scale.snap && d.scale.id !== 'chromatic') key = snapKeyToScale(key, d.scale.root, d.scale.id);
    const chordId = d.ui.chord || 'none';
    const keys = chordId === 'none' ? [key] : chordKeys(key, chordId, d.scale);
    const fresh = keys.map((k) => ({ id: uid('n'), t, k, d: lastLen.current, v: 0.85 }));
    setNotes([...d.notes, ...fresh], 'draw');
    sel.current = new Set(fresh.map((n) => n.id));
    fresh.forEach((n, i) => engine.preview(channel.id, n.k, 0.85 - i * 0.05, 0.3));
    drag.current = { mode: 'resize', id: fresh[0].id, ids: fresh.map((n) => n.id), snap, fresh: true };
  }, [channel, dispatch, engine, pattern.id, play]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyVel = (id, p) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const velTop = rect.height - VEL_H + 6;
    const v = clamp(1 - (p.y - velTop) / (VEL_H - 12), 0.05, 1);
    dispatch({ type: 'note.update', patternId: pattern.id, channelId: channel.id, id, patch: { v }, live: true, key: 'vel' });
  };

  const onPointerMove = useCallback((e) => {
    if (gesture.current && gesture.current.move(e)) return;
    press.current.move(e);
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
    if (dr.mode === 'marquee') {
      marquee.current.x1 = p.x;
      marquee.current.y1 = p.y;
      const v = view.current;
      const m = marquee.current;
      const t0 = (Math.min(m.x0, m.x1) - KEY_W + v.scrollX) / v.pxPerTick;
      const t1 = (Math.max(m.x0, m.x1) - KEY_W + v.scrollX) / v.pxPerTick;
      const k1 = MAX_KEY - Math.floor((Math.min(m.y0, m.y1) - HEAD_H + v.scrollY) / v.rowH);
      const k0 = MAX_KEY - Math.floor((Math.max(m.y0, m.y1) - HEAD_H + v.scrollY) / v.rowH);
      for (const n of d.notes) {
        if (n.t + n.d >= t0 && n.t <= t1 && n.k >= k0 && n.k <= k1) sel.current.add(n.id);
      }
      draw();
      return;
    }
    if (dr.mode === 'resize') {
      const anchor = d.notes.find((n) => n.id === dr.id);
      if (!anchor) return;
      const len = Math.max(dr.snap, Math.round((p.tick - anchor.t) / dr.snap) * dr.snap);
      lastLen.current = len;
      const ids = new Set(dr.ids && dr.ids.length ? dr.ids : [dr.id]);
      setNotes(d.notes.map((n) => (ids.has(n.id) ? { ...n, d: len } : n)),
        dr.fresh ? 'draw' : `len:${dr.id}`);
      return;
    }
    if (dr.mode === 'move') {
      const dt = Math.round((p.tick - dr.origin.tick) / dr.snap) * dr.snap;
      let dk = p.key - dr.origin.key;
      if (!dt && !dk) return;
      const byId = new Map(dr.items.map((it) => [it.id, it]));
      const next = d.notes.map((n) => {
        const it = byId.get(n.id);
        if (!it) return n;
        let k = clamp(it.k + dk, MIN_KEY, MAX_KEY);
        if (d.scale.snap && d.scale.id !== 'chromatic') k = snapKeyToScale(k, d.scale.root, d.scale.id);
        return { ...n, t: Math.max(0, it.t + dt), k };
      });
      setNotes(next, 'move');
    }
  }, [channel, dispatch, draw, engine, pattern.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const onPointerUp = useCallback((e) => {
    if (gesture.current) gesture.current.up(e);
    press.current.cancel();
    const dr = drag.current;
    if (dr && dr.mode === 'audition') engine.noteOff(channel.id, dr.key);
    if (dr && dr.mode === 'marquee') {
      marquee.current = null;
      setHint(`${sel.current.size} notes selected.`);
    }
    drag.current = null;
    bump((n) => n + 1);
    draw();
  }, [channel, draw, engine, setHint]);

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

  /* ------------------------------------------------------------ shortcuts */

  useEffect(() => {
    const onKey = (e) => {
      if (ui.view !== 'piano') return;
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      const mod = e.ctrlKey || e.metaKey;
      const chosen = selected();
      const list = chosen.length ? chosen : [];

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!sel.current.size) return;
        e.preventDefault();
        dispatch({ type: 'note.remove', patternId: pattern.id, channelId: channel.id, ids: [...sel.current] });
        sel.current.clear();
        return;
      }
      if (mod && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        sel.current = new Set(notes.map((n) => n.id));
        bump((n) => n + 1);
        return;
      }
      if (mod && e.key.toLowerCase() === 'c') {
        if (!list.length) return;
        e.preventDefault();
        clipboard = list.map((n) => ({ ...n }));
        setHint(`${clipboard.length} notes copied.`);
        return;
      }
      if (mod && e.key.toLowerCase() === 'x') {
        if (!list.length) return;
        e.preventDefault();
        clipboard = list.map((n) => ({ ...n }));
        dispatch({ type: 'note.remove', patternId: pattern.id, channelId: channel.id, ids: list.map((n) => n.id) });
        sel.current.clear();
        return;
      }
      if (mod && e.key.toLowerCase() === 'v') {
        if (!clipboard.length) return;
        e.preventDefault();
        const base = Math.min(...clipboard.map((n) => n.t));
        const at = engine.playing ? Math.round(engine.currentPosition()) : base + snapTicks(ui.snap);
        const pasted = cloneNotes(clipboard, at - base);
        setNotes([...notes, ...pasted]);
        sel.current = new Set(pasted.map((n) => n.id));
        setHint(`${pasted.length} notes pasted.`);
        return;
      }
      if (mod && e.key.toLowerCase() === 'd') {
        if (!list.length) return;
        e.preventDefault();
        const span = Math.max(...list.map((n) => n.t + n.d)) - Math.min(...list.map((n) => n.t));
        const copy = cloneNotes(list, Math.max(snapTicks(ui.snap), span));
        setNotes([...notes, ...copy]);
        sel.current = new Set(copy.map((n) => n.id));
        return;
      }
      if (mod && e.key.toLowerCase() === 'q') {
        e.preventDefault();
        applyToSelection((l) => quantizeNotes(l, snapTicks(ui.snap), qStrength), 'Quantized.');
        return;
      }
      if (!mod && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && sel.current.size) {
        e.preventDefault();
        const step = e.shiftKey ? 12 : 1;
        applyToSelection((l) => transposeNotes(l, e.key === 'ArrowUp' ? step : -step));
        return;
      }
      if (!mod && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && sel.current.size) {
        e.preventDefault();
        const g = snapTicks(ui.snap);
        applyToSelection((l) => nudgeNotes(l, e.key === 'ArrowRight' ? g : -g));
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [dispatch, pattern.id, channel.id, notes, ui.view, ui.snap, qStrength, engine, setHint]); // eslint-disable-line react-hooks/exhaustive-deps

  const arp = channel.arp || { on: false, rate: '1/16', mode: 'up', octaves: 1, gate: 0.9 };
  const setArp = (patch) => dispatch({ type: 'channel.update', id: channel.id, patch: { arp: { ...arp, ...patch } } });

  return (
    <div className={s.panel}>
      <div className={s.panelHead}>
        <span className={s.panelTitle}>Piano Roll</span>
        <select className={s.select} value={channel.id} onChange={(e) => dispatch({ type: 'select.channel', id: e.target.value })}>
          {project.channels.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className={s.select} value={pattern.id} onChange={(e) => dispatch({ type: 'pattern.select', id: e.target.value })}>
          {project.patterns.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button type="button" className={`${s.btn} ${s.on}`} onClick={addToArrangement} title="Place this pattern into the song arrangement">＋ Arrangement</button>
        <div className={s.modeSw}>
          {[['draw', 'Draw'], ['select', 'Select'], ['erase', 'Erase']].map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={(ui.tool || 'draw') === id ? `${s.seg} ${s.on}` : s.seg}
              onClick={() => setUi({ tool: id })}
            >{label}</button>
          ))}
        </div>
        <div className={s.group}>
          <span className={s.dim}>Snap</span>
          <select className={s.select} value={ui.snap} onChange={(e) => setUi({ snap: e.target.value })}>
            {SNAPS.map((sn) => <option key={sn.id} value={sn.id}>{sn.label}</option>)}
          </select>
        </div>
        <div className={s.group}>
          <span className={s.dim}>Chord</span>
          <select className={s.select} value={ui.chord || 'none'} onChange={(e) => setUi({ chord: e.target.value })}>
            {CHORDS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className={s.group}>
          <span className={s.dim}>Scale</span>
          <select className={s.select} value={ui.scaleRoot || 0} onChange={(e) => setUi({ scaleRoot: Number(e.target.value) })}>
            {NOTE_NAMES.map((n, i) => <option key={n} value={i}>{n}</option>)}
          </select>
          <select className={s.select} value={ui.scale || 'chromatic'} onChange={(e) => setUi({ scale: e.target.value })}>
            {SCALES.map((sc) => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
          </select>
          <button
            type="button"
            className={ui.scaleSnap ? `${s.btn} ${s.on}` : s.btn}
            onClick={() => setUi({ scaleSnap: !ui.scaleSnap })}
            title="Force new notes into the scale"
          >Lock</button>
        </div>
        <div className={s.spacer} />
        <button type="button" className={ui.ghosts === false ? s.btn : `${s.btn} ${s.on}`} onClick={() => setUi({ ghosts: ui.ghosts === false })}>Ghosts</button>
        <span className={s.dim}>Octave</span>
        <button type="button" className={s.btn} title="Scroll up an octave (or scroll the wheel over the keys)" onClick={() => { const v = view.current; v.scrollY = clamp(v.scrollY - 12 * v.rowH, 0, Math.max(0, KEYS * v.rowH - 120)); draw(); }}>▲</button>
        <button type="button" className={s.btn} title="Scroll down an octave" onClick={() => { const v = view.current; v.scrollY = clamp(v.scrollY + 12 * v.rowH, 0, Math.max(0, KEYS * v.rowH - 120)); draw(); }}>▼</button>
        <button type="button" className={s.btn} onClick={() => { view.current.pxPerTick = clamp(view.current.pxPerTick * 1.25, 0.08, 4); draw(); }}>+</button>
        <button type="button" className={s.btn} onClick={() => { view.current.pxPerTick = clamp(view.current.pxPerTick * 0.8, 0.08, 4); draw(); }}>−</button>
        <span className={s.dim}>{notes.length} notes</span>
      </div>

      <div className={s.dmTools}>
        <span className={s.toolLabel}>Tools</span>
        <div className={s.group}>
          <button type="button" className={s.btn} onClick={() => applyToSelection((l) => quantizeNotes(l, snapTicks(ui.snap), qStrength), 'Quantized.')}>Quantize</button>
          <input
            className={s.numInput} type="number" min={0} max={100} step={5}
            value={Math.round(qStrength * 100)}
            onChange={(e) => setQStrength(clamp((parseInt(e.target.value, 10) || 0) / 100, 0, 1))}
          />
          <span className={s.dim}>%</span>
        </div>
        <button type="button" className={s.btn} onClick={() => applyToSelection((l) => strumNotes(l, Math.round(snapTicks(ui.snap) / 2)), 'Strummed.')}>Strum</button>
        <button type="button" className={s.btn} onClick={() => applyToSelection((l) => arpeggiateNotes(l, snapTicks(ui.snap), 'up', 1), 'Arpeggiated.')}>Arpeggiate</button>
        <button type="button" className={s.btn} onClick={() => applyToSelection((l) => humanizeVelocity(l), 'Humanized.')}>Humanize</button>
        <button type="button" className={s.btn} onClick={() => applyToSelection((l) => randomizeVelocity(l), 'Randomized velocity.')}>Randomize vel</button>
        <button type="button" className={s.btn} onClick={() => applyToSelection((l) => legatoNotes(l, notes), 'Legato.')}>Legato</button>
        <button type="button" className={s.btn} onClick={() => applyToSelection((l) => invertNotes(l), 'Inverted.')}>Invert</button>
        <button type="button" className={s.btn} onClick={() => applyToSelection((l) => reverseNotes(l), 'Reversed.')}>Reverse</button>
        <div className={s.group}>
          <button type="button" className={s.btn} onClick={() => applyToSelection((l) => transposeNotes(l, 12))}>Oct +</button>
          <button type="button" className={s.btn} onClick={() => applyToSelection((l) => transposeNotes(l, -12))}>Oct −</button>
        </div>
        <div className={s.spacer} />
        <div className={s.group}>
          <span className={s.toolLabel}>Arp</span>
          <button type="button" className={arp.on ? `${s.btn} ${s.on}` : s.btn} onClick={() => setArp({ on: !arp.on })}>
            {arp.on ? 'ON' : 'OFF'}
          </button>
          <select className={s.select} value={arp.rate} onChange={(e) => setArp({ rate: e.target.value })}>
            {['1/4', '1/8', '1/8T', '1/16', '1/16T', '1/32'].map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select className={s.select} value={arp.mode} onChange={(e) => setArp({ mode: e.target.value })}>
            {[['up', 'Up'], ['down', 'Down'], ['updown', 'Up/down'], ['random', 'Random'], ['chord', 'Chord']].map(([id, l]) => (
              <option key={id} value={id}>{l}</option>
            ))}
          </select>
          <select className={s.select} value={arp.octaves} onChange={(e) => setArp({ octaves: Number(e.target.value) })}>
            {[1, 2, 3, 4].map((o) => <option key={o} value={o}>{o} oct</option>)}
          </select>
        </div>
        <button type="button" className={s.btn} onClick={() => { dispatch({ type: 'pattern.clearChannel', patternId: pattern.id, channelId: channel.id }); sel.current.clear(); }}>Clear channel</button>
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
