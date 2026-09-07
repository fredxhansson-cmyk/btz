/**
 * Web Audio Modules (WAM 2.0) host — "VSTs for the web".
 *
 * Loads third-party WAM plugins (instruments/effects) at runtime from a URL and
 * exposes their AudioNode + GUI so Fuse can host an open plugin ecosystem — the
 * extensibility that gives a browser DAW real depth. The plugin's code is a
 * native ES module fetched at runtime (webpackIgnore keeps the bundler out of
 * it). Requires CSP to allow the plugin host (see next.config.js / ACTIVATION).
 */
import { initializeWamHost } from '@webaudiomodules/sdk';

let groupId = null;

async function ensureHost(ctx) {
  if (!groupId) { const [id] = await initializeWamHost(ctx); groupId = id; }
  return groupId;
}

/** Load a WAM 2.0 plugin from a URL. Returns { instance, node, gui, name }. */
export async function loadWam(ctx, url) {
  const gid = await ensureHost(ctx);
  const mod = await import(/* webpackIgnore: true */ url);
  const WAM = mod && mod.default;
  if (!WAM || typeof WAM.createInstance !== 'function') {
    throw new Error('That URL is not a WAM 2.0 plugin (no default export with createInstance).');
  }
  const instance = await WAM.createInstance(gid, ctx);
  let gui = null;
  try { gui = await instance.createGui(); } catch (e) { gui = null; }
  const name = (instance.descriptor && instance.descriptor.name) || 'WAM plugin';
  return { instance, node: instance.audioNode, gui, name };
}

export async function destroyWam(loaded) {
  if (!loaded) return;
  try { if (loaded.instance && loaded.gui && loaded.instance.destroyGui) loaded.instance.destroyGui(loaded.gui); } catch (e) { /* noop */ }
  try { if (loaded.instance && loaded.instance.destroy) loaded.instance.destroy(); } catch (e) { /* noop */ }
}
