import React from 'react';
import { useUser } from '@clerk/nextjs';
import { EntitlementContext } from '../lib/entitlement';

// Reads the signed-in user's plan from Clerk metadata (set by the Stripe
// webhook) and exposes it as an entitlement. Rendered inside ClerkProvider.
export default function ClerkEntitlement({ children }) {
  const { user, isLoaded } = useUser();
  const plan = user && user.publicMetadata ? user.publicMetadata.plan : null;
  const pro = ['pro', 'lifetime'].includes(plan);
  return (
    <EntitlementContext.Provider value={{ pro, plan: plan || null, signedIn: !!user, ready: isLoaded }}>
      {children}
    </EntitlementContext.Provider>
  );
}
