import React, { useEffect, useMemo, useRef, useState } from 'react';
import s from '../../styles/studio.module.css';

/**
 * Universal command bar (⌘K / Ctrl+K). One box to find and run anything in the
 * studio — the first concrete step toward an intent-first workflow. Actions are
 * supplied by the shell so every panel/state stays wired in one place.
 */
export default function CommandPalette({ actions, onClose }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => { if (inputRef.current) inputRef.current.focus(); }, []);

  // Lightweight fuzzy-ish match: every query word must appear in the haystack.
  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return actions;
    const words = query.split(/\s+/);
    return actions.filter((a) => {
      const hay = `${a.label} ${a.group || ''} ${a.keywords || ''}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [q, actions]);

  useEffect(() => { setSel(0); }, [q]);
  useEffect(() => {
    const el = listRef.current && listRef.current.children[sel];
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }, [sel]);

  const run = (a) => { if (!a) return; onClose(); a.run(); };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((i) => Math.min(results.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); run(results[sel]); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  };

  return (
    <div className={s.cmdBack} onPointerDown={onClose}>
      <div className={s.cmdBox} onPointerDown={(e) => e.stopPropagation()}>
        <div className={s.cmdInputRow}>
          <span className={s.cmdSearchIcon} aria-hidden="true">⌕</span>
          <input
            ref={inputRef}
            className={s.cmdInput}
            value={q}
            placeholder="Type what you want to do — a view, a sound, export, settings…"
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <kbd className={s.cmdEsc}>Esc</kbd>
        </div>
        <div className={s.cmdList} ref={listRef}>
          {results.map((a, i) => (
            <button
              key={a.id}
              type="button"
              className={i === sel ? `${s.cmdItem} ${s.cmdItemSel}` : s.cmdItem}
              onPointerEnter={() => setSel(i)}
              onClick={() => run(a)}
            >
              <span className={s.cmdIcon} aria-hidden="true">{a.icon || '›'}</span>
              <span className={s.cmdLabel}>{a.label}</span>
              {a.group && <span className={s.cmdGroup}>{a.group}</span>}
              {a.hint && <span className={s.cmdHint}>{a.hint}</span>}
            </button>
          ))}
          {!results.length && <div className={s.cmdEmpty}>No matches. Try another word.</div>}
        </div>
      </div>
    </div>
  );
}
