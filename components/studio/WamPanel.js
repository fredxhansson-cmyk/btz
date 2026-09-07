import React, { useRef, useState } from 'react';
import s from '../../styles/studio.module.css';
import { useStudio } from '../../lib/studio/StudioContext';
import { loadWam, destroyWam } from '../../lib/studio/wam';

// A few known public WAM 2.0 plugins to try.
const EXAMPLES = [
  { name: 'BigMuff (dist)', url: 'https://mainline.i3s.unice.fr/PedalEditor/Back-End/functional-pedals/published/BigMuff/index.js' },
  { name: 'Graphic EQ', url: 'https://mainline.i3s.unice.fr/wam2/packages/graphicEQ/index.js' },
  { name: 'StonePhaser', url: 'https://mainline.i3s.unice.fr/wam2/packages/StonePhaser/index.js' },
];

export default function WamPanel({ onClose }) {
  const { engine, setHint } = useStudio();
  const [url, setUrl] = useState('');
  const [loaded, setLoaded] = useState(null);
  const [busy, setBusy] = useState(false);
  const guiRef = useRef(null);

  const load = async (u) => {
    const src = String(u || url).trim();
    if (!src || busy) return;
    setBusy(true);
    try {
      const ctx = engine.ensureContext();
      if (!ctx || !engine.graph) throw new Error('Audio engine not ready — press a key or play once first.');
      if (loaded) { try { engine.graph.clearMasterFx(); } catch (e) { /* noop */ } await destroyWam(loaded); if (guiRef.current) guiRef.current.innerHTML = ''; }
      const w = await loadWam(ctx, src);
      engine.graph.insertMasterFx(w.node);
      setLoaded(w);
      if (w.gui && guiRef.current) { guiRef.current.innerHTML = ''; guiRef.current.appendChild(w.gui); }
      setHint(`Loaded WAM plugin "${w.name}" on the master bus.`);
    } catch (e) {
      setHint(`WAM load failed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!loaded) return;
    try { engine.graph.clearMasterFx(); } catch (e) { /* noop */ }
    await destroyWam(loaded);
    if (guiRef.current) guiRef.current.innerHTML = '';
    setLoaded(null);
    setHint('Removed the WAM plugin.');
  };

  return (
    <div className={s.modalBack} onPointerDown={onClose}>
      <div className={s.modal} onPointerDown={(e) => e.stopPropagation()} style={{ width: 'min(920px, 94vw)' }}>
        <div className={s.modalHead}>
          <span className={s.pluginTitle}>WAM Plugins</span>
          <span className={s.dim}>third-party instruments &amp; effects on the master bus</span>
          <div className={s.spacer} />
          <button type="button" className={s.xBtn} onClick={onClose}>×</button>
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className={s.search} style={{ flex: 1 }} placeholder="WAM plugin URL (…/index.js)" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') load(); }} />
            <button type="button" className={`${s.btn} ${s.on}`} disabled={busy} onClick={() => load()}>{busy ? 'Loading…' : 'Load'}</button>
            {loaded && <button type="button" className={s.btn} onClick={remove}>Remove</button>}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className={s.dim}>Try:</span>
            {EXAMPLES.map((ex) => <button key={ex.url} type="button" className={s.btn} disabled={busy} onClick={() => { setUrl(ex.url); load(ex.url); }}>{ex.name}</button>)}
          </div>
          <div ref={guiRef} style={{ minHeight: 140, background: 'var(--gridsurface)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: 10, overflow: 'auto', display: 'flex', justifyContent: 'center' }}>
            {!loaded && <span className={s.dim} style={{ alignSelf: 'center' }}>Load a plugin to see its interface here.</span>}
          </div>
          <div className={s.helpBox}>
            Loads a <b>Web Audio Modules 2.0</b> plugin at runtime and inserts it on the master bus — the start of an open plugin ecosystem in Fuse. Third-party plugins run their own code, so only load ones you trust. Plugin hosts must be allowed by the app&apos;s CSP (see <b>docs/ACTIVATION.md</b>).
          </div>
        </div>
      </div>
    </div>
  );
}
