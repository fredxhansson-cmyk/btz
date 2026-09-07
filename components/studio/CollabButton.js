import React, { useState } from 'react';
import { useStudio } from '../../lib/studio/StudioContext';

const VIEW_LABEL = { playlist: 'Arrangement', rack: 'Instruments', piano: 'Piano Roll', drums: 'Drum Machine', mixer: 'Mixer', automation: 'Automation', mastering: 'Mastering', video: 'Video', liveinputs: 'Live inputs', workspace: 'Workspace' };

// Compact real-time collaboration control: start/join a session by code and see
// who's in the room (presence). Opt-in — solo until you join.
export default function CollabButton() {
  const { collab, joinCollab, leaveCollab } = useStudio();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const inRoom = collab && collab.inRoom;
  const peers = (collab && collab.peers) || [];
  const gen = () => Math.random().toString(36).slice(2, 7);

  const dot = (p, i) => (
    <span key={p.id || i} title={p.name || 'Guest'} style={{ width: 20, height: 20, borderRadius: '50%', background: p.color || 'var(--accent)', color: '#0b0b0b', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, marginLeft: i ? -6 : 0, border: '2px solid var(--chrome)', boxSizing: 'border-box' }}>{(p.name || 'G').charAt(0).toUpperCase()}</span>
  );

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Real-time collaboration"
        style={{ height: 44, padding: '0 14px', borderRadius: 'var(--r-md)', border: `1px solid ${inRoom ? 'var(--accent)' : 'var(--line-strong)'}`, background: 'transparent', color: inRoom ? 'var(--accent)' : 'var(--text-4)', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 8 }}
      >
        <span style={{ color: inRoom ? (collab.connected ? 'var(--color-success)' : 'var(--warn)') : 'var(--text-4)' }}>◉</span>
        {inRoom ? <span style={{ display: 'inline-flex' }}>{peers.slice(0, 4).map(dot)}</span> : 'Collaborate'}
      </button>
      {open && (
        <>
          <div onPointerDown={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 60 }} />
          <div style={{ position: 'absolute', right: 0, top: 50, zIndex: 61, width: 280, padding: 14, background: 'var(--panel)', border: '1px solid var(--line-2)', borderRadius: 'var(--r-lg)', boxShadow: '0 18px 44px rgba(0,0,0,.5)', fontFamily: 'var(--font-ui)' }} onPointerDown={(e) => e.stopPropagation()}>
            {inRoom ? (
              <>
                <div style={{ fontSize: 13.5, color: 'var(--text)', fontWeight: 700, marginBottom: 6 }}>Session <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{collab.room}</span></div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>{collab.connected ? 'Live · edits sync in real time' : 'Connecting to peers…'}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                  {peers.map((p, i) => (
                    <div key={p.id || i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-2)' }}>
                      {dot(p, 0)}<span>{p.name || 'Guest'}{p.self ? ' (you)' : ''}</span>
                      {p.view && <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' }}>{VIEW_LABEL[p.view] || p.view}</span>}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => { leaveCollab(); setOpen(false); }} style={{ width: '100%', height: 38, borderRadius: 'var(--r-sm)', border: '1px solid var(--line-3)', background: 'transparent', color: 'var(--text-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Leave session</button>
              </>
            ) : (
              <>
                <div style={{ fontSize: 13.5, color: 'var(--text)', fontWeight: 700, marginBottom: 8 }}>Collaborate live</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Room code" onKeyDown={(e) => { if (e.key === 'Enter' && code.trim()) { joinCollab(code.trim()); setOpen(false); } }} style={{ flex: 1, minWidth: 0, height: 38, padding: '0 10px', borderRadius: 'var(--r-sm)', border: '1px solid var(--line-3)', background: 'var(--field)', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 13 }} />
                  <button type="button" onClick={() => { joinCollab(code.trim() || gen()); setOpen(false); }} style={{ height: 38, padding: '0 14px', borderRadius: 'var(--r-sm)', border: 'none', background: 'var(--accent)', color: 'var(--accent-ink)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Join</button>
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>Enter a code (or leave blank to start a new one), then share it — everyone with the code edits the same project live, peer-to-peer.</div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
