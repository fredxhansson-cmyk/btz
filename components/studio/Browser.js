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
        title="Preview"
        onPointerDown={(e) => { e.stopPropagation(); engine.previewSound(sound); }}
      >▸</button>
      <button
        type="button"
        className={s.soundName}
        onClick={() => {
          dispatch({ type: 'sound.add', sound });
          engine.previewSound(sound);
          setHint(`${sound.name} added as a channel.`);
          setUi({ view: 'rack', browserOpen: false });
        }}
        title={`Add ${sound.name}${sound.tags && sound.tags.length ? ` · ${sound.tags.join(', ')}` : ''}`}
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
  const aiSounds = useMemo(() => userSounds.filter((x) => (x.tags || []).includes('ai')), [userSounds]);
  const mySounds = useMemo(() => userSounds.filter((x) => !(x.tags || []).includes('ai')), [userSounds]);

  const dropUser = (id) => { setUserSounds(removeUserSound(id)); };

  return (
    <aside className={s.side}>
      <div className={s.sideTop}>
        <input
          className={s.search}
          placeholder="Search sounds, e.g. 808, pad, acid…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && <button type="button" className={s.xBtn} onClick={() => setQuery('')}>×</button>}
      </div>

      {!query && (
        <div className={s.genreRow}>
          {['808', 'trap', 'house', 'techno', 'lofi', 'edm', 'organic', 'latin', 'ambient', 'acid'].map((g) => (
            <button key={g} type="button" className={s.chip} onClick={() => setQuery(g)}>{g}</button>
          ))}
        </div>
      )}

      {query ? (
        <div className={s.sideList}>
          <div className={s.sideCaption}>{results.length} matches</div>
          {results.map((sd) => <SoundRow key={sd.id} sound={sd} onRemove={sd.user ? dropUser : null} />)}
          {!results.length && <div className={s.helpBox}>No sounds matched.</div>}
        </div>
      ) : (
        <>
          <Section title="Drums" defaultOpen count={DRUM_SOUNDS.length}>
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

          <Section title="AI sounds" count={aiSounds.length}>
            {aiSounds.map((sd) => <SoundRow key={sd.id} sound={sd} onRemove={dropUser} />)}
            {!aiSounds.length && (
              <div className={s.helpBox}>
                Open <b>FLOW Brain</b> and generate sounds — the ones you save land here and
                the library grows the more you use the app.
              </div>
            )}
          </Section>

          <Section title="My sounds" count={mySounds.length}>
            {mySounds.map((sd) => <SoundRow key={sd.id} sound={sd} onRemove={dropUser} />)}
            {!mySounds.length && (
              <div className={s.helpBox}>Tweak a sound and press "Save sound" in the instrument panel.</div>
            )}
          </Section>

          <Section title="Drum kits" count={KITS.length}>
            {KITS.map((k) => (
              <button
                key={k.id}
                type="button"
                className={project.kit === k.id ? `${s.sideItem} ${s.sel}` : s.sideItem}
                title={k.desc}
                onClick={() => {
                  dispatch({ type: 'kit.apply', kitId: k.id });
                  setHint(`Kit "${k.name}" loaded — ${k.desc}`);
                  setUi({ view: 'drums', browserOpen: false });
                }}
              >
                <span className={s.swatch} style={{ background: '#ff8a1f' }} />
                <span className={s.laneText}>{k.name}</span>
              </button>
            ))}
          </Section>

          <Section title="Sound engines" count={INSTRUMENT_LIST.length}>
            {INSTRUMENT_LIST.map((inst) => (
              <button
                key={inst.id}
                type="button"
                className={s.sideItem}
                onClick={() => {
                  dispatch({ type: 'sound.add', sound: { inst: inst.id, name: inst.name, params: defaultParams(inst.id), cat: inst.cat } });
                  setHint(`${inst.name} added with default settings.`);
                  setUi({ view: 'rack', browserOpen: false });
                }}
              >
                <span className={s.swatch} style={{ background: inst.color }} />
                <span className={s.laneText}>{inst.name}</span>
              </button>
            ))}
          </Section>

          <Section title="Patterns" defaultOpen count={project.patterns.length}>
            {project.patterns.map((p) => (
              <div key={p.id} className={p.id === project.activePattern ? `${s.sideItem} ${s.sel}` : s.sideItem}>
                <button
                  type="button"
                  className={s.sideItemMain}
                  onClick={() => dispatch({ type: 'pattern.select', id: p.id })}
                  onDoubleClick={() => {
                    const name = window.prompt('Pattern name', p.name);
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
              + New pattern
            </button>
          </Section>

          <Section title="Templates" count={TEMPLATES.length}>
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={s.sideItem}
                onClick={() => {
                  if (window.confirm(`Load the template "${t.name}"? The current project will be replaced.`)) {
                    loadTemplate(t.id);
                    setUi({ browserOpen: false });
                  }
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
              <div className={s.helpBox}>Drag an audio file here to create a sampler channel.</div>
            )}
          </Section>

          <Section title="MIDI" count={midiInputs ? midiInputs.length : 0}>
            {midiInputs && midiInputs.length ? midiInputs.map((m) => (
              <div key={m.id} className={s.sideItem}>
                <span className={s.swatch} style={{ background: '#7ee787' }} />
                <span className={s.laneText}>{m.name}</span>
              </div>
            )) : (
              <div className={s.helpBox}>No MIDI devices connected.</div>
            )}
          </Section>

          <Section title="Help">
            <div className={s.helpBox}>
              <p><b>F5</b> Playlist · <b>F6</b> Rack · <b>F7</b> Piano</p>
              <p><b>F8</b> Drums · <b>F9</b> Mixer · <b>F10</b> Automation</p>
              <p><b>?</b> all keyboard shortcuts</p>
              <p>Octave: {ui.octave}</p>
            </div>
          </Section>
        </>
      )}
    </aside>
  );
}
