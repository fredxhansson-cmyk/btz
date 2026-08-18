import React, { useEffect, useMemo, useState } from 'react';
import s from '../../styles/studio.module.css';
import { useStudio } from '../../lib/studio/StudioContext';
import { INSTRUMENT_LIST, defaultParams } from '../../lib/studio/audio/instruments';
import { patternTicks } from '../../lib/studio/sequencer';
import { BAR_TICKS } from '../../lib/studio/constants';
import { TEMPLATES } from '../../lib/studio/project';
import { KITS } from '../../lib/studio/drums';
import {
  DRUM_SOUNDS, INST_SOUNDS, DRUM_CATS, INST_CATS, searchLibrary,
  soundColor, loadUserSounds, removeUserSound,
} from '../../lib/studio/library';

function Section({ title, children, defaultOpen = false, count }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={s.sideSec}>
      <button type="button" className={s.sideHead} onClick={() => setOpen((o) => !o)}>
        <span className={s.caret}>{open ? '▾' : '▸'}</span>
        {title}
        {count != null && <span className={s.sideCount}>{count}</span>}
      </button>
      {open && <div className={s.sideList}>{children}</div>}
    </div>
  );
}

function SoundRow({ sound, onRemove }) {
  const { dispatch, engine, setHint, setUi } = useStudio();
  return (
    <div className={s.soundRow}>
      <button
        type="button"
        className={s.previewBtn}
        title="Lyssna"
        onPointerDown={(e) => { e.stopPropagation(); engine.previewSound(sound); }}
      >▸</button>
      <button
        type="button"
        className={s.soundName}
        onClick={() => {
          dispatch({ type: 'sound.add', sound });
          engine.previewSound(sound);
          setHint(`${sound.name} tillagd som kanal.`);
          setUi({ view: 'rack' });
        }}
        title={`Lagg till ${sound.name}${sound.tags && sound.tags.length ? ` · ${sound.tags.join(', ')}` : ''}`}
      >
        <span className={s.swatch} style={{ background: soundColor(sound) }} />
        <span className={s.laneText}>{sound.name}</span>
      </button>
      {onRemove && (
        <button type="button" className={s.xBtn} onClick={() => onRemove(sound.id)}>×</button>
      )}
    </div>
  );
}

export default function Browser() {
  const { project, dispatch, setUi, setHint, ui, midiInputs, loadTemplate } = useStudio();
  const [query, setQuery] = useState('');
  const [userSounds, setUserSounds] = useState(() => loadUserSounds());
  useEffect(() => { setUserSounds(loadUserSounds()); }, [ui.soundsVersion]);
  const results = useMemo(() => (query ? searchLibrary(query, userSounds) : []), [query, userSounds]);

  const dropUser = (id) => { setUserSounds(removeUserSound(id)); };

  return (
    <aside className={s.side}>
      <div className={s.sideTop}>
        <input
          className={s.search}
          placeholder="Sok ljud, t.ex. 808, pad, acid…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && <button type="button" className={s.xBtn} onClick={() => setQuery('')}>×</button>}
      </div>

      {query ? (
        <div className={s.sideList}>
          <div className={s.sideCaption}>{results.length} traffar</div>
          {results.map((sd) => <SoundRow key={sd.id} sound={sd} onRemove={sd.user ? dropUser : null} />)}
          {!results.length && <div className={s.helpBox}>Inga ljud matchade.</div>}
        </div>
      ) : (
        <>
          <Section title="Trummor" defaultOpen count={DRUM_SOUNDS.length}>
            {DRUM_CATS.map((cat) => (
              <div key={cat} className={s.catBlock}>
                <div className={s.catLabel}>{cat}</div>
                {DRUM_SOUNDS.filter((sd) => sd.cat === cat).map((sd) => <SoundRow key={sd.id} sound={sd} />)}
              </div>
            ))}
          </Section>

          <Section title="Instrument" count={INST_SOUNDS.length}>
            {INST_CATS.map((cat) => (
              <div key={cat} className={s.catBlock}>
                <div className={s.catLabel}>{cat}</div>
                {INST_SOUNDS.filter((sd) => sd.cat === cat).map((sd) => <SoundRow key={sd.id} sound={sd} />)}
              </div>
            ))}
          </Section>

          <Section title="Mina ljud" count={userSounds.length}>
            {userSounds.map((sd) => <SoundRow key={sd.id} sound={sd} onRemove={dropUser} />)}
            {!userSounds.length && (
              <div className={s.helpBox}>Skruva pa ett ljud och tryck "Spara ljud" i instrumentpanelen.</div>
            )}
          </Section>

          <Section title="Trumkit" count={KITS.length}>
            {KITS.map((k) => (
              <button
                key={k.id}
                type="button"
                className={project.kit === k.id ? `${s.sideItem} ${s.sel}` : s.sideItem}
                title={k.desc}
                onClick={() => {
                  dispatch({ type: 'kit.apply', kitId: k.id });
                  setHint(`Kit "${k.name}" laddat — ${k.desc}`);
                  setUi({ view: 'drums' });
                }}
              >
                <span className={s.swatch} style={{ background: '#ff8a1f' }} />
                <span className={s.laneText}>{k.name}</span>
              </button>
            ))}
          </Section>

          <Section title="Ljudmotorer" count={INSTRUMENT_LIST.length}>
            {INSTRUMENT_LIST.map((inst) => (
              <button
                key={inst.id}
                type="button"
                className={s.sideItem}
                onClick={() => {
                  dispatch({ type: 'sound.add', sound: { inst: inst.id, name: inst.name, params: defaultParams(inst.id), cat: inst.cat } });
                  setHint(`${inst.name} tillagd med grundinstallning.`);
                  setUi({ view: 'rack' });
                }}
              >
                <span className={s.swatch} style={{ background: inst.color }} />
                <span className={s.laneText}>{inst.name}</span>
              </button>
            ))}
          </Section>

          <Section title="Monster" defaultOpen count={project.patterns.length}>
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
                  <span className={s.laneText}>{p.name}</span>
                  <span className={s.dim}>{patternTicks(p) / (project.barTicks || BAR_TICKS)}b</span>
                </button>
                <button
                  type="button"
                  className={s.xBtn}
                  onClick={() => dispatch({ type: 'pattern.remove', id: p.id })}
                >×</button>
              </div>
            ))}
            <button type="button" className={s.sideAdd} onClick={() => dispatch({ type: 'pattern.add' })}>
              + Nytt monster
            </button>
          </Section>

          <Section title="Mallar" count={TEMPLATES.length}>
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={s.sideItem}
                onClick={() => {
                  if (window.confirm(`Ladda mallen "${t.name}"? Nuvarande projekt ersatts.`)) loadTemplate(t.id);
                }}
              >
                <span className={s.swatch} style={{ background: '#ff8a1f' }} />
                <span className={s.laneText}>{t.name}</span>
              </button>
            ))}
          </Section>

          <Section title="Samples" count={Object.keys(project.samples || {}).length}>
            {Object.values(project.samples || {}).map((sm) => (
              <div key={sm.id} className={s.sideItem}>
                <span className={s.swatch} style={{ background: '#ffd8a8' }} />
                <span className={s.laneText}>{sm.name}</span>
                <span className={s.dim}>{(sm.bytes / 1024).toFixed(0)}kB</span>
              </div>
            ))}
            {!Object.keys(project.samples || {}).length && (
              <div className={s.helpBox}>Dra en ljudfil hit for att skapa en sampler-kanal.</div>
            )}
          </Section>

          <Section title="MIDI" count={midiInputs ? midiInputs.length : 0}>
            {midiInputs && midiInputs.length ? midiInputs.map((m) => (
              <div key={m.id} className={s.sideItem}>
                <span className={s.swatch} style={{ background: '#7ee787' }} />
                <span className={s.laneText}>{m.name}</span>
              </div>
            )) : (
              <div className={s.helpBox}>Inga MIDI-enheter anslutna.</div>
            )}
          </Section>

          <Section title="Hjalp">
            <div className={s.helpBox}>
              <p><b>F5</b> Playlist · <b>F6</b> Rack · <b>F7</b> Piano</p>
              <p><b>F8</b> Trummor · <b>F9</b> Mixer · <b>F10</b> Automation</p>
              <p><b>?</b> alla kortkommandon</p>
              <p>Oktav: {ui.octave}</p>
            </div>
          </Section>
        </>
      )}
    </aside>
  );
}
