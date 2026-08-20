import '../styles/tokens.css';
import '../styles/globals.css';
import { ClerkProvider } from '@clerk/nextjs';

const CLERK_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function App({ Component, pageProps }) {
  const page = <Component {...pageProps} />;
  // Auth is optional: with no Clerk key the app runs exactly as before.
  if (!CLERK_KEY) return page;
  return (
    <ClerkProvider {...pageProps} publishableKey={CLERK_KEY}>
      {page}
    </ClerkProvider>
  );
}
