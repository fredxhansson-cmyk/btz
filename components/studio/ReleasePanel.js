import React, { useEffect, useState } from 'react';
import s from '../../styles/studio.module.css';
import { useStudio } from '../../lib/studio/StudioContext';

// Release / distribution. Prepares a track for streaming: metadata + a mastered
// master export + a release sheet ready to upload to any distributor. If a
// distributor API is configured (env-gated /api/distribute) it can submit
// directly; otherwise it produces the download bundle.
function download(name, text, mime = 'text/plain') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 500);
}

export default function ReleasePanel({ onClose }) {
  const { project, exportAudio, setHint, me } = useStudio();
  const [title, setTitle] = useState(project.name || 'Untitled');
  const [artist, setArtist] = useState((me && me.name) || '');
  const [genre, setGenre] = useState('Electronic');
  const [tags, setTags] = useState('');
  const [busy, setBusy] = useState(false);
  const [dist, setDist] = useState(false);

  useEffect(() => { fetch('/api/distribute').then((r) => r.json()).then((d) => setDist(!!d.enabled)).catch(() => {}); }, []);

  const metadata = () => ({
    title: title.trim(), artist: artist.trim(), genre, tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
    bpm: project.bpm, releasedAt: new Date().toISOString(), source: 'Fuse',
  });

  const exportMaster = async () => { setBusy(true); try { await exportAudio({ scope: 'song', format: 'mp3', bitrate: 320 }); setHint('Mastered track exported (MP3 320).'); } finally { setBusy(false); } };
  const releaseSheet = () => { download(`${(title || 'release').replace(/\s+/g, '_')}_release.json`, JSON.stringify(metadata(), null, 2), 'application/json'); setHint('Release sheet downloaded — upload it with your track to any distributor.'); };

  const distribute = async () => {
    setBusy(true);
    try {
      const r = await fetch('/api/distribute', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(metadata()) });
      if (r.status === 401) { setHint('Sign in to distribute.'); return; }
      const d = await r.json();
      if (d && d.ok) setHint(`Submitted "${title}" to distribution (ref ${d.id || '—'}).`);
      else setHint(d && d.error ? `Distribution: ${d.error}` : 'Distribution not available — export the master + release sheet instead.');
    } catch (e) { setHint('Distribution failed — use the export bundle.'); } finally { setBusy(false); }
  };

  const field = { height: 40, padding: '0 12px', borderRadius: 'var(--r-sm)', border: '1px solid var(--line-3)', background: 'var(--field)', color: 'var(--text)', fontSize: 14, width: '100%', fontFamily: 'var(--font-ui)' };
  const row = { display: 'flex', flexDirection: 'column', gap: 6 };
  const lbl = { fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)' };

  return (
    <div className={s.modalBack} onPointerDown={onClose}>
      <div className={`${s.modal} ${s.settingsModal}`} onPointerDown={(e) => e.stopPropagation()}>
        <div className={s.modalHead}>
          <span className={s.pluginTitle}>Release</span>
          <span className={s.dim}>prepare your track for streaming</span>
          <div className={s.spacer} />
          <button type="button" className={s.xBtn} onClick={onClose}>×</button>
        </div>
        <div className={s.settingsBody} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={row}><span style={lbl}>Title</span><input style={field} value={title} onChange={(e) => setTitle(e.target.value)} /></label>
            <label style={row}><span style={lbl}>Artist</span><input style={field} value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Your artist name" /></label>
            <label style={row}><span style={lbl}>Genre</span>
              <select style={field} value={genre} onChange={(e) => setGenre(e.target.value)}>
                {['Electronic', 'Hip-Hop', 'House', 'Techno', 'Lo-Fi', 'Pop', 'Ambient', 'Trap', 'Drum & Bass', 'Other'].map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </label>
            <label style={row}><span style={lbl}>Tags</span><input style={field} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="chill, night, focus" /></label>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className={`${s.btn} ${s.on}`} disabled={busy} onClick={exportMaster}>{busy ? 'Rendering…' : 'Export master (MP3)'}</button>
            <button type="button" className={s.btn} onClick={releaseSheet}>Download release sheet</button>
            {dist && <button type="button" className={s.btn} disabled={busy} onClick={distribute}>Distribute to streaming →</button>}
          </div>

          <div className={s.helpBox}>
            {dist
              ? 'Distribution is connected — “Distribute” submits your master + metadata to the configured service.'
              : 'Export the mastered MP3 and the release sheet, then upload both to your distributor (DistroKid, Amuse, etc.). Direct one-click distribution activates when a distributor API is configured (docs/ACTIVATION.md).'}
          </div>
        </div>
      </div>
    </div>
  );
}
