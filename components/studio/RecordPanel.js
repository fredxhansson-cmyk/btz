import React, { useCallback, useEffect, useRef, useState } from 'react';
import s from '../../styles/studio.module.css';
import { useStudio, useRaf } from '../../lib/studio/StudioContext';
import { listAudioInputs, cleanBuffer, bufferToSample } from '../../lib/studio/recording';
import { peaks } from '../../lib/studio/samples';
import Knob from './Knob';

export default function RecordPanel({ onClose }) {
  const { project, dispatch, engine, setHint, play, stop } = useStudio();
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState('');
  const [armed, setArmed] = useState(!!engine.input);
  const [rec, setRec] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [take, setTake] = useState(null);          // {buffer, peaks, name}
  const [monitor, setMonitor] = useState(false);
  const [gain, setGain] = useState(1);
  const [withTransport, setWithTransport] = useState(true);
  const [trim, setTrim] = useState(true);
  const [normalize, setNormalize] = useState(true);
  const [error, setError] = useState('');
  const meterRef = useRef(null);
  const waveRef = useRef(null);
  const startedAt = useRef(0);

  useEffect(() => {
    listAudioInputs().then(setDevices);
  }, [armed]);

  useRaf(() => {
    if (meterRef.current) {
      const lvl = engine.inputLevel();
      meterRef.current.style.width = `${Math.min(100, lvl * 100)}%`;
      meterRef.current.style.background = lvl > 0.97 ? '#ff4d4d' : lvl > 0.8 ? '#ffd43b' : '#7ee787';
    }
    if (rec) setElapsed((performance.now() - startedAt.current) / 1000);
  });

  const enable = useCallback(async () => {
    try {
      setError('');
      await engine.openInput(deviceId || undefined);
      engine.setInputGain(gain);
      engine.setMonitor(monitor);
      setArmed(true);
      setDevices(await listAudioInputs());
    } catch (e) {
      setError(e.message || 'Could not open the input.');
      setArmed(false);
    }
  }, [deviceId, engine, gain, monitor]);

  const drawWave = useCallback((pk) => {
    const canvas = waveRef.current;
    if (!canvas || !pk) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#15171b';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#7ee787';
    for (let i = 0; i < pk.length; i++) {
      const x = (i / pk.length) * w;
      const bh = pk[i] * (h / 2 - 3);
      ctx.fillRect(x, h / 2 - bh, Math.max(1, w / pk.length - 0.5), bh * 2);
    }
  }, []);

  useEffect(() => { if (take) drawWave(take.peaks); }, [take, drawWave]);

  const startRec = async () => {
    if (!armed) { await enable(); }
    if (!engine.input) return;
    setTake(null);
    setError('');
    try {
      const countIn = withTransport ? (project.countIn || 0) : 0;
      if (withTransport) play(undefined, 0);
      const delay = countIn > 0 && engine.ctx
        ? Math.max(0, (engine.startTime - engine.ctx.currentTime) * 1000)
        : 0;
      setTimeout(() => {
        try {
          engine.startRecording();
          startedAt.current = performance.now();
          setRec(true);
        } catch (e) {
          setError(e.message);
        }
      }, delay);
    } catch (e) {
      setError(e.message);
    }
  };

  const stopRec = async () => {
    try {
      const raw = await engine.stopRecording();
      setRec(false);
      if (withTransport) stop();
      const buffer = cleanBuffer(engine.ctx, raw, { trim, normalize });
      setTake({
        buffer,
        peaks: peaks(buffer, 600),
        name: `Take ${new Date().toISOString().slice(11, 19).replace(/:/g, '')}.wav`,
      });
      setHint(`Recording done: ${buffer.duration.toFixed(2)} s.`);
    } catch (e) {
      setRec(false);
      setError(e.message);
    }
  };

  const keep = async (mode) => {
    if (!take) return;
    const sample = await bufferToSample(take.buffer, take.name);
    await engine.decodeSample(sample);
    const target = mode === 'channel' ? null : project.selectedChannel;
    dispatch({ type: 'sample.add', sample, channelId: target, newChannel: mode === 'channel' });
    setHint(mode === 'channel'
      ? `Recording added as a new sampler channel (${(sample.bytes / 1024).toFixed(0)} kB).`
      : 'Recording added to the selected channel.');
    setTake(null);
  };

  return (
    <div className={s.modalBack} onPointerDown={onClose}>
      <div className={s.modal} onPointerDown={(e) => e.stopPropagation()}>
        <div className={s.modalHead}>
          <span className={s.pluginTitle}>Record audio</span>
          <span className={s.dim}>microphone, guitar, keyboard — anything that goes into your audio interface</span>
          <div className={s.spacer} />
          <button type="button" className={s.xBtn} onClick={onClose}>×</button>
        </div>

        <div className={s.recBody}>
          <div className={s.recRow}>
            <select className={s.selectWide} value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>
              <option value="">Default input</option>
              {devices.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
            <button type="button" className={armed ? `${s.btn} ${s.on}` : s.btn} onClick={enable}>
              {armed ? 'Input active' : 'Enable input'}
            </button>
            <button
              type="button"
              className={monitor ? `${s.btn} ${s.on}` : s.btn}
              onClick={() => { setMonitor((m) => { engine.setMonitor(!m); return !m; }); }}
              title="Monitor the input while you play (use headphones)"
            >Monitoring</button>
            <Knob
              size={30} label="Gain" color="#7ee787"
              spec={{ min: 0, max: 4, def: 1 }}
              value={gain}
              onChange={(v) => { setGain(v); engine.setInputGain(v); }}
            />
          </div>

          <div className={s.recMeter}><div className={s.recMeterFill} ref={meterRef} /></div>

          <div className={s.recRow}>
            <button
              type="button"
              className={rec ? `${s.recBtn} ${s.recBtnOn}` : s.recBtn}
              onClick={() => (rec ? stopRec() : startRec())}
            >
              {rec ? `■ Stop (${elapsed.toFixed(1)}s)` : '● Record'}
            </button>
            <label className={s.checkRow}>
              <input type="checkbox" checked={withTransport} onChange={(e) => setWithTransport(e.target.checked)} />
              Play the song while I record
            </label>
            <label className={s.checkRow}>
              <input type="checkbox" checked={trim} onChange={(e) => setTrim(e.target.checked)} />
              Trim silence
            </label>
            <label className={s.checkRow}>
              <input type="checkbox" checked={normalize} onChange={(e) => setNormalize(e.target.checked)} />
              Normalize
            </label>
          </div>

          {error && <div className={s.warnBox}>{error}</div>}

          <canvas ref={waveRef} className={s.recWave} />

          {take ? (
            <div className={s.recRow}>
              <input
                className={s.search}
                value={take.name}
                onChange={(e) => setTake({ ...take, name: e.target.value })}
              />
              <button type="button" className={s.btn} onClick={() => engine.previewSample && engine.previewSample(take.buffer)}>Preview</button>
              <button type="button" className={`${s.btn} ${s.on}`} onClick={() => keep('channel')}>Create channel</button>
              <button type="button" className={s.btn} onClick={() => keep('selected')}>Add to selected channel</button>
              <button type="button" className={s.btn} onClick={() => setTake(null)}>Discard</button>
            </div>
          ) : (
            <div className={s.helpBox}>
              Tip: use headphones when monitoring is on, otherwise you'll get feedback. The recording is saved as
              WAV in the project and can be played back with pitch from the piano roll.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
