import React, { useEffect, useRef, useState } from 'react';
import s from '../../styles/studio.module.css';
import { uid } from '../../lib/studio/constants';
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

// The blocks a workspace slot can show. 'workspace' itself is excluded to avoid
// nesting the container inside itself.
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
const LABELS = BLOCKS.reduce((a, b) => { a[b.id] = b.label; return a; }, {});

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

// Ready-made layouts for common jobs — a starting point you can then customise.
const PRESETS = {
  Beatmaking: { cols: 2, panels: ['browser', 'rack', 'drums', 'mixer'] },
  Melody: { cols: 2, panels: ['piano', 'rack', 'mixer', 'automation'] },
  Mixing: { cols: 2, panels: ['mixer', 'mastering'] },
  Film: { cols: 2, panels: ['video', 'piano', 'playlist', 'mixer'] },
};

const KEY = 'btz.workspace.v1';
function load() {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(window.localStorage.getItem(KEY)); } catch (e) { return null; }
}
function save(data) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* noop */ }
}

export default function WorkspacePanel() {
  const stored = load();
  const [panels, setPanels] = useState(() => (stored && stored.panels
    ? stored.panels.map((view) => ({ key: uid('ws'), view }))
    : [{ key: uid('ws'), view: 'rack' }, { key: uid('ws'), view: 'piano' }, { key: uid('ws'), view: 'mixer' }]));
  const [cols, setCols] = useState((stored && stored.cols) || 2);
  const drag = useRef(null);
  const [over, setOver] = useState(-1);

  useEffect(() => { save({ panels: panels.map((p) => p.view), cols }); }, [panels, cols]);

  const setView = (i, view) => setPanels((p) => p.map((x, idx) => (idx === i ? { ...x, view } : x)));
  const remove = (i) => setPanels((p) => p.filter((_, idx) => idx !== i));
  const add = () => setPanels((p) => [...p, { key: uid('ws'), view: 'mixer' }]);
  const applyPreset = (name) => {
    const pr = PRESETS[name];
    if (!pr) return;
    setCols(pr.cols);
    setPanels(pr.panels.map((view) => ({ key: uid('ws'), view })));
  };

  const onDrop = (i) => {
    const from = drag.current;
    drag.current = null;
    setOver(-1);
    if (from == null || from === i) return;
    setPanels((p) => {
      const a = [...p];
      const [m] = a.splice(from, 1);
      a.splice(i, 0, m);
      return a;
    });
  };

  return (
    <div className={s.panel}>
      <div className={s.panelHead}>
        <span className={s.panelTitle}>Workspace</span>
        <span className={s.dim}>build your own layout — drag blocks to reorder</span>
        <div className={s.group}>
          <span className={s.dim}>Presets</span>
          {Object.keys(PRESETS).map((name) => (
            <button key={name} type="button" className={s.btn} onClick={() => applyPreset(name)}>{name}</button>
          ))}
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

      <div className={s.wsGrid} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {panels.map((p, i) => (
          <div
            key={p.key}
            className={over === i ? `${s.wsCard} ${s.wsCardOver}` : s.wsCard}
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
              <select
                className={s.select}
                value={p.view}
                onChange={(e) => setView(i, e.target.value)}
                onDragStart={(e) => e.preventDefault()}
              >
                {BLOCKS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
              </select>
              <div className={s.spacer} />
              <button type="button" className={s.xBtn} title="Ta bort blocket" onClick={() => remove(i)}>×</button>
            </div>
            <div className={s.wsCardBody}>{renderBlock(p.view)}</div>
          </div>
        ))}
        {!panels.length && (
          <div className={s.helpBox}>No blocks. Press ＋ Block or pick a preset above.</div>
        )}
      </div>
    </div>
  );
}
