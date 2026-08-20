import React from 'react';
import s from '../../styles/studio.module.css';

const FEATURES = [
  { icon: '▦', title: 'Instruments & Step Sequencer', desc: 'Tap the grid to build beats. Each track has its own sound, colour, mute/solo and mixer routing.' },
  { icon: '🎹', title: 'Piano Roll', desc: 'Draw melodies and chords with built-in scale & chord tools, quantise, arpeggiate and humanise.' },
  { icon: '⬢', title: 'Drum Machine', desc: 'A dedicated pad grid with 10 kits, swing, note rolls and choke groups.' },
  { icon: '✨', title: 'BTZ Brain (AI)', desc: 'Generate your own sounds and beats — keep the ones you like and it learns your taste. All local, all free.', accent: true },
  { icon: '♪', title: 'Sound Library', desc: '71 built-in sounds and 10 kits, searchable. Drag in your own audio to make sampler channels.' },
  { icon: '⧉', title: 'Mixer & Mastering', desc: 'Per-channel faders, sends and effects, plus a mastering chain with LUFS metering.' },
  { icon: '🎙', title: 'Record anything', desc: 'Record from your microphone, an external mixer/audio interface, or MIDI instruments.' },
  { icon: '⇩', title: 'Export', desc: 'Bounce to WAV, MP3 or AIFF, export stems per channel, or export MIDI.' },
];

export default function Onboarding({ onClose }) {
  return (
    <div className={s.modalBack} onPointerDown={onClose}>
      <div className={s.onbCard} onPointerDown={(e) => e.stopPropagation()}>
        <div className={s.onbHead}>
          <div className={s.onbMark}>▶</div>
          <div className={s.onbHeadText}>
            <div className={s.onbTitle}>Welcome to BTZ</div>
            <div className={s.onbSub}>A full music studio in your browser. Here&apos;s what you can do:</div>
          </div>
          <button type="button" className={s.onbClose} onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className={s.onbGrid}>
          {FEATURES.map((f) => (
            <div key={f.title} className={f.accent ? `${s.onbFeat} ${s.onbFeatAccent}` : s.onbFeat}>
              <span className={s.onbIcon}>{f.icon}</span>
              <div className={s.onbFeatTitle}>{f.title}</div>
              <div className={s.onbFeatDesc}>{f.desc}</div>
            </div>
          ))}
        </div>

        <div className={s.onbFoot}>
          <span className={s.onbFootHint}>
            Tip: open <b>BTZ Brain</b> to generate sounds &amp; beats · press <b>?</b> for shortcuts · install BTZ as an app from the bar below.
          </span>
          <button type="button" className={s.onbStart} onClick={onClose}>Get started</button>
        </div>
      </div>
    </div>
  );
}
