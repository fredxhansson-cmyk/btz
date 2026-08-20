import '../styles/tokens.css';
import '../styles/globals.css';
import { ClerkProvider } from '@clerk/nextjs';
import { EntitlementContext } from '../lib/entitlement';
import ClerkEntitlement from '../components/ClerkEntitlement';

const CLERK_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function App({ Component, pageProps }) {
  const page = <Component {...pageProps} />;
  // No Clerk key → everything unlocked, app unchanged.
  if (!CLERK_KEY) {
    return (
      <EntitlementContext.Provider value={{ pro: true, plan: null, signedIn: false }}>
        {page}
      </EntitlementContext.Provider>
    );
  }
  return (
    <ClerkProvider {...pageProps} publishableKey={CLERK_KEY}>
      <ClerkEntitlement>{page}</ClerkEntitlement>
    </ClerkProvider>
  );
}
