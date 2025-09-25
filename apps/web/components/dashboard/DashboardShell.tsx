'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser, SignOutButton } from '@clerk/nextjs';
import { ThemeToggle } from '../ui/theme-toggle';
import { UserProfile } from './UserProfile';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Check if auth is disabled
  const isAuthDisabled = process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true';
  
  // Conditionally use Clerk hooks only when auth is enabled
  const clerkUser = isAuthDisabled ? null : useUser();
  const { user, isLoaded } = isAuthDisabled ? { user: null, isLoaded: true } : clerkUser;

  // Role-based navigation - only show admin to users with admin role
  const navigation = [
    { name: '🏠 Dashboard', href: '/dashboard', role: 'all' },
    { name: '🧪 Demo', href: '/demo', role: 'all' },
    { name: '💳 Billing', href: '/billing', role: 'all' },
    { name: '📚 Learn More', href: '/learn-more', role: 'all' },
    { name: '🛠️ Admin', href: '/admin', role: 'admin' }, // Only visible to admins
  ];

  // Check if user has admin role (allow access in dev mode)
  const isAdmin = isAuthDisabled || 
                  user?.publicMetadata?.role === 'admin' || 
                  user?.publicMetadata?.role === 'super_admin' ||
                  user?.emailAddresses?.some(email => 
                    email.emailAddress === 'karthiknaig@gmail.com' || // Your email for testing
                    email.emailAddress?.endsWith('@bebrahma.com') // Company domain
                  );

  // Filter navigation based on user role
  const filteredNavigation = navigation.filter(item => 
    item.role === 'all' || (item.role === 'admin' && isAdmin)
  );

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Navigation Bar */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            {/* Logo - now stays on dashboard */}
            <Link href="/dashboard" className="text-xl font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors">
              BeBrahma
            </Link>
            <div className="flex space-x-6">
              {filteredNavigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                      : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* User Profile Section */}
            {isAuthDisabled ? (
              <div className="flex items-center space-x-3">
                <div className="px-3 py-1.5 text-sm text-green-600 bg-green-100 rounded-md">
                  Auth Disabled (Dev Mode)
                </div>
              </div>
            ) : user && (
              <div className="flex items-center space-x-3">
                <UserProfile />
                <SignOutButton>
                  <button className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-md hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
                    Sign Out
                  </button>
                </SignOutButton>
              </div>
            )}
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
