import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useStudio, useRaf } from '../../lib/studio/StudioContext';
import { BRAND_CYCLE } from '../../lib/studio/library';
import { patternTicks } from '../../lib/studio/sequencer';
import { BAR_TICKS, clamp, uid } from '../../lib/studio/constants';

// DOM Arrangement view — a faithful port of the Fuse `ViewArrange` template with
// pro editing: place/move/resize clips, per-clip volume keyframes + fades, a
// note-content preview inside each clip, and adjustable track height.
const hexA = (hex, a) => {
  if (!hex || hex[0] !== '#') return hex;
  const h = hex.slice(1);
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return `rgba(${parseInt(n.slice(0, 2), 16)},${parseInt(n.slice(2, 4), 16)},${parseInt(n.slice(4, 6), 16)},${a})`;
};

export default function ArrangeView() {
  const { project, dispatch, ui, setUi, engine, play, collab, setPresence } = useStudio();
  const LABEL_W = ui.touch ? 112 : 190; // narrower track column on phones = more lane visible
  const [pxPerBar, setPxPerBar] = useState(64);
  const [rowH, setRowH] = useState(64);
  const [tool, setTool] = useState('select'); // 'select' | 'volume'
  const [sel, setSel] = useState(null);
  const [, bump] = useState(0);
  const rowsRef = useRef(null);
  const playheadRef = useRef(null);
  const drag = useRef(null);

  const barTicks = project.barTicks || BAR_TICKS;
  const trackCount = clamp(project.arrangeTracks || 10, 1, 32);
  const tracks = Array.from({ length: trackCount }, (_, i) => i);
  const patOf = (id) => project.patterns.find((x) => x.id === id);
  const patName = (id) => { const p = patOf(id); return p ? p.name : '?'; };
  const activePat = patOf(project.activePattern) || project.patterns[0];
  const trackColor = (t) => BRAND_CYCLE[t % BRAND_CYCLE.length];
  const trackName = (t) => (project.trackNames && project.trackNames[t]) || `Track ${t + 1}`;
  const isMuted = (t) => !!(project.trackMute && project.trackMute[t]);
  const isSolo = (t) => !!(project.trackSolo && project.trackSolo[t]);
  const anySolo = project.trackSolo && Object.values(project.trackSolo).some(Boolean);

  const maxEndTick = project.playlist.reduce((m, c) => Math.max(m, c.start + c.length), 0);
  const bars = Math.max(32, Math.ceil(maxEndTick / barTicks) + 8);
  const laneW = bars * pxPerBar;
  const px = (ticks) => (ticks / barTicks) * pxPerBar;
  const clipsOf = (t) => project.playlist.filter((c) => c.track === t);

  useRaf(() => {
    if (!playheadRef.current) return;
    const on = engine.playing || engine.pausedTick;
    const tick = on ? engine.currentPosition() : 0;
    playheadRef.current.style.transform = `translateX(${px(tick)}px)`;
    playheadRef.current.style.opacity = on ? '1' : '0';
  });

  const onMove = useCallback((e) => {
    const d = drag.current;
    if (!d) return;
    if (d.mode === 'resize') {
      const length = Math.max(barTicks, d.origLength + Math.round((e.clientX - d.startX) / pxPerBar) * barTicks);
      dispatch({ type: 'clip.update', id: d.id, patch: { length }, live: true, key: `len:${d.id}` });
    } else if (d.mode === 'move') {
      const start = Math.max(0, d.origStart + Math.round((e.clientX - d.startX) / pxPerBar) * barTicks);
      let track = d.track;
      if (d.rowsTop != null) track = clamp(Math.floor((e.clientY - d.rowsTop) / rowH), 0, trackCount - 1);
      dispatch({ type: 'clip.update', id: d.id, patch: { start, track }, live: true, key: `mv:${d.id}` });
    } else if (d.mode === 'fadeIn') {
      const fadeIn = clamp(Math.round((e.clientX - d.clipLeft) / pxPerBar * barTicks), 0, d.length - (d.fadeOut || 0));
      dispatch({ type: 'clip.update', id: d.id, patch: { fadeIn }, live: true, key: `fi:${d.id}` });
    } else if (d.mode === 'fadeOut') {
      const fadeOut = clamp(Math.round((d.clipRight - e.clientX) / pxPerBar * barTicks), 0, d.length - (d.fadeIn || 0));
      dispatch({ type: 'clip.update', id: d.id, patch: { fadeOut }, live: true, key: `fo:${d.id}` });
    } else if (d.mode === 'kf') {
      const rel = clamp(Math.round((e.clientX - d.clipLeft) / pxPerBar * barTicks), 0, d.length);
      const v = clamp(1.5 * (1 - (e.clientY - d.clipTop) / d.clipH), 0, 1.5);
      const pts = [...(d.pts)];
      pts[d.idx] = { t: rel, v };
      pts.sort((a, b) => a.t - b.t);
      dispatch({ type: 'clip.update', id: d.id, patch: { gainPoints: pts }, live: true, key: `kf:${d.id}` });
    }
  }, [pxPerBar, barTicks, trackCount, rowH, dispatch]);

  const endDrag = useCallback(() => {
    drag.current = null;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', endDrag);
    bump((n) => n + 1);
  }, [onMove]);

  const arm = useCallback((d) => {
    drag.current = d;
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', endDrag);
  }, [onMove, endDrag]);

  // Plain click on empty lane just clears the selection — never spawns a clip.
  const onLaneDown = useCallback((e, track) => {
    if (e.button === 2 || tool !== 'select') return;
    setSel(null);
  }, [tool]);

  // Double-click empty lane = deliberately place the selected pattern there.
  const onLaneDouble = useCallback((e, track) => {
    if (tool !== 'select') return;
    const laneRect = e.currentTarget.getBoundingClientRect();
    const bar = Math.max(0, Math.floor((e.clientX - laneRect.left) / pxPerBar));
    const id = uid('cl');
    const length = activePat ? patternTicks(activePat) : barTicks;
    dispatch({ type: 'clip.add', id, patternId: project.activePattern, track, start: bar * barTicks, length });
    setSel(id);
  }, [tool, pxPerBar, barTicks, activePat, project.activePattern, dispatch]);

  const onClipDown = useCallback((e, clip, rect) => {
    e.stopPropagation();
    setSel(clip.id);
    if (tool === 'volume') {
      // Add a volume keyframe at the click, then drag it.
      const rel = clamp(Math.round((e.clientX - rect.left) / pxPerBar * barTicks), 0, clip.length);
      const v = clamp(1.5 * (1 - (e.clientY - rect.top) / rect.height), 0, 1.5);
      const pts = [...(clip.gainPoints || []), { t: rel, v }].sort((a, b) => a.t - b.t);
      const idx = pts.findIndex((p) => p.t === rel && p.v === v);
      dispatch({ type: 'clip.update', id: clip.id, patch: { gainPoints: pts } });
      arm({ mode: 'kf', id: clip.id, idx, pts, clipLeft: rect.left, clipTop: rect.top, clipH: rect.height, length: clip.length });
      return;
    }
    if (e.clientX > rect.right - 10) arm({ mode: 'resize', id: clip.id, track: clip.track, startX: e.clientX, origStart: clip.start, origLength: clip.length });
    else arm({ mode: 'move', id: clip.id, track: clip.track, startX: e.clientX, startY: e.clientY, origStart: clip.start, origLength: clip.length, rowsTop: rowsRef.current ? rowsRef.current.getBoundingClientRect().top : null });
  }, [tool, pxPerBar, barTicks, dispatch, arm]);

  const onKfDown = useCallback((e, clip, i, rect) => {
    e.stopPropagation();
    setSel(clip.id);
    const pts = clip.gainPoints || [];
    if (e.button === 2 || e.shiftKey) {
      dispatch({ type: 'clip.update', id: clip.id, patch: { gainPoints: pts.filter((_, idx) => idx !== i) } });
      return;
    }
    arm({ mode: 'kf', id: clip.id, idx: i, pts, clipLeft: rect.left, clipTop: rect.top, clipH: rect.height, length: clip.length });
  }, [dispatch, arm]);

  const onFadeDown = useCallback((e, clip, side, rect) => {
    e.stopPropagation();
    setSel(clip.id);
    arm({ mode: side, id: clip.id, length: clip.length, fadeIn: clip.fadeIn || 0, fadeOut: clip.fadeOut || 0, clipLeft: rect.left, clipRight: rect.right });
  }, [arm]);

  // Share which clip you have selected so peers see your cursor in the room.
  useEffect(() => { if (setPresence) setPresence({ view: 'playlist', sel }); }, [sel, setPresence]);
  const peerSel = {};
  ((collab && collab.peers) || []).forEach((p) => { if (!p.self && p.sel && p.view === 'playlist') peerSel[p.sel] = p; });

  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      const clip = sel ? project.playlist.find((c) => c.id === sel) : null;
      const mod = e.metaKey || e.ctrlKey;
      if ((e.key === 'Delete' || e.key === 'Backspace') && sel) {
        e.preventDefault(); dispatch({ type: 'clip.remove', id: sel }); setSel(null);
      } else if (clip && (e.key === 'e' || e.key === 'E') && mod) {
        // Split at the playhead (or the clip's midpoint when stopped).
        e.preventDefault();
        const pos = engine.playing ? engine.currentPosition() : clip.start + Math.floor(clip.length / 2);
        if (pos > clip.start && pos < clip.start + clip.length) dispatch({ type: 'clip.split', id: clip.id, at: pos });
      } else if (clip && (e.key === 'd' || e.key === 'D') && mod) {
        // Duplicate the selected clip right after itself.
        e.preventDefault();
        const id = uid('cl');
        dispatch({ type: 'clip.add', id, patternId: clip.patternId, track: clip.track, start: clip.start + clip.length, length: clip.length });
        setSel(id);
      } else if (clip && (e.key === 'l' || e.key === 'L') && mod) {
        // Loop-extend: append another copy back-to-back.
        e.preventDefault();
        const id = uid('cl');
        dispatch({ type: 'clip.add', id, patternId: clip.patternId, track: clip.track, start: clip.start + clip.length, length: clip.length });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sel, project.playlist, engine, dispatch]);

  // Subtle note-content preview: a tidy mini piano-roll, low-contrast so it
  // reads as texture, not noise. Skipped on tiny clips.
  const notePreview = (clip, w, h) => {
    if (w < 40) return null;
    const pat = patOf(clip.patternId);
    if (!pat || !pat.notes) return null;
    const flat = [];
    for (const chId of Object.keys(pat.notes)) for (const n of pat.notes[chId]) flat.push(n);
    if (!flat.length) return null;
    const plen = Math.max(1, patternTicks(pat));
    let lo = 127; let hi = 0;
    for (const n of flat) { if (n.k < lo) lo = n.k; if (n.k > hi) hi = n.k; }
    const span = Math.max(4, hi - lo);
    const reps = Math.min(12, Math.ceil(clip.length / plen));
    const top = 18; const bot = h - 5; const range = Math.max(6, bot - top);
    const rects = [];
    for (let r = 0; r < reps && rects.length < 200; r++) {
      for (const n of flat) {
        const x = (((r * plen) + n.t) / clip.length) * w;
        if (x > w) continue;
        const nw = Math.max(2, Math.min(w * 0.14, (n.d / clip.length) * w));
        const y = bot - ((n.k - lo) / span) * range;
        rects.push(<rect key={`${r}-${rects.length}`} x={x.toFixed(1)} y={y.toFixed(1)} width={nw.toFixed(1)} height="2" rx="1" fill="rgba(0,0,0,0.22)" />);
      }
    }
    return <g>{rects}</g>;
  };

  // Volume envelope + fades — only when the clip actually has one, or while the
  // Volume tool / selection makes it editable. Keeps resting clips clean.
  const envelope = (clip, w, h, selected) => {
    const hasEnv = (clip.gainPoints && clip.gainPoints.length) || clip.fadeIn || clip.fadeOut || (clip.gain != null && clip.gain !== 1);
    if (!hasEnv && !(selected || tool === 'volume')) return null;
    const yOf = (v) => (1 - clamp(v, 0, 1.5) / 1.5) * h;
    const pts = clip.gainPoints && clip.gainPoints.length ? clip.gainPoints : null;
    const fi = px(clip.fadeIn || 0);
    const fo = px(clip.fadeOut || 0);
    let d;
    if (pts) {
      d = `M0,${yOf(pts[0].v).toFixed(1)}` + pts.map((p) => `L${((p.t / clip.length) * w).toFixed(1)},${yOf(p.v).toFixed(1)}`).join('') + `L${w.toFixed(1)},${yOf(pts[pts.length - 1].v).toFixed(1)}`;
    } else {
      const g = clip.gain == null ? 1 : clip.gain;
      d = `M0,${yOf(g).toFixed(1)}L${w.toFixed(1)},${yOf(g).toFixed(1)}`;
    }
    return (
      <>
        {fi > 0 && <line x1="0" y1={h} x2={fi} y2="2" stroke="var(--tl-fade-line)" strokeWidth="1.5" />}
        {fo > 0 && <line x1={w - fo} y1="2" x2={w} y2={h} stroke="var(--tl-fade-line)" strokeWidth="1.5" />}
        <path d={d} fill="none" stroke="var(--tl-volume-line)" strokeWidth="1.5" opacity={hasEnv ? 0.9 : 0.4} />
      </>
    );
  };

  const btn = { height: 'var(--ctl)', padding: '0 16px', borderRadius: 'var(--r-md)', border: '1px solid var(--line-3)', background: 'var(--field-2)', color: 'var(--text-2)', fontSize: 14, cursor: 'pointer' };
  const zbtn = { width: 'var(--ctl-sm)', height: 'var(--ctl-sm)', borderRadius: 'var(--r-sm)', border: '1px solid var(--line-3)', background: 'var(--field-2)', color: 'var(--text-2)', fontSize: 14, cursor: 'pointer' };
  const toolBtn = (on) => ({ ...btn, ...(on ? { border: 'none', background: 'var(--accent)', color: 'var(--accent-ink)', fontWeight: 700 } : {}) });
  const loopOn = project.loop !== false && project.loopEnd > project.loopStart;

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: 'var(--font-ui)', height: '100%', width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '16px 20px 10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: ui.touch ? 6 : 10, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: ui.touch ? 16 : 19, fontWeight: 700, letterSpacing: '-.015em', color: 'var(--text)', flex: 'none' }}>Arrangement</h2>
        <span style={{ fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>Placing</span>
        <select value={project.activePattern} onChange={(e) => dispatch({ type: 'pattern.select', id: e.target.value })} style={{ ...btn, height: 'var(--ctl-sm)', color: 'var(--text)' }}>
          {project.patterns.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 12, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Track h</span>
          <button style={zbtn} title="Shorter tracks" onClick={() => setRowH((v) => clamp(v - 12, 40, 160))}>−</button>
          <button style={zbtn} title="Taller tracks" onClick={() => setRowH((v) => clamp(v + 12, 40, 160))}>+</button>
          <span style={{ fontSize: 12, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Zoom</span>
          <button style={zbtn} title="Zoom in" onClick={() => setPxPerBar((v) => clamp(v * 1.25, 16, 240))}>+</button>
          <button style={zbtn} title="Zoom out" onClick={() => setPxPerBar((v) => clamp(v * 0.8, 16, 240))}>−</button>
          <button style={toolBtn(tool === 'select')} onClick={() => setTool('select')}>Select</button>
          <button style={toolBtn(tool === 'volume')} onClick={() => setTool('volume')} title="Draw volume keyframes on clips (click adds, drag moves, shift/right-click removes)">Volume</button>
          <button style={{ ...btn, border: 'none', background: 'var(--accent)', color: 'var(--accent-ink)', fontWeight: 600 }} onClick={() => play('song')}>Play song</button>
          <button style={btn} onClick={() => dispatch({ type: 'track.add' })}>+ Track</button>
          <button style={{ ...btn, ...(loopOn ? { border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent)', fontWeight: 600 } : {}) }} onClick={() => dispatch({ type: 'patch', patch: { loop: project.loop === false } })}>Loop</button>
        </div>
      </div>

      <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', overflow: 'hidden', background: 'var(--card)', flex: 1, minHeight: 0, minWidth: 0, display: 'flex' }}>
        <div style={{ overflow: 'auto', position: 'relative', flex: 1, minWidth: 0 }}>
          <div style={{ width: LABEL_W + laneW, minWidth: '100%', position: 'relative' }}>
            <div style={{ display: 'flex', height: 44, borderBottom: '1px solid var(--line)', background: 'var(--panel)' }}>
              <div style={{ width: LABEL_W, flex: 'none', position: 'sticky', left: 0, zIndex: 3, background: 'var(--panel)', display: 'flex', alignItems: 'center', padding: '0 16px', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)', borderRight: '1px solid var(--line)' }}>Track</div>
              <div style={{ position: 'relative', width: laneW, height: '100%' }}>
                {Array.from({ length: Math.ceil(bars / 4) + 1 }, (_, i) => i * 4).map((b) => (
                  <span key={b} style={{ position: 'absolute', left: b * pxPerBar + 8, top: 14, fontSize: 12, color: 'var(--text-4)', fontVariantNumeric: 'tabular-nums' }}>{b + 1}</span>
                ))}
              </div>
            </div>

            <div ref={rowsRef}>
              {tracks.map((t) => {
                const dimmed = isMuted(t) || (anySolo && !isSolo(t));
                return (
                  <div key={t} style={{ display: 'flex', height: rowH, borderBottom: '1px solid var(--line-weak)' }}>
                    <div style={{ width: LABEL_W, flex: 'none', position: 'sticky', left: 0, zIndex: 2, background: 'var(--card)', display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', borderRight: '1px solid var(--line)' }}>
                      <span style={{ width: 4, height: 24, borderRadius: 'var(--r-xs)', background: trackColor(t), flex: 'none' }} />
                      <span style={{ flex: 1, minWidth: 40, fontSize: 13.5, fontWeight: 500, color: clipsOf(t).length ? 'var(--text)' : 'var(--text-4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{trackName(t)}</span>
                      <button style={{ width: 26, height: 26, flex: 'none', borderRadius: 'var(--r-xs)', border: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: isMuted(t) ? 'var(--rec)' : 'var(--meter-track)', color: isMuted(t) ? '#fff' : 'var(--text-4)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }} onClick={() => dispatch({ type: 'track.mute', track: t })} title="Mute">M</button>
                      <button style={{ width: 26, height: 26, flex: 'none', borderRadius: 'var(--r-xs)', border: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: isSolo(t) ? 'var(--warn)' : 'var(--meter-track)', color: isSolo(t) ? 'var(--accent-ink)' : 'var(--text-4)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }} onClick={() => dispatch({ type: 'track.solo', track: t })} title="Solo">S</button>
                    </div>
                    <div
                      onPointerDown={(e) => onLaneDown(e, t)}
                      onDoubleClick={(e) => onLaneDouble(e, t)}
                      style={{ position: 'relative', flex: 1, minWidth: laneW, background: 'var(--gridsurface)', backgroundImage: 'linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)', backgroundSize: `${pxPerBar}px 100%`, cursor: tool === 'volume' ? 'crosshair' : 'default', opacity: dimmed ? 0.5 : 1 }}
                    >
                      {clipsOf(t).map((clip) => {
                        const left = px(clip.start);
                        const width = Math.max(6, px(clip.length));
                        const selected = sel === clip.id;
                        const ch = trackColor(t);
                        const ih = rowH - 16; // inner content height
                        return (
                          <div
                            key={clip.id}
                            onPointerDown={(e) => onClipDown(e, clip, e.currentTarget.getBoundingClientRect())}
                            onDoubleClick={(e) => { e.stopPropagation(); dispatch({ type: 'pattern.select', id: clip.patternId }); setUi({ view: 'piano' }); }}
                            style={{ position: 'absolute', left, top: 8, height: rowH - 16, width, borderRadius: 'var(--r-sm)', background: hexA(ch, 0.9), boxShadow: selected ? '0 0 0 2px var(--text)' : (peerSel[clip.id] ? `0 0 0 2px ${peerSel[clip.id].color}` : 'none'), overflow: 'hidden', cursor: tool === 'volume' ? 'crosshair' : 'grab', color: 'var(--accent-ink)' }}
                          >
                            <span style={{ position: 'absolute', left: 8, top: 4, fontSize: 11, fontWeight: 700, pointerEvents: 'none', textShadow: '0 1px 2px rgba(0,0,0,.4)' }}>{patName(clip.patternId)}</span>
                            <svg width={width} height={ih} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }} viewBox={`0 0 ${width} ${ih}`} preserveAspectRatio="none">
                              {notePreview(clip, width, ih)}
                              {envelope(clip, width, ih, selected)}
                            </svg>
                            {/* keyframe dots */}
                            {(clip.gainPoints || []).map((p, i) => {
                              const cx = (p.t / clip.length) * width;
                              const cy = (1 - clamp(p.v, 0, 1.5) / 1.5) * ih;
                              return <span key={i} onPointerDown={(e) => onKfDown(e, clip, i, e.currentTarget.parentElement.getBoundingClientRect())} title="Drag to move · shift/right-click to remove" style={{ position: 'absolute', left: cx - 5, top: cy - 5, width: 10, height: 10, borderRadius: '50%', background: selected ? 'var(--accent)' : 'var(--text)', border: '1px solid rgba(0,0,0,.4)', cursor: 'ns-resize' }} />;
                            })}
                            {/* fade handles — only on the selected clip or in Volume mode, to keep resting clips clean */}
                            {(selected || tool === 'volume') && (
                              <>
                                <span onPointerDown={(e) => onFadeDown(e, clip, 'fadeIn', e.currentTarget.parentElement.getBoundingClientRect())} title="Drag: fade in" style={{ position: 'absolute', left: 0, top: 0, width: 10, height: 10, cursor: 'ew-resize', borderLeft: '2px solid var(--tl-fade-line)', borderTop: '2px solid var(--tl-fade-line)' }} />
                                <span onPointerDown={(e) => onFadeDown(e, clip, 'fadeOut', e.currentTarget.parentElement.getBoundingClientRect())} title="Drag: fade out" style={{ position: 'absolute', right: 0, top: 0, width: 10, height: 10, cursor: 'ew-resize', borderRight: '2px solid var(--tl-fade-line)', borderTop: '2px solid var(--tl-fade-line)' }} />
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div ref={playheadRef} style={{ position: 'absolute', left: LABEL_W, top: 44, bottom: 0, width: 2, background: 'var(--text)', opacity: 0, pointerEvents: 'none', zIndex: 1 }} />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 12.5, color: 'var(--muted)' }}>
        <span>{tool === 'volume'
          ? 'Volume: click a clip to add a keyframe · drag points to shape the fade · shift/right-click removes · drag the top corners for fade in/out'
          : 'Double-click a lane to add · drag to move · drag right edge to lengthen · double-click a clip to edit · ⌘E split · ⌘D duplicate · Delete removes'}</span>
        <span style={{ marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>{project.playlist.length} clips · {bars} bars</span>
      </div>
    </section>
  );
}
