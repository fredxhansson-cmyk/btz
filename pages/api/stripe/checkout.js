import Stripe from 'stripe';
import { getAuth, clerkClient } from '@clerk/nextjs/server';

const KEY = process.env.STRIPE_SECRET_KEY;

const PRICES = {
  pro_monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY,
  pro_yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY,
  lifetime: process.env.STRIPE_PRICE_LIFETIME,
};

export default async function handler(req, res) {
  if (!KEY) return res.status(503).json({ error: 'Billing is not configured yet.' });
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Sign in first.' });

  const plan = String(req.query.plan || (req.body && req.body.plan) || 'pro_monthly');
  const price = PRICES[plan];
  if (!price) return res.status(400).json({ error: 'Unknown plan.' });

  const stripe = new Stripe(KEY);
  const origin = req.headers.origin || `https://${req.headers.host}`;
  try {
    const user = await clerkClient.users.getUser(userId);
    let customer = user.privateMetadata && user.privateMetadata.stripeCustomerId;
    if (!customer) {
      const email = user.emailAddresses && user.emailAddresses[0] && user.emailAddresses[0].emailAddress;
      const c = await stripe.customers.create({ email, metadata: { clerkUserId: userId } });
      customer = c.id;
      await clerkClient.users.updateUserMetadata(userId, { privateMetadata: { stripeCustomerId: customer } });
    }
    const session = await stripe.checkout.sessions.create({
      mode: plan === 'lifetime' ? 'payment' : 'subscription',
      customer,
      client_reference_id: userId,
      line_items: [{ price, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${origin}/?upgraded=1`,
      cancel_url: `${origin}/pricing`,
    });
    return res.json({ url: session.url });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
