import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Check if auth is disabled
const isAuthDisabled = process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true';

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api/protected(.*)',
  '/admin(.*)',
  '/onboarding(.*)',
  '/billing(.*)',
  '/settings(.*)',
  '/api/billing(.*)',
  '/api/user(.*)',
]);

const isAdminRoute = createRouteMatcher([
  '/admin(.*)',
  '/api/admin(.*)',
]);

// Ensure sign-in and sign-up routes are not protected
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/auth(.*)',
  '/demo(.*)',
  '/learn-more(.*)',
  '/',
  '/api/ai(.*)',
  '/api/conversation(.*)',
  '/api/saas(.*)',
  '/simple-chat',
]);

// Create a custom middleware that bypasses Clerk when auth is disabled
export default clerkMiddleware(async (auth, req) => {
  // Skip authentication if disabled for testing
  if (isAuthDisabled) {
    console.log('Middleware: Auth disabled, bypassing all checks');
    return NextResponse.next();
  }

  const { userId, sessionClaims } = await auth();
  const url = req.nextUrl.clone();

  // Redirect authenticated users from root to dashboard
  if (userId && url.pathname === '/') {
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Don't protect public routes
  if (isPublicRoute(req)) return;
  
  // Check admin routes
  if (isAdminRoute(req)) {
    if (!userId) {
      url.pathname = '/sign-in';
      return NextResponse.redirect(url);
    }
    
    // Check if user has admin role
    const userRole = (sessionClaims as any)?.metadata?.role;
    if (userRole !== 'admin') {
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
    return;
  }

  // Protect other routes and redirect to sign-in if not authenticated
  if (isProtectedRoute(req)) {
    if (!userId) {
      url.pathname = '/sign-in';
      return NextResponse.redirect(url);
    }
  }
});

// Temporarily disable middleware when auth is disabled
export const config = {
  matcher: [],
};
