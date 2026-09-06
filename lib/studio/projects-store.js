/**
 * Local multi-project library. Saves many named projects in the browser so you
 * can keep a whole catalogue, not just the single autosaved one. No backend —
 * this is the foundation a future account/cloud sync would plug into.
 *
 * Index holds light metadata; each project's data lives under its own key so
 * one big project never blocks reading the list.
 */
const INDEX = 'flowstudio.lib.index';
const ITEM = (id) => `flowstudio.lib.p.${id}`;

function readIndex() {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(window.localStorage.getItem(INDEX)) || []; } catch (e) { return []; }
}
function writeIndex(list) {
  try { window.localStorage.setItem(INDEX, JSON.stringify(list)); } catch (e) { /* noop */ }
}
function newId() {
  // Time-ordered-ish id without relying on crypto; fine for local keys.
  return `p${Date.now().toString(36)}${Math.floor(performance.now() % 1000).toString(36)}`;
}

/** Projects, newest first: [{id, name, updatedAt, hasSamples}]. */
export function listProjects() {
  return readIndex().slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export function loadProject(id) {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(window.localStorage.getItem(ITEM(id))); } catch (e) { return null; }
}

/**
 * Save a project into the library. Pass an existing id to overwrite, or omit to
 * create a new entry. Returns { id, strippedSamples } — strippedSamples is true
 * if samples had to be dropped to fit the browser's storage quota.
 */
export function saveProject(data, id) {
  const useId = id || newId();
  const now = Date.now();
  const name = (data && data.name) || 'Untitled';
  const sampleCount = data && data.samples ? Object.keys(data.samples).length : 0;
  let strippedSamples = false;
  try {
    window.localStorage.setItem(ITEM(useId), JSON.stringify(data));
  } catch (e) {
    try {
      window.localStorage.setItem(ITEM(useId), JSON.stringify({ ...data, samples: {} }));
      strippedSamples = sampleCount > 0;
    } catch (e2) {
      throw new Error('Browser storage is full — free space or export to a file.');
    }
  }
  const list = readIndex().filter((x) => x.id !== useId);
  list.push({ id: useId, name, updatedAt: now, hasSamples: sampleCount > 0 && !strippedSamples });
  writeIndex(list);
  return { id: useId, strippedSamples };
}

export function renameProject(id, name) {
  const data = loadProject(id);
  if (data) { data.name = name; try { window.localStorage.setItem(ITEM(id), JSON.stringify(data)); } catch (e) { /* noop */ } }
  writeIndex(readIndex().map((x) => (x.id === id ? { ...x, name } : x)));
}

export function deleteProject(id) {
  try { window.localStorage.removeItem(ITEM(id)); } catch (e) { /* noop */ }
  writeIndex(readIndex().filter((x) => x.id !== id));
}

export function duplicateProject(id) {
  const data = loadProject(id);
  if (!data) return null;
  const copy = { ...data, name: `${data.name || 'Untitled'} copy` };
  return saveProject(copy).id;
}
