import React from 'react';
import s from '../../styles/studio.module.css';

const GROUPS = [
  {
    title: 'Transport',
    rows: [
      ['Space', 'Play / pause (keeps playhead)'],
      ['Stop button', 'Stop and return to start'],
      ['R', 'Arm recording (via the button)'],
      ['Click in the ruler', 'Play from that bar'],
      ['Shift + drag in the playlist ruler', 'Set loop region'],
    ],
  },
  {
    title: 'Views',
    rows: [
      ['F5', 'Arrangement'],
      ['F6', 'Instruments'],
      ['F7', 'Piano Roll'],
      ['F8', 'Drum Machine'],
      ['F9', 'Mixer'],
      ['F10', 'Automation'],
      ['?', 'This help'],
    ],
  },
  {
    title: 'Piano Roll',
    rows: [
      ['Click / drag', 'Draw a note, drag the right edge for length'],
      ['Ctrl + drag', 'Marquee selection'],
      ['Ctrl+C / X / V / D', 'Copy / cut / paste / duplicate'],
      ['Ctrl+A', 'Select all'],
      ['Ctrl+Q', 'Quantize selection'],
      ['Arrow up/down', 'Transpose (Shift = octave)'],
      ['Arrow left/right', 'Move in time'],
      ['Delete', 'Delete selected notes'],
    ],
  },
  {
    title: 'Drum Machine',
    rows: [
      ['Z X C V / A S D F / Q W E R', 'Play pads'],
      ['Click', 'Hit on/off'],
      ['Shift + click', 'Accent'],
      ['Drag up/down', 'Velocity'],
      ['Right-click', 'Roll (2-4 hits)'],
    ],
  },
  {
    title: 'Other',
    rows: [
      ['Ctrl+Z / Ctrl+Y', 'Undo / redo'],
      ['Ctrl+S', 'Save project file'],
      ['Z S X D C V G B H N J M', 'Piano, lower octave'],
      ['Q 2 W 3 E R 5 T 6 Y 7 U', 'Piano, upper octave'],
      ['Arrow up/down (with no selection)', 'Change octave'],
      ['Drag in audio files', 'Creates sampler channels'],
      ['Ctrl + wheel', 'Zoom in the piano roll and playlist'],
    ],
  },
];

export default function HelpOverlay({ onClose }) {
  return (
    <div className={s.modalBack} onPointerDown={onClose}>
      <div className={s.modal} onPointerDown={(e) => e.stopPropagation()}>
        <div className={s.modalHead}>
          <span className={s.pluginTitle}>Keyboard Shortcuts</span>
          <div className={s.spacer} />
          <button type="button" className={s.xBtn} onClick={onClose}>×</button>
        </div>
        <div className={s.modalBody}>
          {GROUPS.map((g) => (
            <div key={g.title} className={s.helpCol}>
              <h4 className={s.helpTitle}>{g.title}</h4>
              {g.rows.map(([k, v]) => (
                <div key={k} className={s.helpRow}>
                  <kbd className={s.kbd}>{k}</kbd>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
