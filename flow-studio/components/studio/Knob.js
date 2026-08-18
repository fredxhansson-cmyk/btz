import React, { useCallback, useRef, useState } from 'react';
import s from '../../styles/studio.module.css';
import { clamp } from '../../lib/studio/constants';

const norm = (v, spec) => {
  const { min, max, curve } = spec;
  if (curve === 'log') {
    const lo = Math.log(Math.max(1e-4, min));
    const hi = Math.log(Math.max(1e-3, max));
    return clamp((Math.log(Math.max(1e-4, v)) - lo) / (hi - lo), 0, 1);
  }
  return clamp((v - min) / (max - min), 0, 1);
};

const denorm = (n, spec) => {
  const { min, max, curve, step } = spec;
  let v;
  if (curve === 'log') {
    const lo = Math.log(Math.max(1e-4, min));
    const hi = Math.log(Math.max(1e-3, max));
    v = Math.exp(lo + (hi - lo) * n);
  } else {
    v = min + (max - min) * n;
  }
  if (step) v = Math.round(v / step) * step;
  return clamp(v, min, max);
};

const fmt = (v, spec) => {
  const abs = Math.abs(v);
  if (spec.unit === 'Hz' && abs >= 1000) return `${(v / 1000).toFixed(2)}k`;
  if (spec.step >= 1) return String(Math.round(v));
  if (abs >= 100) return v.toFixed(0);
  if (abs >= 10) return v.toFixed(1);
  if (abs >= 1) return v.toFixed(2);
  return v.toFixed(3);
};

export default function Knob({ value, spec, onChange, onCommit, label, size = 34, color = '#ff8a1f' }) {
  const sp = { min: 0, max: 1, def: 0, ...(spec || {}) };
  const ref = useRef(null);
  const drag = useRef(null);
  const [active, setActive] = useState(false);
  const n = norm(value, sp);

  const onPointerDown = useCallback((e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { y: e.clientY, n: norm(value, sp) };
    setActive(true);
  }, [value, sp.min, sp.max, sp.curve]); // eslint-disable-line react-hooks/exhaustive-deps

  const onPointerMove = useCallback((e) => {
    if (!drag.current) return;
    const speed = e.shiftKey ? 600 : 160;
    const next = clamp(drag.current.n - (e.clientY - drag.current.y) / speed, 0, 1);
    onChange(denorm(next, sp), true);
  }, [onChange, sp.min, sp.max, sp.curve, sp.step]); // eslint-disable-line react-hooks/exhaustive-deps

  const end = useCallback(() => {
    if (!drag.current) return;
    drag.current = null;
    setActive(false);
    if (onCommit) onCommit();
  }, [onCommit]);

  const reset = useCallback(() => onChange(sp.def, false), [onChange, sp.def]);

  const angle = -135 + n * 270;
  const r = size / 2;
  const arcR = r - 3;
  const a0 = (-135 * Math.PI) / 180;
  const a1 = ((-135 + n * 270) * Math.PI) / 180;
  const pt = (a, rad) => `${r + Math.sin(a) * rad} ${r - Math.cos(a) * rad}`;
  const large = n * 270 > 180 ? 1 : 0;

  return (
    <div className={s.knob} title={`${label || sp.label || ''}: ${fmt(value, sp)}${sp.unit ? ` ${sp.unit}` : ''}`}>
      <svg
        ref={ref}
        width={size}
        height={size}
        className={active ? `${s.knobDial} ${s.knobActive}` : s.knobDial}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={end}
        onPointerCancel={end}
        onDoubleClick={reset}
      >
        <path d={`M ${pt(a0, arcR)} A ${arcR} ${arcR} 0 1 1 ${pt((135 * Math.PI) / 180, arcR)}`} className={s.knobTrack} />
        {n > 0.001 && (
          <path d={`M ${pt(a0, arcR)} A ${arcR} ${arcR} 0 ${large} 1 ${pt(a1, arcR)}`} stroke={color} className={s.knobArc} />
        )}
        <circle cx={r} cy={r} r={arcR - 4} className={s.knobBody} />
        <line
          x1={r} y1={r}
          x2={r + Math.sin((angle * Math.PI) / 180) * (arcR - 5)}
          y2={r - Math.cos((angle * Math.PI) / 180) * (arcR - 5)}
          className={s.knobPointer}
        />
      </svg>
      {label !== null && (
        <>
          <span className={s.knobLabel}>{label || sp.label}</span>
          <span className={s.knobVal}>{fmt(value, sp)}{sp.unit ? sp.unit.replace('Hz', '') : ''}</span>
        </>
      )}
    </div>
  );
}

export function ChoiceBox({ value, options, onChange, label }) {
  return (
    <div className={s.knob}>
      <select className={s.choice} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      {label && <span className={s.knobLabel}>{label}</span>}
    </div>
  );
}

export function ParamGrid({ params, values, onChange, onCommit, color }) {
  return (
    <div className={s.paramGrid}>
      {Object.entries(params).map(([key, spec]) => (
        spec.kind === 'choice' ? (
          <ChoiceBox
            key={key}
            label={spec.label}
            value={values[key] == null ? spec.def : values[key]}
            options={spec.options}
            onChange={(v) => onChange(key, v, false)}
          />
        ) : (
          <Knob
            key={key}
            label={spec.label}
            spec={spec}
            color={color}
            value={values[key] == null ? spec.def : values[key]}
            onChange={(v, live) => onChange(key, v, live)}
            onCommit={onCommit}
          />
        )
      ))}
    </div>
  );
}
