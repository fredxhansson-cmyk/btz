import React, { useState } from 'react';
import s from '../../styles/studio.module.css';
import { useStudio } from '../../lib/studio/StudioContext';
import { INSTRUMENT_LIST } from '../../lib/studio/audio/instruments';
import { patternTicks } from '../../lib/studio/sequencer';
import { BAR_TICKS } from '../../lib/studio/constants';

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={s.sideSec}>
      <button type="button" className={s.sideHead} onClick={() => setOpen((o) => !o)}>
        <span className={s.caret}>{open ? '▾' : '▸'}</span>{title}
      </button>
      {open && <div className={s.sideList}>{children}</div>}
    </div>
  );
}

export default function Browser() {
  const { project, dispatch, setUi, setHint, ui, midiInputs, loadSampleFile } = useStudio();

  const cats = INSTRUMENT_LIST.reduce((acc, inst) => {
    (acc[inst.cat] = acc[inst.cat] || []).push(inst);
    return acc;
  }, {});

  return (
    <aside className={s.side}>
      <div className={s.sideTitle}>Browser</div>

      {Object.entries(cats).map(([cat, list]) => (
        <Section key={cat} title={cat}>
          {list.map((inst) => (
            <button
              key={inst.id}
              type="button"
              className={s.sideItem}
              onClick={() => {
                dispatch({ type: 'channel.add', inst: inst.id, name: inst.name });
                setHint(`${inst.name} tillagd i Channel Rack.`);
                setUi({ view: 'rack' });
              }}
              title={`Lagg till ${inst.name}`}
            >
              <span className={s.swatch} style={{ background: inst.color }} />
              {inst.name}
            </button>
          ))}
        </Section>
      ))}

      <Section title="Patterns">
        {project.patterns.map((p) => (
          <div key={p.id} className={p.id === project.activePattern ? `${s.sideItem} ${s.sel}` : s.sideItem}>
            <button
              type="button"
              className={s.sideItemMain}
              onClick={() => dispatch({ type: 'pattern.select', id: p.id })}
              onDoubleClick={() => {
                const name = window.prompt('Monstrets namn', p.name);
                if (name) dispatch({ type: 'pattern.update', id: p.id, patch: { name } });
              }}
            >
              <span className={s.swatch} style={{ background: p.color }} />
              {p.name}
              <span className={s.dim}>{patternTicks(p) / BAR_TICKS}b</span>
            </button>
            <button
              type="button"
              className={s.xBtn}
              title="Ta bort monster"
              onClick={() => dispatch({ type: 'pattern.remove', id: p.id })}
            >×</button>
          </div>
        ))}
        <button type="button" className={s.sideAdd} onClick={() => dispatch({ type: 'pattern.add' })}>
          + Nytt monster
        </button>
      </Section>

      <Section title="Samples" defaultOpen={false}>
        {Object.values(project.samples || {}).map((sm) => {
          const used = project.channels.filter((c) => c.sampleId === sm.id);
          return (
            <div key={sm.id} className={s.sideItem}>
              <span className={s.swatch} style={{ background: '#ffd8a8' }} />
              <span className={s.laneText}>{sm.name}</span>
              <span className={s.dim}>{(sm.bytes / 1024).toFixed(0)}kB{used.length ? '' : ' ·oanvand'}</span>
            </div>
          );
        })}
        {!Object.keys(project.samples || {}).length && (
          <div className={s.helpBox}>Dra en ljudfil hit (eller var som helst i studion) for att skapa en sampler-kanal.</div>
        )}
      </Section>

      <Section title="MIDI" defaultOpen={false}>
        {midiInputs && midiInputs.length ? midiInputs.map((m) => (
          <div key={m.id} className={s.sideItem}>
            <span className={s.swatch} style={{ background: '#7ee787' }} />
            <span className={s.laneText}>{m.name}</span>
          </div>
        )) : (
          <div className={s.helpBox}>Inga MIDI-enheter anslutna. Koppla in ett keyboard och ladda om sidan.</div>
        )}
      </Section>

      <Section title="Hjalp" defaultOpen={false}>
        <div className={s.helpBox}>
          <p><b>F5</b> Playlist &nbsp; <b>F6</b> Channel Rack</p>
          <p><b>F7</b> Piano Roll &nbsp; <b>F9</b> Mixer</p>
          <p><b>Mellanslag</b> play/stopp</p>
          <p><b>Ctrl+Z / Ctrl+Y</b> angra / gor om</p>
          <p><b>Z S X D C...</b> spelar vald kanal</p>
          <p><b>Hoger-klick</b> tar bort noter/klipp</p>
          <p>Oktav: {ui.octave} (piltangenter upp/ner)</p>
        </div>
      </Section>
    </aside>
  );
}
