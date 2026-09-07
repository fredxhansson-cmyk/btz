import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import s from '../../styles/studio.module.css';
import { useStudio } from '../../lib/studio/StudioContext';
import { INSTRUMENT_LIST, defaultParams } from '../../lib/studio/audio/instruments';
import { patternTicks } from '../../lib/studio/sequencer';
import { BAR_TICKS } from '../../lib/studio/constants';
import { TEMPLATES } from '../../lib/studio/project';
import { KITS } from '../../lib/studio/drums';
import {
  DRUM_SOUNDS, INST_SOUNDS, SAMPLE_SOUNDS, DRUM_CATS, INST_CATS, searchLibrary,
  soundColor, loadUserSounds, removeUserSound,
} from '../../lib/studio/library';

function Section({ title, children, defaultOpen = false, count, sub }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={s.sideSec}>
      <button
        type="button"
        className={s.sideHead}
        onClick={() => setOpen((o) => !o)}
        style={sub ? { paddingLeft: 20, fontSize: 11.5, letterSpacing: '.06em', opacity: 0.9, textTransform: 'none' } : undefined}
      >
        <span className={s.caret}>{open ? '▾' : '▸'}</span>
        {title}
        {count != null && <span className={s.sideCount}>{count}</span>}
      </button>
      {open && <div className={s.sideList}>{children}</div>}
    </div>
  );
}

// A group whose categories are each a collapsed subsection, so a big library
// becomes a compact category tree instead of one long scroll.
function CategoryGroup({ title, sounds, cats, defaultOpen = false, extraTop = null }) {
  return (
    <Section title={title} defaultOpen={defaultOpen} count={sounds.length}>
      {extraTop}
      {cats.filter((cat) => sounds.some((sd) => sd.cat === cat)).map((cat) => {
        const items = sounds.filter((sd) => sd.cat === cat);
        return (
          <Section key={cat} title={cat} count={items.length} sub>
            {items.map((sd, i) => <SoundRow key={sd.id} sound={sd} index={i} />)}
          </Section>
        );
      })}
    </Section>
  );
}

function SoundRow({ sound, onRemove, index = 0 }) {
  const { dispatch, engine, setHint, setUi, addSampleSound, replaceInstrument, ui, project } = useStudio();
  const isSample = sound.kind === 'sample';
  const preview = () => (isSample ? engine.previewSampleUrl(sound.url) : engine.previewSound(sound));
  const add = () => {
    // Replace mode: swap the sound on the selected track instead of adding a new one.
    if (ui.pickMode === 'replace' && project.selectedChannel) {
      replaceInstrument(project.selectedChannel, sound);
      return;
    }
    if (isSample) { addSampleSound(sound); return; }
    dispatch({ type: 'sound.add', sound });
    engine.previewSound(sound);
    setHint(`${sound.name} added as a channel.`);
    setUi({ view: 'rack', browserOpen: false });
  };
  return (
    <div className={s.soundRow}>
      <button
        type="button"
        className={s.previewBtn}
        title={`Play ${sound.name}`}
        aria-label={`Play ${sound.name}`}
        onPointerDown={(e) => { e.stopPropagation(); preview(); }}
      >▶</button>
      <button
        type="button"
        className={s.soundName}
        data-soundid={sound.id}
        onClick={add}
        title={`Add ${sound.name}${sound.tags && sound.tags.length ? ` · ${sound.tags.join(', ')}` : ''}`}
      >
        <span className={s.swatch} style={{ background: soundColor(sound, index) }} />
        <span className={s.laneText}>{sound.name}</span>
      </button>
      {onRemove && (
        <button type="button" className={s.xBtn} onClick={() => onRemove(sound.id)}>×</button>
      )}
    </div>
  );
}

export default function Browser() {
  const { project, dispatch, engine, setUi, setHint, ui, midiInputs, loadTemplate } = useStudio();
  const [query, setQuery] = useState('');
  const [userSounds, setUserSounds] = useState(() => loadUserSounds());
  useEffect(() => { setUserSounds(loadUserSounds()); }, [ui.soundsVersion]);
  const results = useMemo(() => (query ? searchLibrary(query, userSounds) : []), [query, userSounds]);
  const aiSounds = useMemo(() => userSounds.filter((x) => (x.tags || []).includes('ai')), [userSounds]);
  const mySounds = useMemo(() => userSounds.filter((x) => !(x.tags || []).includes('ai')), [userSounds]);

  const dropUser = (id) => { setUserSounds(removeUserSound(id)); };
  const selectedName = useMemo(() => {
    const c = project.channels.find((x) => x.id === project.selectedChannel);
    return c ? c.name : '';
  }, [project.channels, project.selectedChannel]);

  // Keyboard browsing: ↑/↓ move a highlight through the currently-shown sound
  // rows (auditioning each), Enter adds the highlighted sound. Operates on the
  // rows in the DOM, so it follows whatever categories are expanded / searched.
  const asideRef = useRef(null);
  const focusRef = useRef(null);
  const soundById = useMemo(() => {
    const m = new Map();
    for (const sd of [...SAMPLE_SOUNDS, ...DRUM_SOUNDS, ...INST_SOUNDS, ...userSounds]) m.set(sd.id, sd);
    return m;
  }, [userSounds]);
  const onKeyNav = useCallback((e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Enter') return;
    const root = asideRef.current;
    if (!root) return;
    const els = Array.from(root.querySelectorAll('[data-soundid]'));
    if (!els.length) return;
    const ids = els.map((el) => el.getAttribute('data-soundid'));
    let idx = focusRef.current ? ids.indexOf(focusRef.current) : -1;
    if (e.key === 'Enter') { if (idx >= 0) { e.preventDefault(); els[idx].click(); } return; }
    e.preventDefault();
    idx = e.key === 'ArrowDown' ? Math.min(ids.length - 1, idx + 1) : Math.max(0, idx < 0 ? 0 : idx - 1);
    els.forEach((el) => el.classList.remove(s.soundNameOn));
    const el = els[idx];
    el.classList.add(s.soundNameOn);
    el.scrollIntoView({ block: 'nearest' });
    focusRef.current = ids[idx];
    const sd = soundById.get(ids[idx]);
    if (sd && engine) { if (sd.kind === 'sample') engine.previewSampleUrl(sd.url); else engine.previewSound(sd); }
  }, [engine, soundById]);

  useEffect(() => { if (asideRef.current) asideRef.current.focus({ preventScroll: true }); }, []);

  return (
    <aside className={s.side} ref={asideRef} tabIndex={0} onKeyDown={onKeyNav}>
      <div className={s.sideTop}>
        <input
          className={s.search}
          placeholder="Search sounds, e.g. 808, pad, acid…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && <button type="button" className={s.xBtn} onClick={() => setQuery('')}>×</button>}
      </div>

      <div className={s.pickModeRow}>
        <span className={s.pickModeLabel}>Picking a sound:</span>
        <button
          type="button"
          className={ui.pickMode === 'replace' ? s.pickModeBtn : `${s.pickModeBtn} ${s.pickModeOn}`}
          onClick={() => setUi({ pickMode: 'new' })}
        >＋ New track</button>
        <button
          type="button"
          className={ui.pickMode === 'replace' ? `${s.pickModeBtn} ${s.pickModeOn}` : s.pickModeBtn}
          onClick={() => setUi({ pickMode: 'replace' })}
          title="Swap the sound on the selected track instead of adding a new one"
        >⟳ Replace {selectedName ? `“${selectedName}”` : 'selected'}</button>
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
          {results.map((sd, i) => <SoundRow key={sd.id} sound={sd} index={i} onRemove={sd.user ? dropUser : null} />)}
          {!results.length && <div className={s.helpBox}>No sounds matched.</div>}
        </div>
      ) : (
        <>
          <CategoryGroup
            title="Real kits — samples (CC0)"
            sounds={SAMPLE_SOUNDS}
            cats={[...DRUM_CATS, ...INST_CATS]}
            defaultOpen
            extraTop={<div className={s.helpBox}>Real recorded instruments — the pro-sounding, non-synth sounds. Free to use commercially (CC0).</div>}
          />

          <CategoryGroup title="Drums — synth" sounds={DRUM_SOUNDS} cats={DRUM_CATS} />

          <CategoryGroup title="Instrument" sounds={INST_SOUNDS} cats={INST_CATS} />

          <Section title="AI sounds" count={aiSounds.length}>
            {aiSounds.map((sd, i) => <SoundRow key={sd.id} sound={sd} index={i} onRemove={dropUser} />)}
            {!aiSounds.length && (
              <div className={s.helpBox}>
                Open <b>Fuse Brain</b> and generate sounds — the ones you save land here and
                the library grows the more you use the app.
              </div>
            )}
          </Section>

          <Section title="My sounds" count={mySounds.length}>
            {mySounds.map((sd, i) => <SoundRow key={sd.id} sound={sd} index={i} onRemove={dropUser} />)}
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
                <span className={s.swatch} style={{ background: 'var(--accent)' }} />
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
                <span className={s.swatch} style={{ background: 'var(--accent)' }} />
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
                <span className={s.swatch} style={{ background: '#85c425' }} />
                <span className={s.laneText}>{m.name}</span>
              </div>
            )) : (
              <div className={s.helpBox}>No MIDI devices connected.</div>
            )}
          </Section>

          <Section title="Help">
            <div className={s.helpBox}>
              <p><b>F5</b> Arrange · <b>F6</b> Instr · <b>F7</b> Piano</p>
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
