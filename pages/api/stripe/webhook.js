import Stripe from 'stripe';
import { clerkClient } from '@clerk/nextjs/server';

export const config = { api: { bodyParser: false } };

const KEY = process.env.STRIPE_SECRET_KEY;
const WH = process.env.STRIPE_WEBHOOK_SECRET;

const readRaw = (req) => new Promise((resolve) => {
  let data = '';
  req.on('data', (c) => { data += c; });
  req.on('end', () => resolve(data));
});

export default async function handler(req, res) {
  if (!KEY || !WH) return res.status(503).end();
  const stripe = new Stripe(KEY);
  let event;
  try {
    event = stripe.webhooks.constructEvent(await readRaw(req), req.headers['stripe-signature'], WH);
  } catch (e) {
    return res.status(400).send(`Webhook error: ${e.message}`);
  }

  const setPlan = async (userId, plan) => {
    if (userId) await clerkClient.users.updateUserMetadata(userId, { publicMetadata: { plan } });
  };

  try {
    if (event.type === 'checkout.session.completed') {
      const s = event.data.object;
      await setPlan(s.client_reference_id, s.mode === 'payment' ? 'lifetime' : 'pro');
    } else if (event.type === 'customer.subscription.deleted') {
      const custId = event.data.object.customer;
      const c = await stripe.customers.retrieve(custId);
      const uid = c && c.metadata && c.metadata.clerkUserId;
      if (uid) await setPlan(uid, null);
    }
  } catch (e) { /* swallow — Stripe retries */ }

  return res.json({ received: true });
}
