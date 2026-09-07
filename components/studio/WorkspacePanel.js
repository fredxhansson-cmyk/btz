import React, { useEffect, useRef, useState } from 'react';
import s from '../../styles/studio.module.css';
import { uid, clamp } from '../../lib/studio/constants';
import ChannelRack from './ChannelRack';
import PianoRoll from './PianoRoll';
import Playlist from './Playlist';
import DrumMachine from './DrumMachine';
import Automation from './Automation';
import Mixer from './Mixer';
import MasteringView from './Mastering';
import VideoPanel from './VideoPanel';
import LiveInputsPanel from './LiveInputsPanel';
import Browser from './Browser';

// The blocks a workspace slot can show.
const BLOCKS = [
  { id: 'rack', label: 'Instruments' },
  { id: 'piano', label: 'Piano Roll' },
  { id: 'playlist', label: 'Arrangement' },
  { id: 'drums', label: 'Drum Machine' },
  { id: 'automation', label: 'Automation' },
  { id: 'mixer', label: 'Mixer' },
  { id: 'mastering', label: 'Mastering' },
  { id: 'video', label: 'Video' },
  { id: 'liveinputs', label: 'Live inputs' },
  { id: 'browser', label: 'Sounds' },
];

function renderBlock(view) {
  switch (view) {
    case 'rack': return <ChannelRack />;
    case 'piano': return <PianoRoll />;
    case 'playlist': return <Playlist />;
    case 'drums': return <DrumMachine />;
    case 'automation': return <Automation />;
    case 'mixer': return <Mixer />;
    case 'mastering': return <MasteringView />;
    case 'video': return <VideoPanel />;
    case 'liveinputs': return <LiveInputsPanel />;
    case 'browser': return <Browser />;
    default: return null;
  }
}

// Ready-made layouts for common jobs — a starting point you can customise.
const PRESETS = {
  Prod: { cols: 3, panels: ['browser', 'rack', 'piano', 'drums', 'mixer', 'mastering'] },
  Beatmaking: { cols: 2, panels: ['browser', 'rack', 'drums', 'mixer'] },
  Melody: { cols: 2, panels: ['piano', 'rack', 'mixer', 'automation'] },
  Mix: { cols: 2, panels: ['mixer', 'automation'] },
  Master: { cols: 2, panels: ['mastering', 'mixer'] },
  Film: { cols: 2, panels: ['video', 'piano', 'playlist', 'mixer'] },
  Live: { cols: 2, panels: ['liveinputs', 'mixer', 'rack'] },
};

const DEF_H = 360;
const KEY = 'btz.workspace.v2';
const TKEY = 'btz.workspace.templates';

function load() { if (typeof window === 'undefined') return null; try { return JSON.parse(window.localStorage.getItem(KEY)); } catch (e) { return null; } }
function save(data) { if (typeof window === 'undefined') return; try { window.localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* noop */ } }
function loadTemplates() { if (typeof window === 'undefined') return []; try { return JSON.parse(window.localStorage.getItem(TKEY)) || []; } catch (e) { return []; } }
function saveTemplates(list) { if (typeof window === 'undefined') return; try { window.localStorage.setItem(TKEY, JSON.stringify(list)); } catch (e) { /* noop */ } }

const toPanels = (arr) => arr.map((p) => (typeof p === 'string'
  ? { key: uid('ws'), view: p, span: 1, h: DEF_H }
  : { key: uid('ws'), view: p.view, span: p.span || 1, h: p.h || DEF_H }));

export default function WorkspacePanel() {
  const stored = load();
  const [panels, setPanels] = useState(() => (stored && stored.panels
    ? toPanels(stored.panels)
    : toPanels(['rack', 'piano', 'mixer'])));
  const [cols, setCols] = useState((stored && stored.cols) || 2);
  const [templates, setTemplates] = useState(() => loadTemplates());
  const drag = useRef(null);
  const [over, setOver] = useState(-1);

  useEffect(() => {
    save({ cols, panels: panels.map((p) => ({ view: p.view, span: p.span, h: p.h })) });
  }, [panels, cols]);

  const patch = (i, p) => setPanels((list) => list.map((x, idx) => (idx === i ? { ...x, ...p } : x)));
  const remove = (i) => setPanels((list) => list.filter((_, idx) => idx !== i));
  const add = () => setPanels((list) => [...list, { key: uid('ws'), view: 'mixer', span: 1, h: DEF_H }]);

  const applyLayout = (cfg) => { setCols(cfg.cols); setPanels(toPanels(cfg.panels)); };

  const saveAsTemplate = () => {
    const name = window.prompt('Name this layout template');
    if (!name) return;
    const cfg = { name, cols, panels: panels.map((p) => ({ view: p.view, span: p.span, h: p.h })) };
    const next = [...templates.filter((t) => t.name !== name), cfg];
    setTemplates(next); saveTemplates(next);
  };
  const deleteTemplate = (name) => {
    const next = templates.filter((t) => t.name !== name);
    setTemplates(next); saveTemplates(next);
  };

  const onDrop = (i) => {
    const from = drag.current; drag.current = null; setOver(-1);
    if (from == null || from === i) return;
    setPanels((list) => { const a = [...list]; const [m] = a.splice(from, 1); a.splice(i, 0, m); return a; });
  };

  // Drag the block's edges/corner to resize — right = width (columns),
  // bottom = height, corner = both.
  const gridRef = useRef(null);
  const startResize = (i, mode, e) => {
    e.preventDefault(); e.stopPropagation();
    const gw = gridRef.current ? gridRef.current.clientWidth : 0;
    const colW = gw ? (gw - (cols - 1) * 12) / cols : 0;
    const startX = e.clientX; const startY = e.clientY;
    const startH = panels[i].h; const startSpan = panels[i].span;
    const move = (ev) => {
      if (mode.indexOf('h') >= 0) patch(i, { h: clamp(Math.round(startH + (ev.clientY - startY)), 200, 1200) });
      if (mode.indexOf('w') >= 0 && colW) patch(i, { span: clamp(startSpan + Math.round((ev.clientX - startX) / colW), 1, cols) });
    };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <div className={s.panel}>
      <div className={s.panelHead}>
        <span className={s.panelTitle}>Workspace</span>
        <div className={s.group}>
          <span className={s.dim}>Presets</span>
          {Object.keys(PRESETS).map((name) => (
            <button key={name} type="button" className={s.btn} onClick={() => applyLayout(PRESETS[name])}>{name}</button>
          ))}
        </div>
        <div className={s.group}>
          <span className={s.dim}>Templates</span>
          <select
            className={s.select}
            value=""
            onChange={(e) => { const t = templates.find((x) => x.name === e.target.value); if (t) applyLayout(t); e.target.value = ''; }}
          >
            <option value="">{templates.length ? 'Load…' : 'None saved'}</option>
            {templates.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
          </select>
          <button type="button" className={s.btn} onClick={saveAsTemplate}>Save layout…</button>
          {templates.length > 0 && (
            <select className={s.select} value="" onChange={(e) => { if (e.target.value) deleteTemplate(e.target.value); e.target.value = ''; }}>
              <option value="">Delete…</option>
              {templates.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
            </select>
          )}
        </div>
        <div className={s.group}>
          <span className={s.dim}>Columns</span>
          {[1, 2, 3].map((n) => (
            <button key={n} type="button" className={cols === n ? `${s.btn} ${s.on}` : s.btn} onClick={() => setCols(n)}>{n}</button>
          ))}
        </div>
        <div className={s.spacer} />
        <button type="button" className={`${s.btn} ${s.on}`} onClick={add}>＋ Block</button>
      </div>

      <div className={s.wsGrid} ref={gridRef} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {panels.map((p, i) => (
          <div
            key={p.key}
            className={over === i ? `${s.wsCard} ${s.wsCardOver}` : s.wsCard}
            style={{ gridColumn: `span ${Math.min(p.span, cols)}`, height: `${p.h}px` }}
            onDragOver={(e) => { e.preventDefault(); if (over !== i) setOver(i); }}
            onDrop={() => onDrop(i)}
          >
            <div
              className={s.wsCardHead}
              draggable
              onDragStart={() => { drag.current = i; }}
              onDragEnd={() => { drag.current = null; setOver(-1); }}
              title="Drag to move this block"
            >
              <span className={s.wsGrip} aria-hidden="true">⠿</span>
              <select className={s.select} value={p.view} onChange={(e) => patch(i, { view: e.target.value })} onDragStart={(e) => e.preventDefault()}>
                {BLOCKS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
              </select>
              <div className={s.spacer} />
              <span className={s.wsCtl} title="Width (columns)">
                <button type="button" className={s.wsMini} onClick={() => patch(i, { span: clamp(p.span - 1, 1, 3) })}>◄</button>
                <span className={s.wsCtlVal}>{Math.min(p.span, cols)}w</span>
                <button type="button" className={s.wsMini} onClick={() => patch(i, { span: clamp(p.span + 1, 1, 3) })}>►</button>
              </span>
              <span className={s.wsCtl} title="Height">
                <button type="button" className={s.wsMini} onClick={() => patch(i, { h: clamp(p.h - 80, 200, 900) })}>−</button>
                <span className={s.wsCtlVal}>{p.h}</span>
                <button type="button" className={s.wsMini} onClick={() => patch(i, { h: clamp(p.h + 80, 200, 900) })}>+</button>
              </span>
              <button type="button" className={s.xBtn} title="Remove block" onClick={() => remove(i)}>×</button>
            </div>
            <div className={s.wsCardBody}>{renderBlock(p.view)}</div>
            <span className={s.wsResizeR} onPointerDown={(e) => startResize(i, 'w', e)} title="Drag to resize width" />
            <span className={s.wsResizeB} onPointerDown={(e) => startResize(i, 'h', e)} title="Drag to resize height" />
            <span className={s.wsResizeBR} onPointerDown={(e) => startResize(i, 'wh', e)} title="Drag to resize" />
          </div>
        ))}
        {!panels.length && (
          <div className={s.helpBox}>No blocks. Press ＋ Block or pick a preset above.</div>
        )}
      </div>
    </div>
  );
}
