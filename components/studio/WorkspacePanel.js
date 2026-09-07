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

const DEF_W = 440;
const DEF_H = 320;

// Ready-made layouts — a starting point you can drag/resize however you like.
const PRESETS = {
  Prod: ['browser', 'rack', 'piano', 'drums', 'mixer', 'mastering'],
  Beatmaking: ['browser', 'rack', 'drums', 'mixer'],
  Melody: ['piano', 'rack', 'mixer', 'automation'],
  Mix: ['mixer', 'automation'],
  Master: ['mastering', 'mixer'],
  Film: ['video', 'piano', 'playlist', 'mixer'],
  Live: ['liveinputs', 'mixer', 'rack'],
};

const KEY = 'btz.workspace.v3';
const TKEY = 'btz.workspace.templates';

function load() { if (typeof window === 'undefined') return null; try { return JSON.parse(window.localStorage.getItem(KEY)); } catch (e) { return null; } }
function save(data) { if (typeof window === 'undefined') return; try { window.localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* noop */ } }
function loadTemplates() { if (typeof window === 'undefined') return []; try { return JSON.parse(window.localStorage.getItem(TKEY)) || []; } catch (e) { return []; } }
function saveTemplates(list) { if (typeof window === 'undefined') return; try { window.localStorage.setItem(TKEY, JSON.stringify(list)); } catch (e) { /* noop */ } }

// Turn a list (of view-ids or full {view,x,y,w,h} objects) into positioned blocks.
const toPanels = (arr) => (arr || []).map((p, i) => {
  const obj = typeof p === 'string' ? { view: p } : p;
  const col = i % 2;
  const row = Math.floor(i / 2);
  return {
    key: uid('ws'),
    view: obj.view,
    x: obj.x != null ? obj.x : 24 + col * (DEF_W + 20),
    y: obj.y != null ? obj.y : 16 + row * (DEF_H + 20),
    w: obj.w || DEF_W,
    h: obj.h || DEF_H,
    z: obj.z || 1,
  };
});

export default function WorkspacePanel() {
  const stored = load();
  const [panels, setPanels] = useState(() => toPanels(stored && stored.panels ? stored.panels : ['rack', 'piano', 'mixer']));
  const [templates, setTemplates] = useState(() => loadTemplates());
  const zTop = useRef(10);

  useEffect(() => {
    save({ panels: panels.map((p) => ({ view: p.view, x: p.x, y: p.y, w: p.w, h: p.h })) });
  }, [panels]);

  const patch = (key, p) => setPanels((list) => list.map((x) => (x.key === key ? { ...x, ...p } : x)));
  const remove = (key) => setPanels((list) => list.filter((x) => x.key !== key));
  const add = () => setPanels((list) => [...list, { key: uid('ws'), view: 'mixer', x: 48, y: 32, w: DEF_W, h: DEF_H, z: (zTop.current += 1) }]);
  const applyLayout = (arr) => setPanels(toPanels(arr));
  const bringFront = (key) => { zTop.current += 1; patch(key, { z: zTop.current }); };

  const saveAsTemplate = () => {
    const name = window.prompt('Name this layout');
    if (!name) return;
    const cfg = { name, panels: panels.map((p) => ({ view: p.view, x: p.x, y: p.y, w: p.w, h: p.h })) };
    const next = [...templates.filter((t) => t.name !== name), cfg];
    setTemplates(next); saveTemplates(next);
  };

  // Pointer-based move — drag the header to place a block anywhere.
  const startMove = (key, e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    bringFront(key);
    const pnl = panels.find((p) => p.key === key);
    const sx = e.clientX; const sy = e.clientY; const ox = pnl.x; const oy = pnl.y;
    const move = (ev) => patch(key, { x: Math.max(0, ox + (ev.clientX - sx)), y: Math.max(0, oy + (ev.clientY - sy)) });
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // Pointer-based resize — drag right edge (width), bottom edge (height) or corner (both).
  const startResize = (key, mode, e) => {
    e.preventDefault(); e.stopPropagation();
    const pnl = panels.find((p) => p.key === key);
    const sx = e.clientX; const sy = e.clientY; const ow = pnl.w; const oh = pnl.h;
    const move = (ev) => {
      const p = {};
      if (mode.indexOf('w') >= 0) p.w = clamp(ow + (ev.clientX - sx), 260, 1600);
      if (mode.indexOf('h') >= 0) p.h = clamp(oh + (ev.clientY - sy), 180, 1400);
      patch(key, p);
    };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <div className={s.panel}>
      <div className={s.panelHead}>
        <span className={s.panelTitle}>Workspace</span>
        <span className={s.dim}>Presets</span>
        {Object.keys(PRESETS).map((name) => (
          <button key={name} type="button" className={s.btn} onClick={() => applyLayout(PRESETS[name])}>{name}</button>
        ))}
        <div className={s.spacer} />
        {templates.length > 0 && (
          <select className={s.select} value="" onChange={(e) => { const t = templates.find((x) => x.name === e.target.value); if (t) applyLayout(t.panels); e.target.value = ''; }}>
            <option value="">Load layout…</option>
            {templates.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
          </select>
        )}
        <button type="button" className={s.btn} onClick={saveAsTemplate}>Save layout…</button>
        <button type="button" className={`${s.btn} ${s.on}`} onClick={add}>＋ Block</button>
      </div>

      <div className={s.wsCanvas}>
        {panels.map((p) => (
          <div
            key={p.key}
            className={s.wsFloat}
            style={{ left: p.x, top: p.y, width: p.w, height: p.h, zIndex: p.z || 1 }}
            onPointerDown={() => bringFront(p.key)}
          >
            <div className={s.wsCardHead} onPointerDown={(e) => startMove(p.key, e)} title="Drag to move this block">
              <span className={s.wsGrip} aria-hidden="true">⠿</span>
              <select
                className={s.select}
                value={p.view}
                onChange={(e) => patch(p.key, { view: e.target.value })}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {BLOCKS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
              </select>
              <div className={s.spacer} />
              <button type="button" className={s.xBtn} title="Remove block" onClick={() => remove(p.key)} onPointerDown={(e) => e.stopPropagation()}>×</button>
            </div>
            <div className={s.wsCardBody}>{renderBlock(p.view)}</div>
            <span className={s.wsResizeR} onPointerDown={(e) => startResize(p.key, 'w', e)} title="Drag to resize width" />
            <span className={s.wsResizeB} onPointerDown={(e) => startResize(p.key, 'h', e)} title="Drag to resize height" />
            <span className={s.wsResizeBR} onPointerDown={(e) => startResize(p.key, 'wh', e)} title="Drag to resize" />
          </div>
        ))}
        {!panels.length && (
          <div className={s.helpBox} style={{ margin: 24 }}>No blocks. Press ＋ Block or pick a preset above — then drag headers to move and drag edges to resize.</div>
        )}
      </div>
    </div>
  );
}
