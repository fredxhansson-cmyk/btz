import React from 'react';
import s from '../../styles/studio.module.css';

const GROUPS = [
  {
    title: 'Transport',
    rows: [
      ['Mellanslag', 'Spela / stoppa'],
      ['R', 'Aktivera inspelning (via knappen)'],
      ['Klick i linjalen', 'Spela fran den takten'],
      ['Shift + dra i playlistens linjal', 'Satt loopregion'],
    ],
  },
  {
    title: 'Vyer',
    rows: [
      ['F5', 'Playlist'],
      ['F6', 'Channel Rack'],
      ['F7', 'Piano Roll'],
      ['F8', 'Trummaskin'],
      ['F9', 'Mixer'],
      ['F10', 'Automation'],
      ['?', 'Denna hjalp'],
    ],
  },
  {
    title: 'Piano Roll',
    rows: [
      ['Klick / dra', 'Rita not, dra hogerkanten for langd'],
      ['Ctrl + dra', 'Marquee-markering'],
      ['Ctrl+C / X / V / D', 'Kopiera / klipp / klistra / duplicera'],
      ['Ctrl+A', 'Markera allt'],
      ['Ctrl+Q', 'Kvantisera markering'],
      ['Pil upp/ner', 'Transponera (Shift = oktav)'],
      ['Pil vanster/hoger', 'Flytta i tid'],
      ['Delete', 'Ta bort markerade noter'],
    ],
  },
  {
    title: 'Trummaskin',
    rows: [
      ['Z X C V / A S D F / Q W E R', 'Spela pads'],
      ['Klick', 'Traff pa/av'],
      ['Shift + klick', 'Accent'],
      ['Dra upp/ner', 'Velocity'],
      ['Hogerklick', 'Roll (2-4 traffar)'],
    ],
  },
  {
    title: 'Ovrigt',
    rows: [
      ['Ctrl+Z / Ctrl+Y', 'Angra / gor om'],
      ['Ctrl+S', 'Spara projektfil'],
      ['Z S X D C V G B H N J M', 'Piano, nedre oktaven'],
      ['Q 2 W 3 E R 5 T 6 Y 7 U', 'Piano, ovre oktaven'],
      ['Pil upp/ner (utan markering)', 'Byt oktav'],
      ['Dra in ljudfiler', 'Skapar sampler-kanaler'],
      ['Ctrl + hjul', 'Zooma i piano roll och playlist'],
    ],
  },
];

export default function HelpOverlay({ onClose }) {
  return (
    <div className={s.modalBack} onPointerDown={onClose}>
      <div className={s.modal} onPointerDown={(e) => e.stopPropagation()}>
        <div className={s.modalHead}>
          <span className={s.pluginTitle}>Kortkommandon</span>
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
