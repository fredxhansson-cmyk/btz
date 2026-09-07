/**
 * Cloud project sync. Signed-in users (Clerk) get their project library stored
 * in Vercel Blob so it follows them across devices. Fully env-gated: with no
 * BLOB_READ_WRITE_TOKEN it returns { enabled:false } and the app stays on the
 * local (offline) library — nothing breaks. One blob per user holds the whole
 * library { index:[{id,name,updatedAt}], projects:{ [id]: data } }.
 */
import { getAuth } from '@clerk/nextjs/server';

const KEY = (uid) => `fuse-projects/${uid}.json`;

async function blob() { return import('@vercel/blob'); }

async function readStore(uid, token) {
  const { list } = await blob();
  const { blobs } = await list({ prefix: KEY(uid), token, limit: 1 });
  if (!blobs.length) return { index: [], projects: {} };
  const r = await fetch(blobs[0].url, { cache: 'no-store' });
  if (!r.ok) return { index: [], projects: {} };
  try { const d = await r.json(); return { index: d.index || [], projects: d.projects || {} }; } catch (e) { return { index: [], projects: {} }; }
}

async function writeStore(uid, token, store) {
  const { put } = await blob();
  await put(KEY(uid), JSON.stringify(store), { access: 'public', token, addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' });
}

export default async function handler(req, res) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) { res.status(200).json({ enabled: false }); return; }

  let userId = null;
  try { userId = (getAuth(req) || {}).userId; } catch (e) { /* clerk not configured */ }
  if (!userId) { res.status(401).json({ error: 'Sign in to sync projects to the cloud.' }); return; }

  try {
    if (req.method === 'GET') {
      const store = await readStore(userId, token);
      const { id } = req.query;
      if (id) { res.status(200).json({ enabled: true, data: store.projects[id] || null }); return; }
      res.status(200).json({ enabled: true, index: store.index });
      return;
    }
    if (req.method === 'PUT') {
      const { id, data } = req.body || {};
      if (!id || !data) { res.status(400).json({ error: 'id and data required' }); return; }
      const store = await readStore(userId, token);
      store.projects[id] = data;
      const now = Date.now();
      store.index = [...store.index.filter((x) => x.id !== id), { id, name: data.name || 'Untitled', updatedAt: now }];
      await writeStore(userId, token, store);
      res.status(200).json({ enabled: true, id, updatedAt: now });
      return;
    }
    if (req.method === 'DELETE') {
      const { id } = req.query;
      const store = await readStore(userId, token);
      delete store.projects[id];
      store.index = store.index.filter((x) => x.id !== id);
      await writeStore(userId, token, store);
      res.status(200).json({ enabled: true });
      return;
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Cloud sync failed' });
  }
}
