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
import { parsePrompt, sanitizeSpec, buildBeat, describeSpec } from '../../lib/studio/promptbeat';

const PROMPT_EXAMPLES = [
  'dark trap 140 in F minor with hard 808s and piano',
  'lofi chill 82 bpm, jazzy chords',
  'house 124 with a driving bassline',
  'boom bap 90, dusty and simple',
  'aggressive drill 142, G# harmonic minor',
];

export default function AiPanel({ onClose }) {
  const { project, dispatch, engine, setHint, setUi } = useStudio();
  const [brain, setBrain] = useState(() => loadBrain());
  const [tab, setTab] = useState('prompt');
  const [cat, setCat] = useState('Kick');
  const [temp, setTemp] = useState(1);
  const [amount, setAmount] = useState(1);
  const [batch, setBatch] = useState([]);
  const [aiCount, setAiCount] = useState(() => aiSoundCount());
  const [promptText, setPromptText] = useState('');
  const [useModel, setUseModel] = useState(false);
  const [working, setWorking] = useState(false);

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
    setHint(`"${sound.name}" saved to the library — the model has learned from it.`);
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
      setHint('Add drum channels first (e.g. via a kit in the Browser).');
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
    setHint(variation ? 'Varied the beat based on your style.' : 'New beat generated based on your style.');
    setUi({ view: 'drums' });
  };

  const learnNow = () => {
    const b = { ...brain };
    learnFromProject(b, project, 1);
    saveBrain(b);
    setBrain(b);
    setHint('The model has learned from this project.');
  };

  const generateFromPrompt = async () => {
    const text = promptText.trim();
    if (!text) { setHint('Describe what you want — e.g. "dark trap 140 F minor with piano".'); return; }
    setWorking(true);
    try {
      let spec = parsePrompt(text);
      // Optional LLM refinement — only if the user opts in AND a key is set on
      // the server. Falls back to the local, free parse on any failure.
      if (useModel) {
        try {
          const res = await fetch('/api/ai/beat', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: text }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data && data.spec) spec = sanitizeSpec(data.spec, spec);
            else if (data && data.enabled === false) setHint('AI model not enabled on the server — ran locally (free).');
          }
        } catch (e) { /* keep local spec */ }
      }
      const next = buildBeat(project, brain, spec);
      dispatch({ type: 'set', project: next });
      // Learn from what we just made so the model drifts toward the user.
      const b = { ...brain };
      learnFromProject(b, next, 0.5);
      saveBrain(b);
      setBrain(b);
      setHint(`Generated: ${describeSpec(spec)} — fully editable in Drum Machine / Piano Roll.`);
      setUi({ view: 'drums' });
      onClose();
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className={s.modalBack} onPointerDown={onClose}>
      <div className={s.modal} onPointerDown={(e) => e.stopPropagation()}>
        <div className={s.modalHead}>
          <span className={s.pluginTitle}>Fuse Brain</span>
          <span className={s.dim}>generates sounds and beats — and learns from what you keep. Everything is saved locally.</span>
          <div className={s.spacer} />
          <button type="button" className={s.xBtn} onClick={onClose}>×</button>
        </div>

        <div className={s.aiTabs}>
          {[['prompt', '✨ Prompt'], ['sounds', 'Sounds'], ['beat', 'Beat'], ['brain', `Learned (${Math.round(summary.stats.kept)})`]].map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={tab === id ? `${s.seg} ${s.on}` : s.seg}
              onClick={() => setTab(id)}
            >{label}</button>
          ))}
        </div>

        {tab === 'prompt' && (
          <div className={s.aiBody}>
            <div className={s.promptWrap}>
              <textarea
                className={s.promptInput}
                value={promptText}
                autoFocus
                placeholder={'Describe the beat you want…\ne.g. "dark trap 140 in F minor with hard 808s and piano"'}
                onChange={(e) => setPromptText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); generateFromPrompt(); } }}
              />
              <div className={s.chipRow}>
                {PROMPT_EXAMPLES.map((ex) => (
                  <button key={ex} type="button" className={s.chip} onClick={() => setPromptText(ex)}>{ex}</button>
                ))}
              </div>
              <div className={s.promptRow}>
                <button
                  type="button"
                  className={`${s.btn} ${s.on} ${s.promptGo}`}
                  disabled={working}
                  onClick={generateFromPrompt}
                >{working ? 'Generating…' : '✨ Generate beat'}</button>
                <label className={s.checkRow} title="Use a language model if an API key is set on the server. Otherwise the local engine runs.">
                  <input type="checkbox" checked={useModel} onChange={(e) => setUseModel(e.target.checked)} />
                  AI model (if key is set)
                </label>
                <span className={s.dim}>⌘/Ctrl + Enter</span>
              </div>
              <div className={s.helpBox}>
                Writes real drum channels, a groove, a bassline and (on request) chords into
                the current pattern — <b>everything stays editable</b> in the Drum Machine and
                Piano Roll. The local engine runs in your browser and <b>costs nothing</b>.
              </div>
            </div>
          </div>
        )}

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
                Daring
                <input
                  type="range" min={0.3} max={2.2} step={0.1} value={temp}
                  onChange={(e) => setTemp(Number(e.target.value))}
                />
                <span className={s.dim}>{temp.toFixed(1)}</span>
              </label>
              <button type="button" className={`${s.btn} ${s.on}`} onClick={() => generate(8)}>Generate 8 sounds</button>
              <span className={s.dim}>{aiCount} AI sounds in the library</span>
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
                    <button type="button" className={s.btn} title="Save to library" onClick={() => keep(sd, 2)}>♥</button>
                    <button type="button" className={s.btn} title="Add as channel" onClick={() => addChannel(sd)}>+</button>
                    <button type="button" className={s.xBtn} title="Discard" onClick={() => skip(sd)}>×</button>
                  </div>
                </div>
              ))}
              {!batch.length && (
                <div className={s.helpBox}>
                  Press "Generate 8 sounds". The more you save with ♥ or add with +,
                  the more accurate it gets — the model learns your values for pitch,
                  decay, drive and everything else.
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'beat' && (
          <div className={s.aiBody}>
            <div className={s.recRow}>
              <label className={s.checkRow}>
                Density
                <input
                  type="range" min={0.4} max={1.8} step={0.1} value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                />
                <span className={s.dim}>{amount.toFixed(1)}</span>
              </label>
              <button type="button" className={`${s.btn} ${s.on}`} onClick={() => makeBeat(false)}>Generate new beat</button>
              <button type="button" className={s.btn} onClick={() => makeBeat(true)}>Vary what I have</button>
            </div>
            <div className={s.helpBox}>
              The beat is written to the active pattern and uses the drum channels that exist.
              The model keeps track of where you usually place your hits per instrument — the more beats
              you make, the more it sounds like you.
            </div>
            <div className={s.grooveGrid}>
              {summary.grooves.map((g) => (
                <div key={g.role} className={s.grooveRow}>
                  <span className={s.grooveName}>{g.role}</span>
                  <span className={s.dim}>{g.n} learned</span>
                </div>
              ))}
              {!summary.grooves.length && <span className={s.dim}>Nothing learned yet — make a beat and it will learn.</span>}
            </div>
          </div>
        )}

        {tab === 'brain' && (
          <div className={s.aiBody}>
            <div className={s.recRow}>
              <button type="button" className={s.btn} onClick={learnNow}>Learn from this project now</button>
              <button
                type="button"
                className={s.btn}
                onClick={() => {
                  if (window.confirm('Reset everything the model has learned? Your saved sounds will remain.')) {
                    setBrain(resetBrain());
                    setHint('Model reset.');
                  }
                }}
              >Reset learning</button>
            </div>
            <div className={s.statGrid}>
              <div className={s.statBox}><b>{Math.round(summary.stats.kept)}</b><span>sounds learned</span></div>
              <div className={s.statBox}><b>{Math.round(summary.stats.generated)}</b><span>generated</span></div>
              <div className={s.statBox}><b>{Math.round(summary.stats.liked || 0)}</b><span>liked</span></div>
              <div className={s.statBox}><b>{Math.round(summary.stats.projects)}</b><span>project passes</span></div>
              <div className={s.statBox}><b>{aiCount}</b><span>AI sounds saved</span></div>
            </div>
            <div className={s.recRow}>
              {summary.sounds.map((x) => (
                <span key={x.cat} className={s.chip}>{x.cat}: {x.n}</span>
              ))}
              {!summary.sounds.length && <span className={s.dim}>Nothing learned yet.</span>}
            </div>
            <div className={s.helpBox}>
              The model is a local statistical model over synthesis parameters and step positions —
              it runs in your browser, sends nothing anywhere and only gets better the more
              you use the app.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
