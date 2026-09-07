import React from 'react';
import s from '../../styles/studio.module.css';
import { useStudio } from '../../lib/studio/StudioContext';
import { patternTicks } from '../../lib/studio/sequencer';
import { keyName } from '../../lib/studio/constants';

// Read-only staff-notation view of the selected channel's pattern — opens the
// education/composer segment. Notes are placed by pitch (diatonic staff steps)
// and time; sharps get a ♯. A foundation: viewing today, editing next.
const DIATONIC = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
const SHARP = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
const staffStep = (key) => (Math.floor(key / 12) - 4) * 7 + DIATONIC[key % 12]; // C4 = 0

export default function Notation() {
  const { project, dispatch } = useStudio();
  const pattern = project.patterns.find((p) => p.id === project.activePattern) || project.patterns[0];
  const channel = project.channels.find((c) => c.id === project.selectedChannel) || project.channels[0];
  const notes = (pattern && channel && pattern.notes && pattern.notes[channel.id]) || [];
  const plen = pattern ? Math.max(1, patternTicks(pattern)) : 1;

  const GAP = 12;           // half a staff-line spacing (per diatonic step)
  const H = 260;
  const midY = 120;         // y for B4 (middle staff line) ~ step 6
  const yOf = (key) => midY - (staffStep(key) - 6) * GAP; // B4(step6) on the middle line
  const W = Math.max(760, Math.ceil(plen / (project.barTicks || 1)) * 220);
  const PAD = 70;
  const xOf = (t) => PAD + (t / plen) * (W - PAD - 30);

  // treble staff lines = steps 2,4,6,8,10 (E4,G4,B4,D5,F5)
  const staffLines = [2, 4, 6, 8, 10].map((st) => midY - (st - 6) * GAP);

  const barCount = Math.max(1, Math.round(plen / (project.barTicks || plen)));

  return (
    <div className={s.panel}>
      <div className={s.plToolbar}>
        <div className={s.plRow}>
          <span className={s.panelTitle}>Notation</span>
          <span className={s.dim}>Pattern</span>
          <select className={s.select} value={pattern ? pattern.id : ''} onChange={(e) => dispatch({ type: 'pattern.select', id: e.target.value })}>
            {project.patterns.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <span className={s.dim}>Channel</span>
          <select className={s.select} value={channel ? channel.id : ''} onChange={(e) => dispatch({ type: 'select.channel', id: e.target.value })}>
            {project.channels.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className={s.plMeta}>{notes.length} notes · {barCount} bar{barCount > 1 ? 's' : ''} · read-only</div>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 20, background: 'var(--stage)' }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '20px 10px', minWidth: '100%', width: W }}>
          <svg width={W} height={H} style={{ display: 'block' }}>
            {/* staff lines */}
            {staffLines.map((y, i) => <line key={i} x1={20} y1={y} x2={W - 20} y2={y} stroke="var(--line-3)" strokeWidth="1" />)}
            {/* clef */}
            <text x={26} y={midY + 24} fontSize="64" fill="var(--text-2)" fontFamily="serif">&#x1D11E;</text>
            {/* barlines */}
            {Array.from({ length: barCount + 1 }, (_, b) => {
              const x = xOf(b * (project.barTicks || plen));
              return <line key={`bl${b}`} x1={x} y1={staffLines[0]} x2={x} y2={staffLines[4]} stroke="var(--line-2)" strokeWidth="1" />;
            })}
            {/* notes */}
            {notes.map((n, i) => {
              const x = xOf(n.t);
              const y = yOf(n.k);
              const sharp = SHARP[n.k % 12];
              const w = Math.max(6, Math.min(28, (n.d / plen) * (W - PAD - 30)));
              const ledger = [];
              // ledger lines above/below the staff
              for (let st = 12; staffStep(n.k) >= st; st += 2) ledger.push(midY - (st - 6) * GAP);
              for (let st = 0; staffStep(n.k) <= st; st -= 2) ledger.push(midY - (st - 6) * GAP);
              return (
                <g key={i}>
                  {ledger.map((ly, li) => <line key={li} x1={x - 12} y1={ly} x2={x + 12} y2={ly} stroke="var(--line-3)" strokeWidth="1" />)}
                  {sharp ? <text x={x - 18} y={y + 5} fontSize="18" fill="var(--text-2)">&#9839;</text> : null}
                  <ellipse cx={x} cy={y} rx={7} ry={5} fill={channel ? channel.color : 'var(--accent)'} transform={`rotate(-18 ${x} ${y})`} />
                  <line x1={x + 6} y1={y} x2={x + 6} y2={y - 34} stroke="var(--text-2)" strokeWidth="1.5" />
                  <rect x={x} y={y + 8} width={w} height="2" rx="1" fill={channel ? channel.color : 'var(--accent)'} opacity="0.35" />
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}
