import React, { useState } from 'react';
import s from '../../styles/studio.module.css';
import { useStudio } from '../../lib/studio/StudioContext';
import {
  getArtistName, setArtistName, setThemePref, resetStudio,
} from '../../lib/studio/settings';
import AuthArea from '../AuthArea';

const CLERK = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

function Row({ label, hint, children }) {
  return (
    <div className={s.setRow}>
      <div className={s.setLabel}>
        <span>{label}</span>
        {hint && <span className={s.setHint}>{hint}</span>}
      </div>
      <div className={s.setControl}>{children}</div>
    </div>
  );
}

const SNAP_OPTIONS = ['1/4', '1/8', '1/16', '1/32', '1/3', '1/6'];

export default function Settings({ onClose, onReplayTour }) {
  const { ui, setUi, project, dispatch, setHint } = useStudio();
  const [name, setName] = useState(() => getArtistName());

  const setTheme = (theme) => { setUi({ theme }); setThemePref(theme); };
  const saveName = (v) => { setName(v); setArtistName(v); };
  const countIn = project.countIn || 0;

  const doReset = (clearPrefs) => {
    const msg = clearPrefs
      ? 'Reset everything? This clears your saved project, learned AI and your name/theme. This cannot be undone.'
      : 'Start fresh? This clears the current autosaved project (your name and theme are kept). This cannot be undone.';
    if (!window.confirm(msg)) return;
    resetStudio({ clearPrefs });
    window.location.reload();
  };

  return (
    <div className={s.modalBack} onPointerDown={onClose}>
      <div className={`${s.modal} ${s.settingsModal}`} onPointerDown={(e) => e.stopPropagation()}>
        <div className={s.modalHead}>
          <span className={s.pluginTitle}>⚙ Settings</span>
          <div className={s.spacer} />
          <button type="button" className={s.xBtn} onClick={onClose}>×</button>
        </div>

        <div className={s.settingsBody}>
          {/* -------------------------------------------------------- user */}
          <section className={s.setSection}>
            <h4 className={s.setSectionTitle}>User</h4>

            <Row label="Artist / producer name" hint="Shown in the app and used to name your exports.">
              <input
                className={s.setInput}
                value={name}
                placeholder="e.g. Your name"
                onChange={(e) => saveName(e.target.value)}
              />
            </Row>

            <Row label="Appearance" hint="Light or dark studio theme.">
              <div className={s.segRow}>
                <button
                  type="button"
                  className={ui.theme !== 'light' ? `${s.segBtn} ${s.on}` : s.segBtn}
                  onClick={() => setTheme('dark')}
                >🌙 Dark</button>
                <button
                  type="button"
                  className={ui.theme === 'light' ? `${s.segBtn} ${s.on}` : s.segBtn}
                  onClick={() => setTheme('light')}
                >☀ Light</button>
              </div>
            </Row>

            <Row label="Account" hint={CLERK ? 'Sign in to sync across devices.' : 'Accounts are not enabled on this deployment.'}>
              {CLERK ? <AuthArea className={s.btn} /> : <span className={s.dim}>—</span>}
            </Row>
          </section>

          {/* ----------------------------------------------------- program */}
          <section className={s.setSection}>
            <h4 className={s.setSectionTitle}>Program</h4>

            <Row label="Metronome" hint="Click track while playing and recording.">
              <button
                type="button"
                className={ui.metronome ? `${s.segBtn} ${s.on}` : s.segBtn}
                onClick={() => setUi({ metronome: !ui.metronome })}
              >{ui.metronome ? 'On' : 'Off'}</button>
            </Row>

            <Row label="Count-in" hint="Bars counted before recording starts.">
              <div className={s.segRow}>
                {[0, 1, 2].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={countIn === n ? `${s.segBtn} ${s.on}` : s.segBtn}
                    onClick={() => dispatch({ type: 'patch', patch: { countIn: n } })}
                  >{n === 0 ? 'Off' : `${n} bar${n > 1 ? 's' : ''}`}</button>
                ))}
              </div>
            </Row>

            <Row label="Default snap" hint="Grid notes snap to in the editors.">
              <select className={s.setSelect} value={ui.snap} onChange={(e) => setUi({ snap: e.target.value })}>
                {SNAP_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </Row>

            <Row label="Keyboard octave" hint="Which octave the computer keyboard plays.">
              <div className={s.segRow}>
                <button type="button" className={s.segBtn} onClick={() => setUi((u) => ({ octave: Math.max(0, u.octave - 1) }))}>−</button>
                <span className={s.setValue}>{ui.octave}</span>
                <button type="button" className={s.segBtn} onClick={() => setUi((u) => ({ octave: Math.min(8, u.octave + 1) }))}>+</button>
              </div>
            </Row>

            <Row label="Note ghosts" hint="Show notes from other patterns faintly.">
              <button
                type="button"
                className={ui.ghosts ? `${s.segBtn} ${s.on}` : s.segBtn}
                onClick={() => setUi({ ghosts: !ui.ghosts })}
              >{ui.ghosts ? 'On' : 'Off'}</button>
            </Row>
          </section>

          {/* --------------------------------------------------- guides / data */}
          <section className={s.setSection}>
            <h4 className={s.setSectionTitle}>Guides &amp; data</h4>

            <Row label="Guided tour" hint="Replay the welcome walkthrough.">
              <button type="button" className={s.segBtn} onClick={() => { if (onReplayTour) onReplayTour(); }}>Replay tour</button>
            </Row>

            <Row label="Start fresh" hint="Clear the autosaved project (keeps your name & theme).">
              <button type="button" className={s.dangerBtn} onClick={() => doReset(false)}>New empty studio…</button>
            </Row>

            <Row label="Reset everything" hint="Wipe project, learned AI and all preferences.">
              <button type="button" className={s.dangerBtn} onClick={() => doReset(true)}>Full reset…</button>
            </Row>
          </section>
        </div>

        <div className={s.settingsFoot}>
          <span className={s.dim}>Changes are saved automatically.</span>
          <div className={s.spacer} />
          <button type="button" className={`${s.btn} ${s.on}`} onClick={() => { setHint('Settings saved.'); onClose(); }}>Done</button>
        </div>
      </div>
    </div>
  );
}
