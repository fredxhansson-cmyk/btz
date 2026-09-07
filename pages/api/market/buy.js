/**
 * One-time checkout for a paid sound pack. Env-gated on STRIPE_SECRET_KEY.
 * Uses a dynamic price so no per-pack Stripe Price object is needed.
 * Grant is foundation-level (success redirect → client adds the pack); a
 * production build would verify via the Stripe webhook + a purchases store.
 */
import Stripe from 'stripe';
import { getAuth } from '@clerk/nextjs/server';

const KEY = process.env.STRIPE_SECRET_KEY;

export default async function handler(req, res) {
  if (!KEY) { res.status(200).json({ enabled: false }); return; }
  const { userId } = (getAuth(req) || {});
  if (!userId) { res.status(401).json({ error: 'Sign in to buy.' }); return; }
  const { packId, name, price } = req.body || {};
  const cents = Math.round(Number(price || 0) * 100);
  if (!packId || !cents || cents < 50) { res.status(400).json({ error: 'Invalid pack or price.' }); return; }
  const stripe = new Stripe(KEY);
  const origin = req.headers.origin || `https://${req.headers.host}`;
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      client_reference_id: userId,
      line_items: [{ price_data: { currency: 'usd', unit_amount: cents, product_data: { name: `Fuse pack: ${name || packId}` } }, quantity: 1 }],
      metadata: { packId, userId, kind: 'pack' },
      success_url: `${origin}/?bought=${encodeURIComponent(packId)}`,
      cancel_url: `${origin}/?market=1`,
    });
    res.status(200).json({ enabled: true, url: session.url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
