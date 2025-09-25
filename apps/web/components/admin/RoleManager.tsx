'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
}

export function RoleManager() {
  const { user: currentUser } = useUser();
  const [users, setUsers] = useState<User[]>([
    // Mock data - in real app, fetch from Clerk API
    {
      id: '1',
      email: 'karthiknaig@gmail.com',
      firstName: 'Karthik',
      lastName: 'Naig',
      role: 'admin'
    },
    {
      id: '2',
      email: 'user@example.com',
      firstName: 'Regular',
      lastName: 'User',
      role: 'user'
    }
  ]);

  const [selectedUser, setSelectedUser] = useState<string>('');
  const [newRole, setNewRole] = useState<string>('user');

  // Check if current user is admin
  const isAdmin = currentUser?.publicMetadata?.role === 'admin' || 
                  currentUser?.publicMetadata?.role === 'super_admin' ||
                  currentUser?.emailAddresses?.some(email => 
                    email.emailAddress === 'karthiknaig@gmail.com' || 
                    email.emailAddress?.endsWith('@bebrahma.com')
                  );

  if (!isAdmin) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-lg font-medium text-red-800">Access Denied</h3>
        <p className="text-red-600">You don't have permission to access this page.</p>
      </div>
    );
  }

  const handleRoleChange = async () => {
    if (!selectedUser) return;

    // In a real app, you would call Clerk's API to update user metadata
    // For now, we'll just update the local state
    setUsers(prev => prev.map(user => 
      user.id === selectedUser 
        ? { ...user, role: newRole }
        : user
    ));

    // Reset form
    setSelectedUser('');
    setNewRole('user');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          User Role Management
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Role Assignment */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-700 dark:text-gray-300">Assign Role</h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select User
              </label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Choose a user...</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName} ({user.email}) - {user.role}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                New Role
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>

            <button
              onClick={handleRoleChange}
              disabled={!selectedUser}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Update Role
            </button>
          </div>

          {/* Current Users */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-700 dark:text-gray-300">Current Users</h4>
            
            <div className="space-y-2">
              {users.map(user => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    user.role === 'admin' || user.role === 'super_admin'
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  }`}>
                    {user.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Note</h4>
        <p className="text-blue-700 dark:text-blue-300 text-sm">
          In production, you would integrate with Clerk's API to manage user roles. 
          This is a demonstration of the UI for role management.
        </p>
      </div>
    </div>
  );
}
