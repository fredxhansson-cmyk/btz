/**
 * Sound-pack marketplace. Signed-in users publish preset packs (tiny JSON —
 * synth presets, no audio files); anyone can browse and add them. Stored in
 * Vercel Blob; env-gated on BLOB_READ_WRITE_TOKEN (returns { enabled:false }
 * otherwise, and the app still shows the built-in featured packs).
 *
 *   GET            -> { index:[{id,name,author,desc,count,updatedAt}] }
 *   GET  ?id=..    -> { pack:{...,sounds:[...]} }
 *   POST {name,desc,sounds,author} -> { id }   (Clerk-authed)
 */
import { getAuth } from '@clerk/nextjs/server';

export const config = { api: { bodyParser: { sizeLimit: '4mb' } } };

const IDX = 'market/index.json';
const PACK = (id) => `market/packs/${id}.json`;
async function blob() { return import('@vercel/blob'); }

async function readJson(prefix, token) {
  const { list } = await blob();
  const { blobs } = await list({ prefix, token, limit: 1 });
  if (!blobs.length) return null;
  const r = await fetch(blobs[0].url, { cache: 'no-store' });
  if (!r.ok) return null;
  try { return await r.json(); } catch (e) { return null; }
}
async function writeJson(path, token, data) {
  const { put } = await blob();
  await put(path, JSON.stringify(data), { access: 'public', token, addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' });
}

export default async function handler(req, res) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) { res.status(200).json({ enabled: false }); return; }
  try {
    if (req.method === 'GET') {
      const { id } = req.query;
      if (id) { res.status(200).json({ enabled: true, pack: await readJson(PACK(id), token) }); return; }
      res.status(200).json({ enabled: true, index: (await readJson(IDX, token)) || [] });
      return;
    }
    if (req.method === 'POST') {
      const { userId } = (getAuth(req) || {});
      if (!userId) { res.status(401).json({ error: 'Sign in to publish a pack.' }); return; }
      const { name, desc, sounds, author, price } = req.body || {};
      if (!name || !Array.isArray(sounds) || !sounds.length) { res.status(400).json({ error: 'name + sounds required' }); return; }
      const id = `usr-${Math.random().toString(36).slice(2, 9)}`;
      const now = Date.now();
      const priceNum = Math.max(0, Math.min(999, Number(price) || 0));
      const pack = { id, name: String(name).slice(0, 60), desc: String(desc || '').slice(0, 200), author: String(author || 'Anon').slice(0, 40), price: priceNum, ownerId: userId, sounds: sounds.slice(0, 64), updatedAt: now };
      await writeJson(PACK(id), token, pack);
      const idx = (await readJson(IDX, token)) || [];
      const meta = { id, name: pack.name, author: pack.author, desc: pack.desc, price: priceNum, count: pack.sounds.length, updatedAt: now };
      await writeJson(IDX, token, [meta, ...idx.filter((x) => x.id !== id)].slice(0, 500));
      res.status(200).json({ enabled: true, id });
      return;
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Marketplace error' });
  }
}
