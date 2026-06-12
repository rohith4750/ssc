import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/login',
  },
});

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * 1. /login
     * 2. /api/auth (NextAuth API routes)
     * 3. /_next/static, /_next/image (static files)
     * 4. /favicon.ico, /images, /public (static assets)
     */
    '/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
