import React, { useRef } from 'react';
import s from '../../styles/studio.module.css';
import { useStudio, useRaf } from '../../lib/studio/StudioContext';
import { PPQ } from '../../lib/studio/constants';

/**
 * Video track for scoring to picture. Loads a local video file and keeps it
 * locked to the transport playhead in SONG mode, so you can write music against
 * film. Audio comes from the studio; the clip's own sound is muted by default.
 * The loaded video lives in ui state so it survives popping the panel out.
 */
export default function VideoPanel() {
  const {
    ui, setUi, engine, project, popOut, attach, detached,
  } = useStudio();
  const videoRef = useRef(null);
  const out = detached.includes('video');
  const secPerTick = 60 / (Math.max(20, project.bpm) * PPQ);
  const offset = ui.videoOffset || 0;
  const muted = ui.videoMuted !== false;

  const load = (file) => {
    if (!file) return;
    if (ui.videoSrc) { try { URL.revokeObjectURL(ui.videoSrc); } catch (e) { /* noop */ } }
    setUi({ videoSrc: URL.createObjectURL(file), videoName: file.name.slice(0, 40) });
  };

  // Lock the video to the playhead: follow while playing, scrub when stopped.
  useRaf(() => {
    const vd = videoRef.current;
    if (!vd || !ui.videoSrc) return;
    const playing = engine.playing && ui.mode === 'song';
    const pos = (engine.playing || engine.pausedTick) ? engine.currentPosition() : 0;
    const target = Math.max(0, offset + pos * secPerTick);
    if (playing) {
      if (vd.paused) vd.play().catch(() => {});
      if (Math.abs(vd.currentTime - target) > 0.18) vd.currentTime = target;
    } else {
      if (!vd.paused) vd.pause();
      if (Math.abs(vd.currentTime - target) > 0.05) vd.currentTime = target;
    }
  });

  const nudge = (d) => setUi({ videoOffset: Math.round(((ui.videoOffset || 0) + d) * 10) / 10 });

  return (
    <div className={s.panel}>
      <div className={s.panelHead}>
        <span className={s.panelTitle}>Video</span>
        <span className={s.dim}>sync music to picture</span>
        <label className={s.btn} style={{ cursor: 'pointer' }}>
          {ui.videoSrc ? 'Change video…' : 'Load video…'}
          <input
            type="file"
            accept="video/*"
            className={s.hiddenFile}
            onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) load(f); e.target.value = ''; }}
          />
        </label>
        {ui.videoSrc && <span className={s.dim}>{ui.videoName}</span>}
        {ui.videoSrc && (
          <>
            <div className={s.group}>
              <span className={s.dim}>Offset</span>
              <button type="button" className={s.btn} onClick={() => nudge(-0.5)} title="Nudge video earlier">−0.5s</button>
              <span className={s.numBox}>{(ui.videoOffset || 0).toFixed(1)}s</span>
              <button type="button" className={s.btn} onClick={() => nudge(0.5)} title="Nudge video later">+0.5s</button>
            </div>
            <button
              type="button"
              className={muted ? s.btn : `${s.btn} ${s.on}`}
              onClick={() => setUi({ videoMuted: !muted })}
              title="Play the video's own audio too"
            >{muted ? 'Film audio off' : 'Film audio on'}</button>
          </>
        )}
        <div className={s.spacer} />
        <button
          type="button"
          className={s.btn}
          onClick={() => (out ? attach('video') : popOut('video'))}
          title="Open the video in its own window (second screen)"
        >⧉ {out ? 'Bring back' : 'Pop out'}</button>
      </div>
      <div className={s.videoWrap}>
        {ui.videoSrc ? (
          <video
            ref={videoRef}
            className={s.videoEl}
            src={ui.videoSrc}
            muted={muted}
            playsInline
          />
        ) : (
          <div className={s.helpBox}>
            Load a video file to score to picture. In <b>SONG</b> mode the video follows
            the playhead automatically — press play and picture and music roll together.
            Audio comes from the studio; use <b>Offset</b> to line up where the video starts.
          </div>
        )}
      </div>
    </div>
  );
}
