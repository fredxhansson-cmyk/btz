import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Detaches a view into its own browser window (drag it to a second screen).
// The children render through a portal, so they stay in the same React tree —
// the studio state/context is shared and updates live in both windows.
export default function PopOut({ title, theme, onClose, children }) {
  const [container] = useState(() => (typeof document !== 'undefined' ? document.createElement('div') : null));
  const winRef = useRef(null);

  useEffect(() => {
    const w = window.open('', '', 'width=1040,height=720,left=180,top=120');
    if (!w) { onClose(); return undefined; }
    winRef.current = w;
    w.document.title = `BTZ — ${title}`;
    // Clone every stylesheet so the CSS modules + design tokens apply.
    document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
      try { w.document.head.appendChild(node.cloneNode(true)); } catch (e) { /* ignore */ }
    });
    w.document.documentElement.dataset.theme = document.documentElement.dataset.theme || '';
    const b = w.document.body;
    b.style.margin = '0';
    b.style.background = 'var(--bg)';
    b.style.color = 'var(--text)';
    b.style.fontFamily = "'Instrument Sans', system-ui, -apple-system, sans-serif";
    container.style.cssText = 'height:100vh;display:flex;flex-direction:column;overflow:hidden;';
    b.appendChild(container);

    const poll = setInterval(() => { if (w.closed) { clearInterval(poll); onClose(); } }, 400);
    const closeOnExit = () => { try { w.close(); } catch (e) { /* ignore */ } };
    window.addEventListener('beforeunload', closeOnExit);
    return () => {
      clearInterval(poll);
      window.removeEventListener('beforeunload', closeOnExit);
      try { w.close(); } catch (e) { /* ignore */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the detached window's theme in sync with the main window.
  useEffect(() => {
    const w = winRef.current;
    if (w && !w.closed) w.document.documentElement.dataset.theme = theme === 'light' ? 'light' : '';
  }, [theme]);

  if (!container) return null;
  return createPortal(children, container);
}
