import { clerkMiddleware } from '@clerk/nextjs/server';

// Only active when Clerk is configured; otherwise a pass-through so the app
// behaves exactly as before.
export default process.env.CLERK_SECRET_KEY ? clerkMiddleware() : function middleware() {};

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)', '/(api|trpc)(.*)'],
};
