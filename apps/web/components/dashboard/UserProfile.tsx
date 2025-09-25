'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect, useRef } from 'react';

export function UserProfile() {
  const { user } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  if (!user) return null;

  const isAdmin = user?.publicMetadata?.role === 'admin' || 
                  user?.publicMetadata?.role === 'super_admin' ||
                  user?.emailAddresses?.some(email => 
                    email.emailAddress === 'karthiknaig@gmail.com' || 
                    email.emailAddress?.endsWith('@bebrahma.com')
                  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* User Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-medium">
          {user.firstName?.charAt(0) || user.emailAddresses[0]?.emailAddress?.charAt(0) || 'U'}
        </div>
        <span className="font-medium">
          {user.firstName || user.emailAddresses[0]?.emailAddress}
        </span>
        {isAdmin && (
          <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded-full">
            Admin
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div className="py-2">
            {/* User Info */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {user.emailAddresses[0]?.emailAddress}
              </p>
              {isAdmin && (
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                  Administrator Access
                </p>
              )}
            </div>

            {/* Role Information */}
            <div className="px-4 py-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Role
              </p>
              <p className="text-sm text-gray-900 dark:text-white">
                {isAdmin ? 'Administrator' : 'User'}
              </p>
            </div>

            {/* Actions */}
            <div className="px-4 py-2">
              <button className="w-full text-left px-2 py-1 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                Account Settings
              </button>
              {isAdmin && (
                <button className="w-full text-left px-2 py-1 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                  Admin Panel
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
