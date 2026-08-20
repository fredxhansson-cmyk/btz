import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

const PLANS = [
  {
    id: 'free', name: 'Free', price: '$0', per: 'forever', accent: false, plan: null,
    tagline: 'The whole studio, on your device.',
    features: ['Full studio (arrange, mix, master)', 'WAV export', 'Light & dark', 'Install as an app', 'A few AI generations / day'],
    cta: 'Start free', href: '/',
  },
  {
    id: 'pro', name: 'Pro', price: '$4', per: '/ month · $29 / yr', accent: true, plan: 'pro_monthly',
    tagline: 'Unlimited AI + every export.',
    features: ['Unlimited BTZ Brain generations', 'MP3 / AIFF / stems export', 'Cloud project save', 'Extra sound packs', 'Priority updates'],
    cta: 'Go Pro',
  },
  {
    id: 'lifetime', name: 'Lifetime', price: '$79', per: 'one-time', accent: false, plan: 'lifetime',
    tagline: 'Everything, forever. No subscription.',
    features: ['All Pro features', 'One payment, keep it for good', 'A fraction of a desktop DAW'],
    cta: 'Get Lifetime',
  },
];

async function startCheckout(plan) {
  try {
    const r = await fetch(`/api/stripe/checkout?plan=${plan}`, { method: 'POST' });
    if (r.status === 401) { window.location.href = '/?signin=1'; return; }
    const d = await r.json();
    if (d.url) window.location.href = d.url;
    else window.alert(d.error || 'Billing is not available yet.');
  } catch (e) { window.alert('Billing is not available yet.'); }
}

export default function Pricing() {
  return (
    <>
      <Head><title>BTZ — Pricing</title></Head>
      <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Instrument Sans', system-ui, sans-serif", padding: 'clamp(28px,6vw,72px) 20px' }}>
        <div style={{ maxWidth: 1040, margin: '0 auto' }}>
          <Link href="/" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: 14 }}>← Back to the studio</Link>
          <h1 style={{ fontSize: 'clamp(28px,5vw,44px)', fontWeight: 700, letterSpacing: '-0.02em', margin: '18px 0 6px' }}>
            B<span style={{ color: 'var(--accent)' }}>TZ</span> pricing
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: 16, margin: '0 0 36px' }}>
            A full AI music studio in your browser — priced far below every desktop DAW.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
            {PLANS.map((p) => (
              <div key={p.id} style={{
                background: 'var(--card)', border: `1px solid ${p.accent ? 'var(--accent)' : 'var(--line)'}`,
                borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column',
                boxShadow: p.accent ? '0 0 40px -12px var(--accent-glow)' : 'none',
              }}>
                {p.accent && <span style={{ alignSelf: 'flex-start', fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--accent-ink)', background: 'var(--accent)', borderRadius: 999, padding: '3px 10px', marginBottom: 10 }}>Most popular</span>}
                <div style={{ fontSize: 18, fontWeight: 600 }}>{p.name}</div>
                <div style={{ margin: '10px 0 2px' }}><span style={{ fontSize: 34, fontWeight: 700 }}>{p.price}</span> <span style={{ color: 'var(--muted)', fontSize: 14 }}>{p.per}</span></div>
                <div style={{ color: 'var(--text-3)', fontSize: 14, marginBottom: 16 }}>{p.tagline}</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 22px', display: 'flex', flexDirection: 'column', gap: 9, flex: 1 }}>
                  {p.features.map((f) => (
                    <li key={f} style={{ fontSize: 14, color: 'var(--text-2)', display: 'flex', gap: 9 }}>
                      <span style={{ color: 'var(--accent)' }}>✓</span>{f}
                    </li>
                  ))}
                </ul>
                {p.plan ? (
                  <button type="button" onClick={() => startCheckout(p.plan)} style={{
                    textAlign: 'center', borderRadius: 10, padding: '13px 18px', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    background: p.accent ? 'var(--accent)' : 'transparent', color: p.accent ? 'var(--accent-ink)' : 'var(--text)',
                    border: p.accent ? 'none' : '1px solid var(--line-3)',
                  }}>{p.cta}</button>
                ) : (
                  <Link href={p.href} style={{
                    textAlign: 'center', textDecoration: 'none', borderRadius: 10, padding: '13px 18px', fontSize: 15, fontWeight: 600,
                    background: 'transparent', color: 'var(--text)', border: '1px solid var(--line-3)',
                  }}>{p.cta}</Link>
                )}
              </div>
            ))}
          </div>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 28 }}>
            Sign in from the studio to manage your subscription. Free to start — no card required.
          </p>
        </div>
      </main>
    </>
  );
}
