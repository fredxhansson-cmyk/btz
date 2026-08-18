import React, { useCallback, useMemo, useState } from 'react';
import s from '../../styles/studio.module.css';
import { useStudio } from '../../lib/studio/StudioContext';
import {
  CATEGORIES, loadBrain, saveBrain, resetBrain, generateSound, keepSound,
  generateGroove, brainSummary, learnFromProject, aiSoundCount,
} from '../../lib/studio/ai';
import { padChannels, stepsToNotes, ROLES } from '../../lib/studio/drums';
import { patternSteps } from '../../lib/studio/sequencer';
import { soundColor } from '../../lib/studio/library';

export default function AiPanel({ onClose }) {
  const { project, dispatch, engine, setHint, setUi } = useStudio();
  const [brain, setBrain] = useState(() => loadBrain());
  const [tab, setTab] = useState('sounds');
  const [cat, setCat] = useState('Kick');
  const [temp, setTemp] = useState(1);
  const [amount, setAmount] = useState(1);
  const [batch, setBatch] = useState([]);
  const [aiCount, setAiCount] = useState(() => aiSoundCount());

  const summary = useMemo(() => brainSummary(brain), [brain]);

  const generate = useCallback((n = 8) => {
    const b = { ...brain };
    const list = [];
    const used = new Set();
    for (let i = 0; i < n; i++) {
      const sound = generateSound(b, cat, temp);
      // keep the names distinct inside a batch so they are easy to talk about
      let name = sound.name;
      let k = 2;
      while (used.has(name)) { name = `${sound.name} ${k}`; k += 1; }
      used.add(name);
      list.push({ ...sound, name });
    }
    saveBrain(b);
    setBrain(b);
    setBatch(list);
    if (list[0]) engine.previewSound(list[0]);
  }, [brain, cat, temp, engine]);

  const keep = (sound, weight) => {
    const b = { ...brain };
    keepSound(b, sound, weight);
    setBrain(b);
    setAiCount(aiSoundCount());
    setBatch((list) => list.map((x) => (x.id === sound.id ? { ...x, kept: true } : x)));
    setHint(`"${sound.name}" sparad i biblioteket — modellen lart sig av den.`);
  };

  const addChannel = (sound) => {
    dispatch({ type: 'sound.add', sound });
    keep(sound, 1);
    setUi({ view: 'rack' });
  };

  const skip = (sound) => {
    const b = { ...brain };
    b.stats.skipped += 1;
    saveBrain(b);
    setBrain(b);
    setBatch((list) => list.filter((x) => x.id !== sound.id));
  };

  const makeBeat = (variation) => {
    const pattern = project.patterns.find((p) => p.id === project.activePattern);
    if (!pattern) return;
    const byRole = padChannels(project);
    const roles = ROLES.map((r) => r.id).filter((r) => byRole.has(r));
    if (!roles.length) {
      setHint('Lagg till trumkanaler forst (t.ex. via ett kit i Browser).');
      return;
    }
    const steps = patternSteps(pattern);
    const groove = generateGroove(brain, roles, steps, variation ? amount * 0.6 : amount);
    const byChannel = {};
    for (const role of roles) {
      const ch = byRole.get(role);
      const existing = variation ? ((pattern.notes || {})[ch.id] || []) : [];
      const fresh = stepsToNotes(groove[role] || []);
      byChannel[ch.id] = variation
        ? [...existing.filter(() => Math.random() > 0.45), ...fresh].slice(0, 64)
        : fresh;
    }
    dispatch({ type: 'notes.setMany', patternId: pattern.id, byChannel });
    setHint(variation ? 'Varierade beatet utifran din stil.' : 'Nytt beat genererat utifran din stil.');
    setUi({ view: 'drums' });
  };

  const learnNow = () => {
    const b = { ...brain };
    learnFromProject(b, project, 1);
    saveBrain(b);
    setBrain(b);
    setHint('Modellen har lart sig av det har projektet.');
  };

  return (
    <div className={s.modalBack} onPointerDown={onClose}>
      <div className={s.modal} onPointerDown={(e) => e.stopPropagation()}>
        <div className={s.modalHead}>
          <span className={s.pluginTitle}>FLOW Brain</span>
          <span className={s.dim}>genererar ljud och beats — och lar sig av det du behaller. Allt sparas lokalt.</span>
          <div className={s.spacer} />
          <button type="button" className={s.xBtn} onClick={onClose}>×</button>
        </div>

        <div className={s.aiTabs}>
          {[['sounds', 'Ljud'], ['beat', 'Beat'], ['brain', `Lart sig (${Math.round(summary.stats.kept)})`]].map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={tab === id ? `${s.seg} ${s.on}` : s.seg}
              onClick={() => setTab(id)}
            >{label}</button>
          ))}
        </div>

        {tab === 'sounds' && (
          <div className={s.aiBody}>
            <div className={s.recRow}>
              <div className={s.chipRow}>
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={cat === c ? `${s.chip} ${s.on}` : s.chip}
                    onClick={() => setCat(c)}
                  >{c}</button>
                ))}
              </div>
            </div>
            <div className={s.recRow}>
              <label className={s.checkRow}>
                Vagat
                <input
                  type="range" min={0.3} max={2.2} step={0.1} value={temp}
                  onChange={(e) => setTemp(Number(e.target.value))}
                />
                <span className={s.dim}>{temp.toFixed(1)}</span>
              </label>
              <button type="button" className={`${s.btn} ${s.on}`} onClick={() => generate(8)}>Generera 8 ljud</button>
              <span className={s.dim}>{aiCount} AI-ljud i biblioteket</span>
            </div>

            <div className={s.aiGrid}>
              {batch.map((sd) => (
                <div key={sd.id} className={sd.kept ? `${s.aiCard} ${s.aiKept}` : s.aiCard}>
                  <div className={s.aiCardTop}>
                    <span className={s.swatch} style={{ background: soundColor(sd) }} />
                    <span className={s.laneText}>{sd.name}</span>
                  </div>
                  <div className={s.aiCardBtns}>
                    <button type="button" className={s.previewBtn} onClick={() => engine.previewSound(sd)}>▸</button>
                    <button type="button" className={s.btn} title="Spara i biblioteket" onClick={() => keep(sd, 2)}>♥</button>
                    <button type="button" className={s.btn} title="Lagg till som kanal" onClick={() => addChannel(sd)}>+</button>
                    <button type="button" className={s.xBtn} title="Slang" onClick={() => skip(sd)}>×</button>
                  </div>
                </div>
              ))}
              {!batch.length && (
                <div className={s.helpBox}>
                  Tryck "Generera 8 ljud". Ju fler du sparar med ♥ eller lagger till med +,
                  desto mer traffsakert blir det — modellen lar sig dina varden for tonhojd,
                  decay, drive och allt annat.
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'beat' && (
          <div className={s.aiBody}>
            <div className={s.recRow}>
              <label className={s.checkRow}>
                Tathet
                <input
                  type="range" min={0.4} max={1.8} step={0.1} value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                />
                <span className={s.dim}>{amount.toFixed(1)}</span>
              </label>
              <button type="button" className={`${s.btn} ${s.on}`} onClick={() => makeBeat(false)}>Generera nytt beat</button>
              <button type="button" className={s.btn} onClick={() => makeBeat(true)}>Variera det jag har</button>
            </div>
            <div className={s.helpBox}>
              Beatet skrivs till det aktiva monstret och anvander de trumkanaler som finns.
              Modellen vaktar var du brukar lagga dina traffar per instrument — ju fler beats
              du gor, desto mer later det som du.
            </div>
            <div className={s.grooveGrid}>
              {summary.grooves.map((g) => (
                <div key={g.role} className={s.grooveRow}>
                  <span className={s.grooveName}>{g.role}</span>
                  <span className={s.dim}>{g.n} inlarda</span>
                </div>
              ))}
              {!summary.grooves.length && <span className={s.dim}>Inget inlart an — gor ett beat sa lar den sig.</span>}
            </div>
          </div>
        )}

        {tab === 'brain' && (
          <div className={s.aiBody}>
            <div className={s.recRow}>
              <button type="button" className={s.btn} onClick={learnNow}>Lar av det har projektet nu</button>
              <button
                type="button"
                className={s.btn}
                onClick={() => {
                  if (window.confirm('Nollstalla allt modellen lart sig? Dina sparade ljud finns kvar.')) {
                    setBrain(resetBrain());
                    setHint('Modellen nollstalld.');
                  }
                }}
              >Nollstall inlarning</button>
            </div>
            <div className={s.statGrid}>
              <div className={s.statBox}><b>{Math.round(summary.stats.kept)}</b><span>ljud inlarda</span></div>
              <div className={s.statBox}><b>{Math.round(summary.stats.generated)}</b><span>genererade</span></div>
              <div className={s.statBox}><b>{Math.round(summary.stats.liked || 0)}</b><span>gillade</span></div>
              <div className={s.statBox}><b>{Math.round(summary.stats.projects)}</b><span>projekt-pass</span></div>
              <div className={s.statBox}><b>{aiCount}</b><span>AI-ljud sparade</span></div>
            </div>
            <div className={s.recRow}>
              {summary.sounds.map((x) => (
                <span key={x.cat} className={s.chip}>{x.cat}: {x.n}</span>
              ))}
              {!summary.sounds.length && <span className={s.dim}>Inget inlart an.</span>}
            </div>
            <div className={s.helpBox}>
              Modellen ar en lokal statistisk modell over syntesparametrar och stegpositioner —
              den kors i din webblasare, skickar ingenting nagonstans och blir bara battre ju mer
              du anvander programmet.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
