'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from './ThemeToggle';

// Component for when auth is disabled
function NavigationHeaderNoAuth() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center justify-between gap-3 bg-blue-600 text-white px-4 py-3">
      <div className="flex gap-3 items-center">
        <Link
          href="/"
          className="font-semibold hover:opacity-90"
        >
          BeBrahma
        </Link>

        <>
          <button className="relative capitalize opacity-90 hover:opacity-100">Workflow</button>
          <button className="relative capitalize opacity-90 hover:opacity-100">Firecrawl</button>
          <button className="relative capitalize opacity-90 hover:opacity-100">Documentation</button>
          <button className="relative capitalize opacity-90 hover:opacity-100">Actions Tracker</button>
          <a
            href="/simple-chat"
            className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            🚀 Simple Chat
          </a>
        </>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        <div className="px-3 py-1 bg-green-600 text-white rounded-lg">
          Auth Disabled (Dev Mode)
        </div>
      </div>
    </nav>
  );
}

// Component for when auth is enabled
function NavigationHeaderWithAuth() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const pathname = usePathname();

  const isAdmin = user?.publicMetadata?.role === 'admin';

  return (
    <nav className="flex items-center justify-between gap-3 bg-blue-600 text-white px-4 py-3">
      <div className="flex gap-3 items-center">
        <Link
          href={isSignedIn ? "/dashboard" : "/"}
          className="font-semibold hover:opacity-90"
        >
          BeBrahma
        </Link>

        {isSignedIn && (
          <>
            <Link
              href="/dashboard"
              className={`relative capitalize opacity-90 hover:opacity-100 px-2 py-1 rounded ${pathname === '/dashboard' ? 'bg-blue-700' : ''
                }`}
            >
              Dashboard
            </Link>
            <Link
              href="/simple-chat"
              className={`relative capitalize opacity-90 hover:opacity-100 px-2 py-1 rounded ${pathname === '/simple-chat' ? 'bg-blue-700' : ''
                }`}
            >
              Chat
            </Link>
            <Link
              href="/billing"
              className={`relative capitalize opacity-90 hover:opacity-100 px-2 py-1 rounded ${pathname === '/billing' ? 'bg-blue-700' : ''
                }`}
            >
              Billing
            </Link>
            <Link
              href="/settings"
              className={`relative capitalize opacity-90 hover:opacity-100 px-2 py-1 rounded ${pathname === '/settings' ? 'bg-blue-700' : ''
                }`}
            >
              Settings
            </Link>
          </>
        )}

        {!isSignedIn && (
          <>
            <button className="relative capitalize opacity-90 hover:opacity-100">Workflow</button>
            <button className="relative capitalize opacity-90 hover:opacity-100">Firecrawl</button>
            <button className="relative capitalize opacity-90 hover:opacity-100">Documentation</button>
            <button className="relative capitalize opacity-90 hover:opacity-100">Actions Tracker</button>
            <a
              href="/simple-chat"
              className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              🚀 Simple Chat
            </a>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        {isAdmin && (
          <Link
            href="/admin"
            className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Admin Panel
          </Link>
        )}

        <ThemeToggle />

        {isSignedIn ? (
          <UserButton />
        ) : (
          <div className="flex gap-2">
            <Link
              href="/sign-in"
              className="px-3 py-1 bg-transparent border border-white rounded-lg hover:bg-white hover:text-blue-600 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="px-3 py-1 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}

// Main export that chooses which component to render
export function NavigationHeader() {
  const isAuthDisabled = process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true';

  if (isAuthDisabled) {
    return <NavigationHeaderNoAuth />;
  }

  return <NavigationHeaderWithAuth />;
}