import React, { useRef, useState } from 'react';
import s from '../../styles/studio.module.css';
import { useStudio, useRaf } from '../../lib/studio/StudioContext';
import {
  MASTER_PRESETS, matchGain, measureBufferLufs,
  analyzeTonalBalance, suggestMasterChain, describeMoves, AI_MASTER_STYLES,
} from '../../lib/studio/mastering';
import { renderProject } from '../../lib/studio/audio/render';

/**
 * The mastering panel — loudness metering, streaming presets, one-click
 * auto-master and reference A/B. Exported on its own so it can live both inside
 * the Mixer (master strip) and as a standalone, pop-out-able view.
 */
export function Mastering() {
  const { project, dispatch, engine, setHint } = useStudio();
  const ref = useRef(null);
  const barRef = useRef(null);
  const vals = useRef({ i: null, s: -70, m: -70, p: 0 });
  const target = project.master.target == null ? -14 : project.master.target;

  // Analysis-driven AI master: render the track, measure its tonal balance and
  // loudness, then set EQ + chain + level automatically toward a target curve.
  const [aiStyle, setAiStyle] = useState('balanced');
  const [aiBusy, setAiBusy] = useState(null);
  const [aiReport, setAiReport] = useState(null);
  const refBalance = useRef(null);

  const aiMaster = async () => {
    setAiBusy('Renderar…');
    try {
      const p = project;
      const sr = engine.ctx ? engine.ctx.sampleRate : 44100;
      const mode = (p.playlist && p.playlist.length) ? 'song' : 'pattern';
      const buffer = await renderProject(p, engine.buffers, {
        mode,
        repeats: mode === 'song' ? 1 : 2,
        sampleRate: Math.min(sr, 32000),
        onProgress: (f) => setAiBusy(`Analyserar… ${Math.round(f * 100)}%`),
      });
      const balance = analyzeTonalBalance(buffer);
      const measured = measureBufferLufs(buffer);
      const { chain, target: tgt, moves } = suggestMasterChain(balance, {
        style: aiStyle, target, refBalance: refBalance.current || undefined,
      });
      dispatch({ type: 'master.preset', presetId: 'ai', chain, target: tgt });
      engine.resetLoudness();
      if (measured != null && isFinite(measured) && measured > -60) {
        const next = matchGain(project.master.vol, measured, tgt);
        dispatch({ type: 'master', patch: { vol: next } });
      }
      setAiReport({ moves, measured, target: tgt, matched: !!refBalance.current });
      setHint(`AI-mastring: ${describeMoves(moves)} · nivå ${measured > -60 ? measured.toFixed(1) : '—'} → ${tgt} LUFS.`);
    } catch (e) {
      setHint(`AI-mastring misslyckades: ${e.message}`);
    } finally {
      setAiBusy(null);
    }
  };

  // Reference track: load a professionally-mastered song, measure its loudness,
  // A/B against your mix and match your target to it.
  const [refTrack, setRefTrack] = useState(null);
  const refBuf = useRef(null);
  const refSrc = useRef(null);
  const refRaf = useRef(0);
  const fileRef = useRef(null);
  const loadRef = async (file) => {
    try {
      const ctx = engine.ensureContext();
      const buf = await ctx.decodeAudioData(await file.arrayBuffer());
      refBuf.current = buf;
      engine.refSpectrum = null;
      refBalance.current = analyzeTonalBalance(buf);
      const lufs = measureBufferLufs(buf);
      setRefTrack({ name: file.name.replace(/\.[^.]+$/, '').slice(0, 26), lufs, playing: false });
      setHint(`Reference "${file.name}" — ${lufs.toFixed(1)} LUFS.`);
    } catch (e) { setHint(`Could not read the reference: ${e.message}`); }
  };
  const toggleRefPlay = () => {
    if (refSrc.current) {
      try { refSrc.current.stop(); } catch (e) { /* noop */ }
      refSrc.current = null;
      cancelAnimationFrame(refRaf.current);
      setRefTrack((r) => (r ? { ...r, playing: false } : r));
      return;
    }
    if (!refBuf.current) return;
    const ctx = engine.ensureContext();
    const src = ctx.createBufferSource();
    src.buffer = refBuf.current;
    const an = ctx.createAnalyser();
    an.fftSize = 1024;
    src.connect(an);
    src.connect(ctx.destination);
    if (!engine.refSpectrum || engine.refSpectrum.length !== an.frequencyBinCount) {
      engine.refSpectrum = new Uint8Array(an.frequencyBinCount);
    }
    const tmp = new Uint8Array(an.frequencyBinCount);
    const capture = () => {
      an.getByteFrequencyData(tmp);
      const spec = engine.refSpectrum;
      for (let i = 0; i < spec.length; i++) spec[i] = Math.round(spec[i] * 0.85 + tmp[i] * 0.15);
      refRaf.current = requestAnimationFrame(capture);
    };
    refRaf.current = requestAnimationFrame(capture);
    src.onended = () => { refSrc.current = null; cancelAnimationFrame(refRaf.current); setRefTrack((r) => (r ? { ...r, playing: false } : r)); };
    src.start();
    refSrc.current = src;
    setRefTrack((r) => (r ? { ...r, playing: true } : r));
  };

  useRaf(() => {
    const l = engine.updateLoudness();
    vals.current = { i: l.integrated, s: l.short, m: l.momentary, p: l.peak };
    if (barRef.current) {
      const norm = (v) => Math.max(0, Math.min(1, (v + 30) / 24)); // -30..-6 LUFS -> 0..1
      const cur = l.integrated != null && l.integrated > -60 ? l.integrated : (l.short > -60 ? l.short : null);
      barRef.current.style.width = `${(cur != null ? norm(cur) : 0) * 100}%`;
      const diff = cur != null ? Math.abs(cur - target) : 99;
      barRef.current.style.background = diff < 1 ? 'var(--track-1)' : (cur != null && cur > target ? 'var(--rec)' : 'var(--accent)');
    }
    if (!ref.current) return;
    const fmt = (v) => (v == null || v < -60 ? '—' : v.toFixed(1));
    ref.current.textContent = `Integrated ${fmt(l.integrated)} LUFS · short ${fmt(l.short)} · momentary ${fmt(l.momentary)} · peak ${(20 * Math.log10(Math.max(1e-4, l.peak))).toFixed(1)} dB`;
  });

  return (
    <div className={s.masterBox2}>
      <div className={s.fxHead}>
        <span>Mastering</span>
        <div className={s.group}>
          <span className={s.dim}>Target</span>
          <select
            className={s.select}
            value={target}
            onChange={(e) => dispatch({ type: 'master', patch: { target: Number(e.target.value) } })}
          >
            {[-9, -11, -12, -14, -16, -18].map((t) => <option key={t} value={t}>{t} LUFS</option>)}
          </select>
        </div>
      </div>

      <div className={s.presetRow}>
        {MASTER_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={project.master.preset === p.id ? `${s.btn} ${s.on}` : s.btn}
            title={p.desc}
            onClick={() => {
              dispatch({ type: 'master.preset', presetId: p.id, chain: p.chain, target: p.target });
              engine.resetLoudness();
              setHint(`Mastering: ${p.name} — ${p.desc}`);
            }}
          >{p.name}</button>
        ))}
      </div>

      <div className={s.aiMasterBox}>
        <div className={s.aiMasterHead}>
          <span className={s.aiMasterTitle}>✨ AI-mastring</span>
          <span className={s.dim}>analyserar mixens tonbalans och sätter EQ, kedja och nivå automatiskt</span>
        </div>
        <div className={s.loudRow}>
          <span className={s.dim}>Stil</span>
          <select className={s.select} value={aiStyle} onChange={(e) => setAiStyle(e.target.value)}>
            {Object.keys(AI_MASTER_STYLES).map((k) => (
              <option key={k} value={k}>{({ balanced: 'Balanserad', loud: 'Hög/klubb', warm: 'Varm', bright: 'Ljus/luftig' })[k] || k}</option>
            ))}
          </select>
          <div className={s.spacer} />
          <button type="button" className={`${s.btn} ${s.on}`} disabled={!!aiBusy} onClick={aiMaster}>
            {aiBusy || (refBalance.current ? '🎯 Analysera & matcha referens' : '✨ Analysera & mastra')}
          </button>
        </div>
        {aiReport && (
          <div className={s.aiReport}>
            <b>Klart.</b> {describeMoves(aiReport.moves)}
            {aiReport.matched ? ' · matchad mot referensens tonkurva' : ''}
            {' · nivå '}
            {aiReport.measured > -60 ? `${aiReport.measured.toFixed(1)} → ${aiReport.target} LUFS` : `mål ${aiReport.target} LUFS`}.
            <span className={s.dim}> Allt landade på master-kedjan — justera stegen fritt nedan.</span>
          </div>
        )}
      </div>

      <div className={s.lufsBar} title="Integrated loudness vs your target (green = on target)">
        <div className={s.lufsFill} ref={barRef} />
        <div className={s.lufsTarget} style={{ left: `${Math.max(0, Math.min(100, ((target + 30) / 24) * 100))}%` }} />
      </div>

      <div className={s.loudRow}>
        <span className={s.loudRead} ref={ref}>—</span>
        <div className={s.spacer} />
        <button
          type="button"
          className={`${s.btn} ${s.on}`}
          title="One click: apply a streaming master chain and match the level to your target"
          onClick={() => {
            const pr = MASTER_PRESETS.find((x) => x.id === 'streaming') || MASTER_PRESETS[1];
            dispatch({ type: 'master.preset', presetId: pr.id, chain: pr.chain, target: pr.target });
            const measured = vals.current.i;
            if (measured != null && isFinite(measured) && measured > -60) {
              const next = matchGain(project.master.vol, measured, pr.target);
              dispatch({ type: 'master', patch: { vol: next } });
              setHint(`Auto-mastered: streaming chain + level matched to ${pr.target} LUFS.`);
            } else {
              engine.resetLoudness();
              setHint('Auto-master applied. Play the track once and it matches the level to target.');
            }
          }}
        >✨ Auto-master</button>
        <button type="button" className={s.btn} onClick={() => engine.resetLoudness()}>Reset measurement</button>
        <button
          type="button"
          className={s.btn}
          title="Adjusts the master volume so the measured level lands on the target"
          onClick={() => {
            const measured = vals.current.i;
            if (measured == null) { setHint('Play the track for a bit first so the meter has time to measure.'); return; }
            const next = matchGain(project.master.vol, measured, target);
            dispatch({ type: 'master', patch: { vol: next } });
            setHint(`Master volume adjusted to ${next.toFixed(2)} to hit ${target} LUFS.`);
          }}
        >Match target level</button>
      </div>

      <div className={s.loudRow}>
        <button type="button" className={s.btn} onClick={() => fileRef.current && fileRef.current.click()}>Load reference…</button>
        {refTrack && (
          <>
            <span className={s.dim}>Ref: {refTrack.name} · {refTrack.lufs.toFixed(1)} LUFS</span>
            <div className={s.spacer} />
            <button type="button" className={refTrack.playing ? `${s.btn} ${s.on}` : s.btn} onClick={toggleRefPlay}>{refTrack.playing ? '■ Stop' : '▶ A/B'}</button>
            <button
              type="button"
              className={s.btn}
              title="Set your loudness target to match the reference"
              onClick={() => { dispatch({ type: 'master', patch: { target: Math.round(refTrack.lufs) } }); setHint(`Target set to the reference: ${Math.round(refTrack.lufs)} LUFS.`); }}
            >Match target to ref</button>
          </>
        )}
        <input ref={fileRef} type="file" accept="audio/*" className={s.hiddenFile} onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) loadRef(f); e.target.value = ''; }} />
      </div>

      <div className={s.helpBox}>
        Play the whole track once with the meter running — the integrated level is the one
        streaming services normalize against.
      </div>
    </div>
  );
}

/**
 * Standalone Mastering view for the main view area / a popped-out window. Gives
 * mastering its own home so it is discoverable outside the mixer's master strip.
 */
export default function MasteringView() {
  const { project, dispatch, popOut, detached, attach } = useStudio();
  const out = detached.includes('mastering');
  return (
    <div className={s.panel}>
      <div className={s.panelHead}>
        <span className={s.panelTitle}>Mastering</span>
        <span className={s.dim}>Finish your track — loudness, tone &amp; one-click master</span>
        <div className={s.spacer} />
        <button
          type="button"
          className={s.btn}
          onClick={() => (out ? attach('mastering') : popOut('mastering'))}
          title="Open mastering in its own window (second screen)"
        >⧉ {out ? 'Bring back' : 'Pop out'}</button>
      </div>
      <div className={s.masteringWrap}>
        <Mastering key={project.selectedInsert} />
      </div>
    </div>
  );
}
