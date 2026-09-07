import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useStudio, useRaf } from '../../lib/studio/StudioContext';
import { BRAND_CYCLE } from '../../lib/studio/library';
import { patternTicks } from '../../lib/studio/sequencer';
import { BAR_TICKS, clamp, uid } from '../../lib/studio/constants';

// DOM Arrangement view — a faithful port of the Fuse `ViewArrange` template:
// a bordered card with a 190px track-label column (colour tick + name + M/S),
// a bar ruler, and clip lanes. Clips are the owning track's brand accent.
const LABEL_W = 190;
const ROW_H = 56;

export default function ArrangeView() {
  const { project, dispatch, ui, setUi, engine, play } = useStudio();
  const [pxPerBar, setPxPerBar] = useState(64);
  const [sel, setSel] = useState(null);
  const scrollRef = useRef(null);
  const rowsRef = useRef(null);
  const playheadRef = useRef(null);
  const drag = useRef(null);

  const barTicks = project.barTicks || BAR_TICKS;
  const trackCount = clamp(project.arrangeTracks || 10, 1, 32);
  const tracks = Array.from({ length: trackCount }, (_, i) => i);
  const patName = (id) => { const p = project.patterns.find((x) => x.id === id); return p ? p.name : '?'; };
  const activePat = project.patterns.find((p) => p.id === project.activePattern) || project.patterns[0];
  const trackColor = (t) => BRAND_CYCLE[t % BRAND_CYCLE.length];
  const trackName = (t) => (project.trackNames && project.trackNames[t]) || `Track ${t + 1}`;
  const isMuted = (t) => !!(project.trackMute && project.trackMute[t]);
  const isSolo = (t) => !!(project.trackSolo && project.trackSolo[t]);
  const anySolo = project.trackSolo && Object.values(project.trackSolo).some(Boolean);

  const maxEndTick = project.playlist.reduce((m, c) => Math.max(m, c.start + c.length), 0);
  const bars = Math.max(32, Math.ceil(maxEndTick / barTicks) + 8);
  const laneW = bars * pxPerBar;
  const clipsOf = (t) => project.playlist.filter((c) => c.track === t);

  useRaf(() => {
    if (!playheadRef.current) return;
    const on = engine.playing || engine.pausedTick;
    const tick = on ? engine.currentPosition() : 0;
    playheadRef.current.style.transform = `translateX(${(tick / barTicks) * pxPerBar}px)`;
    playheadRef.current.style.opacity = on ? '1' : '0';
  });

  const endDrag = useCallback(() => {
    drag.current = null;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', endDrag);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onMove = useCallback((e) => {
    const d = drag.current;
    if (!d) return;
    const dxBars = Math.round((e.clientX - d.startX) / pxPerBar);
    if (d.mode === 'resize') {
      const length = Math.max(barTicks, d.origLength + dxBars * barTicks);
      dispatch({ type: 'clip.update', id: d.id, patch: { length }, live: true, key: `len:${d.id}` });
    } else if (d.mode === 'move') {
      const start = Math.max(0, d.origStart + dxBars * barTicks);
      let track = d.track;
      if (d.rowsTop != null) track = clamp(Math.floor((e.clientY - d.rowsTop) / ROW_H), 0, trackCount - 1);
      dispatch({ type: 'clip.update', id: d.id, patch: { start, track }, live: true, key: `move:${d.id}` });
    }
  }, [pxPerBar, barTicks, trackCount, dispatch]);

  const startDrag = useCallback((mode, clip, e) => {
    const rowsTop = rowsRef.current ? rowsRef.current.getBoundingClientRect().top : null;
    drag.current = {
      mode, id: clip.id, track: clip.track,
      startX: e.clientX, origStart: clip.start || 0, origLength: clip.length || barTicks, rowsTop,
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', endDrag);
  }, [onMove, endDrag, barTicks]);

  const onLaneDown = useCallback((e, track) => {
    if (e.button === 2) return;
    const laneRect = e.currentTarget.getBoundingClientRect();
    const bar = Math.max(0, Math.floor((e.clientX - laneRect.left) / pxPerBar));
    const start = bar * barTicks;
    const id = uid('cl');
    const length = activePat ? patternTicks(activePat) : barTicks;
    dispatch({ type: 'clip.add', id, patternId: project.activePattern, track, start, length });
    setSel(id);
    // Enter resize immediately so dragging right sets the length in one gesture.
    startDrag('resize', { id, track, start, length }, e);
  }, [pxPerBar, barTicks, activePat, project.activePattern, dispatch, startDrag]);

  const onClipDown = useCallback((e, clip) => {
    e.stopPropagation();
    setSel(clip.id);
    const r = e.currentTarget.getBoundingClientRect();
    if (e.clientX > r.right - 10) startDrag('resize', clip, e);
    else startDrag('move', clip, e);
  }, [startDrag]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && sel) {
        dispatch({ type: 'clip.remove', id: sel });
        setSel(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sel, dispatch]);

  const S = {
    tool: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
    label: { fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)' },
    ghost: { height: 'var(--ctl-sm)', padding: '0 14px', borderRadius: 'var(--r-sm)', border: '1px solid var(--line-strong)', background: 'var(--field)', color: 'var(--text-2)', fontSize: 13, cursor: 'pointer' },
    zoom: { width: 'var(--ctl-sm)', height: 'var(--ctl-sm)', borderRadius: 'var(--r-sm)', border: '1px solid var(--line-3)', background: 'var(--field-2)', color: 'var(--text-2)', fontSize: 14, cursor: 'pointer' },
    act: { height: 'var(--ctl)', padding: '0 16px', borderRadius: 'var(--r-md)', border: '1px solid var(--line-3)', background: 'var(--field-2)', color: 'var(--text-2)', fontSize: 14, cursor: 'pointer' },
    ms: { width: 26, height: 26, flex: 'none', borderRadius: 'var(--r-xs)', border: 'none', color: 'var(--text-4)', fontSize: 11, fontWeight: 700, cursor: 'pointer' },
  };

  const loopOn = project.loop !== false && project.loopEnd > project.loopStart;

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: 'var(--font-ui)', height: '100%', width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '16px 20px 10px' }}>
      {/* toolbar */}
      <div style={S.tool}>
        <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, letterSpacing: '-.015em', color: 'var(--text)' }}>Arrangement</h2>
        <span style={S.label}>Placing</span>
        <select
          value={project.activePattern}
          onChange={(e) => dispatch({ type: 'pattern.select', id: e.target.value })}
          style={{ ...S.ghost, color: 'var(--text)' }}
        >
          {project.patterns.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <span style={{ ...S.label, marginLeft: 6 }}>Snap</span>
        <span style={{ ...S.ghost, display: 'inline-flex', alignItems: 'center' }}>Bar</span>
        <button style={S.zoom} title="Zoom in" onClick={() => setPxPerBar((v) => clamp(v * 1.25, 16, 240))}>+</button>
        <button style={S.zoom} title="Zoom out" onClick={() => setPxPerBar((v) => clamp(v * 0.8, 16, 240))}>−</button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button style={{ ...S.act, border: 'none', background: 'var(--accent)', color: 'var(--accent-ink)', fontWeight: 600 }} onClick={() => play('song')}>Play song</button>
          <button style={S.act} onClick={() => dispatch({ type: 'track.add' })}>+ Track</button>
          <button style={S.act} onClick={() => { const at = engine.playing ? engine.currentPosition() : 0; dispatch({ type: 'marker.add', tick: Math.round(at / barTicks) * barTicks }); }}>+ Marker</button>
          <button
            style={{ ...S.act, ...(loopOn ? { border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent)', fontWeight: 600 } : {}) }}
            onClick={() => dispatch({ type: 'patch', patch: { loop: project.loop === false } })}
          >Loop</button>
        </div>
      </div>

      {/* card */}
      <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', overflow: 'hidden', background: 'var(--card)', flex: 1, minHeight: 0, minWidth: 0, display: 'flex' }}>
        <div ref={scrollRef} style={{ overflow: 'auto', position: 'relative', flex: 1, minWidth: 0 }}>
          <div style={{ width: LABEL_W + laneW, minWidth: '100%', position: 'relative' }}>
            {/* ruler */}
            <div style={{ display: 'flex', height: 44, borderBottom: '1px solid var(--line)', background: 'var(--panel)' }}>
              <div style={{ width: LABEL_W, flex: 'none', position: 'sticky', left: 0, zIndex: 3, background: 'var(--panel)', display: 'flex', alignItems: 'center', padding: '0 16px', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)', borderRight: '1px solid var(--line)' }}>Track</div>
              <div style={{ position: 'relative', width: laneW, height: '100%' }}>
                {Array.from({ length: Math.ceil(bars / 4) + 1 }, (_, i) => i * 4).map((b) => (
                  <span key={b} style={{ position: 'absolute', left: b * pxPerBar + 8, top: 14, fontSize: 12, color: 'var(--text-4)', fontVariantNumeric: 'tabular-nums' }}>{b + 1}</span>
                ))}
              </div>
            </div>

            {/* rows */}
            <div ref={rowsRef}>
              {tracks.map((t) => {
                const dimmed = isMuted(t) || (anySolo && !isSolo(t));
                return (
                  <div key={t} style={{ display: 'flex', height: ROW_H, borderBottom: '1px solid var(--line-weak)' }}>
                    <div style={{ width: LABEL_W, flex: 'none', position: 'sticky', left: 0, zIndex: 2, background: 'var(--card)', display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', borderRight: '1px solid var(--line)' }}>
                      <span style={{ width: 4, height: 24, borderRadius: 'var(--r-xs)', background: trackColor(t), flex: 'none' }} />
                      <span style={{ flex: 1, minWidth: 40, fontSize: 13.5, fontWeight: 500, color: clipsOf(t).length ? 'var(--text)' : 'var(--text-4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{trackName(t)}</span>
                      <button style={{ ...S.ms, background: isMuted(t) ? 'var(--rec)' : 'var(--meter-track)', color: isMuted(t) ? '#fff' : 'var(--text-4)' }} onClick={() => dispatch({ type: 'track.mute', track: t })} title="Mute">M</button>
                      <button style={{ ...S.ms, background: isSolo(t) ? 'var(--warn)' : 'var(--meter-track)', color: isSolo(t) ? 'var(--accent-ink)' : 'var(--text-4)' }} onClick={() => dispatch({ type: 'track.solo', track: t })} title="Solo">S</button>
                    </div>
                    <div
                      onPointerDown={(e) => onLaneDown(e, t)}
                      style={{ position: 'relative', flex: 1, minWidth: laneW, background: 'var(--gridsurface)', backgroundImage: 'linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)', backgroundSize: `${pxPerBar}px 100%`, cursor: 'crosshair', opacity: dimmed ? 0.5 : 1 }}
                    >
                      {clipsOf(t).map((clip) => {
                        const left = (clip.start / barTicks) * pxPerBar;
                        const width = Math.max(6, (clip.length / barTicks) * pxPerBar);
                        const selected = sel === clip.id;
                        return (
                          <div
                            key={clip.id}
                            onPointerDown={(e) => onClipDown(e, clip)}
                            onDoubleClick={(e) => { e.stopPropagation(); dispatch({ type: 'pattern.select', id: clip.patternId }); setUi({ view: 'piano' }); }}
                            style={{ position: 'absolute', left, top: 8, bottom: 8, width, borderRadius: 'var(--r-sm)', background: trackColor(t), opacity: 0.9, boxShadow: selected ? '0 0 0 2px var(--text)' : 'none', display: 'flex', alignItems: 'center', padding: '0 10px', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--accent-ink)', cursor: 'grab', overflow: 'hidden', whiteSpace: 'nowrap' }}
                          >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{patName(clip.patternId)}</span>
                            {selected && (
                              <button
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => { e.stopPropagation(); dispatch({ type: 'clip.remove', id: clip.id }); setSel(null); }}
                                style={{ marginLeft: 'auto', flex: 'none', width: 16, height: 16, borderRadius: 'var(--r-xs)', border: 'none', background: 'rgba(0,0,0,.35)', color: 'var(--accent-ink)', fontSize: 11, cursor: 'pointer', lineHeight: 1 }}
                                title="Delete clip"
                              >×</button>
                            )}
                            <span style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 8, cursor: 'ew-resize' }} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* playhead */}
            <div ref={playheadRef} style={{ position: 'absolute', left: LABEL_W, top: 44, bottom: 0, width: 2, background: 'var(--text)', opacity: 0, pointerEvents: 'none', zIndex: 1 }} />
          </div>
        </div>
      </div>

      {/* meta */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 12.5, color: 'var(--muted)' }}>
        <span>Click a lane to place the selected pattern · drag the right edge to lengthen · drag to move · double-click opens it in the piano roll · Delete removes it</span>
        <span style={{ marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>{project.playlist.length} clips · {bars} bars</span>
      </div>
    </section>
  );
}
