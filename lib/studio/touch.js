// Touch helpers: pointer-type detection, long-press (the touch equivalent of a
// right click) and two-finger pinch/pan for the canvas editors.
import { clamp } from './constants';

export const isCoarsePointer = () => typeof window !== 'undefined'
  && window.matchMedia
  && window.matchMedia('(pointer: coarse)').matches;

export const LONG_PRESS_MS = 420;
const MOVE_TOLERANCE = 10;

/**
 * Creates a long-press tracker. Call `start` on pointerdown, `move` on
 * pointermove and `cancel` on pointerup — `action` fires if the finger stayed
 * put long enough. Mouse and pen input are ignored.
 */
export function longPress() {
  let timer = null;
  let origin = null;
  let fired = false;
  return {
    start(e, action) {
      if (e.pointerType !== 'touch') return;
      origin = { x: e.clientX, y: e.clientY };
      fired = false;
      clearTimeout(timer);
      timer = setTimeout(() => {
        fired = true;
        if (navigator.vibrate) { try { navigator.vibrate(12); } catch (err) { /* ignore */ } }
        action();
      }, LONG_PRESS_MS);
    },
    move(e) {
      if (!origin) return;
      if (Math.hypot(e.clientX - origin.x, e.clientY - origin.y) > MOVE_TOLERANCE) {
        clearTimeout(timer);
        origin = null;
      }
    },
    cancel() {
      clearTimeout(timer);
      origin = null;
    },
    get fired() { return fired; },
  };
}

/**
 * Two-finger pinch to zoom and pan for a canvas that keeps its own
 * {scrollX, pxPerTick} view state.
 */
export function pinchZoom(view, draw, limits = { min: 0.02, max: 4 }) {
  const pointers = new Map();
  let base = null;
  return {
    get active() { return pointers.size >= 2; },
    down(e) {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        base = {
          dist: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
          cx: (a.x + b.x) / 2,
          px: view.current.pxPerTick,
          scrollX: view.current.scrollX,
          scrollY: view.current.scrollY || 0,
          cy: (a.y + b.y) / 2,
        };
      }
      return pointers.size >= 2;
    },
    move(e) {
      if (!pointers.has(e.pointerId)) return false;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size < 2 || !base) return false;
      const [a, b] = [...pointers.values()];
      const dist = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
      const cx = (a.x + b.x) / 2;
      const cy = (a.y + b.y) / 2;
      view.current.pxPerTick = clamp(base.px * (dist / base.dist), limits.min, limits.max);
      view.current.scrollX = Math.max(0, base.scrollX - (cx - base.cx));
      if (view.current.scrollY != null && limits.maxScrollY != null) {
        view.current.scrollY = clamp(base.scrollY - (cy - base.cy), 0, limits.maxScrollY);
      }
      draw();
      return true;
    },
    up(e) {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) base = null;
    },
    clear() { pointers.clear(); base = null; },
  };
}
