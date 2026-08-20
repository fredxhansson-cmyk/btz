import React from 'react';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';

// Rendered only when Clerk is configured (see Studio footer). Shows a Sign in
// button for signed-out users and the user menu for signed-in users.
export default function AuthArea({ className }) {
  return (
    <>
      <SignedOut>
        <SignInButton mode="modal">
          <button type="button" className={className}>Sign in</button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </>
  );
}
