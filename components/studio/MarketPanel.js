import React, { useEffect, useState } from 'react';
import s from '../../styles/studio.module.css';
import { useStudio } from '../../lib/studio/StudioContext';
import { FEATURED_PACKS } from '../../lib/studio/packs';
import { saveUserSound, loadUserSounds } from '../../lib/studio/library';
import { marketStatus, marketGet, marketPublish } from '../../lib/studio/market';

export default function MarketPanel({ onClose }) {
  const { engine, ui, setUi, setHint, me } = useStudio();
  const [community, setCommunity] = useState({ enabled: false, index: [] });
  const [busy, setBusy] = useState(false);
  useEffect(() => { marketStatus().then(setCommunity).catch(() => {}); }, []);

  const importPack = (pack) => {
    (pack.sounds || []).forEach((snd) => saveUserSound({ ...snd, user: true }));
    setUi({ soundsVersion: (ui.soundsVersion || 0) + 1 });
    setHint(`Added "${pack.name}" — ${(pack.sounds || []).length} sounds are now in your library (My sounds).`);
  };

  // After a successful purchase Stripe returns to /?bought=<packId> — grant it.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const bought = params.get('bought');
      if (bought) {
        marketGet(bought).then((pack) => { if (pack) importPack(pack); });
        params.delete('bought');
        window.history.replaceState({}, '', `${window.location.pathname}${params.toString() ? `?${params}` : ''}`);
      }
    } catch (e) { /* noop */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const buyPack = async (meta) => {
    setBusy(true);
    try {
      const r = await fetch('/api/market/buy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ packId: meta.id, name: meta.name, price: meta.price }) });
      if (r.status === 401) { setHint('Sign in to buy this pack.'); return; }
      const d = await r.json();
      if (d && d.url) { window.location.href = d.url; return; }
      setHint(d && d.error ? `Purchase: ${d.error}` : 'Buying needs billing configured (docs/ACTIVATION.md).');
    } finally { setBusy(false); }
  };
  const addFeatured = (pack) => importPack(pack);
  const addCommunity = async (id) => { setBusy(true); try { const pack = await marketGet(id); if (pack) importPack(pack); else setHint('Could not fetch that pack.'); } finally { setBusy(false); } };
  const preview = (snd) => { try { if (engine.previewSound) engine.previewSound(snd); } catch (e) { /* noop */ } };

  const publish = async () => {
    const mine = loadUserSounds().filter((x) => !(x.tags || []).includes('ai'));
    if (!mine.length) { setHint('Save some custom sounds first (Instrument panel → “Save sound”), then publish a pack.'); return; }
    const name = window.prompt(`Pack name (publishing ${mine.length} of your sounds)`, 'My pack');
    if (!name) return;
    const price = Math.max(0, parseFloat(window.prompt('Price in USD (0 = free)', '0')) || 0);
    setBusy(true);
    const r = await marketPublish({ name, desc: '', price, author: (me && me.name) || 'Anon', sounds: mine });
    setBusy(false);
    if (r && r.id) { setHint(`Published "${name}" to the marketplace!`); marketStatus().then(setCommunity); }
    else if (r && r.error === 'signin') setHint('Sign in to publish a pack.');
    else setHint('Publish failed — the marketplace may not be enabled yet.');
  };

  const PackRow = ({ pack, onAdd, community: isCommunity }) => (
    <div className={s.projRow} style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <div className={s.projMain} style={{ cursor: 'default' }}>
        <span className={s.projName}>{pack.name} {isCommunity ? '' : <span className={s.dim} style={{ fontWeight: 400 }}>· featured</span>}</span>
        <span className={s.projMeta}>{pack.desc || ''}{pack.author ? ` · by ${pack.author}` : ''}{pack.count ? ` · ${pack.count} sounds` : (pack.sounds ? ` · ${pack.sounds.length} sounds` : '')}{pack.price > 0 ? ` · $${pack.price}` : (isCommunity ? ' · free' : '')}</span>
        {pack.sounds && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
            {pack.sounds.slice(0, 8).map((snd) => (
              <button key={snd.id} type="button" className={s.chip} onClick={() => preview(snd)} title="Preview">▶ {snd.name}</button>
            ))}
          </div>
        )}
      </div>
      <div className={s.projActions}>
        <button type="button" className={`${s.btn} ${s.on}`} disabled={busy} onClick={onAdd}>{isCommunity && pack.price > 0 ? `Buy $${pack.price}` : '＋ Add pack'}</button>
      </div>
    </div>
  );

  return (
    <div className={s.modalBack} onPointerDown={onClose}>
      <div className={`${s.modal} ${s.settingsModal}`} onPointerDown={(e) => e.stopPropagation()}>
        <div className={s.modalHead}>
          <span className={s.pluginTitle}>Marketplace</span>
          <span className={s.dim}>sound packs — add to your library or publish your own</span>
          <div className={s.spacer} />
          <button type="button" className={`${s.btn} ${s.on}`} disabled={busy} onClick={publish}>Publish a pack…</button>
          <button type="button" className={s.xBtn} onClick={onClose}>×</button>
        </div>
        <div className={s.settingsBody}>
          <div className={s.dim} style={{ margin: '2px 2px 8px', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase' }}>Featured</div>
          <div className={s.projList}>
            {FEATURED_PACKS.map((pack) => <PackRow key={pack.id} pack={pack} onAdd={() => addFeatured(pack)} />)}
          </div>

          <div className={s.dim} style={{ margin: '14px 2px 8px', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase' }}>Community</div>
          {!community.enabled && (
            <div className={s.helpBox}>Community packs turn on once cloud storage is configured (see docs/ACTIVATION.md). The featured packs above work offline right now.</div>
          )}
          {community.enabled && !community.index.length && (
            <div className={s.helpBox}>No community packs yet — be the first: tweak sounds, save them, then <b>Publish a pack</b>.</div>
          )}
          {community.enabled && community.index.length > 0 && (
            <div className={s.projList}>
              {community.index.map((meta) => <PackRow key={meta.id} pack={meta} community onAdd={() => (meta.price > 0 ? buyPack(meta) : addCommunity(meta.id))} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
