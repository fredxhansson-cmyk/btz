import Stripe from 'stripe';
import { getAuth, clerkClient } from '@clerk/nextjs/server';

const KEY = process.env.STRIPE_SECRET_KEY;

export default async function handler(req, res) {
  if (!KEY) return res.status(503).json({ error: 'Billing is not configured yet.' });
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Sign in first.' });
  const stripe = new Stripe(KEY);
  const origin = req.headers.origin || `https://${req.headers.host}`;
  try {
    const user = await clerkClient.users.getUser(userId);
    const customer = user.privateMetadata && user.privateMetadata.stripeCustomerId;
    if (!customer) return res.status(400).json({ error: 'No billing account yet.' });
    const s = await stripe.billingPortal.sessions.create({ customer, return_url: `${origin}/` });
    return res.json({ url: s.url });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
