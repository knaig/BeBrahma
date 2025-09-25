import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { SettingsForm } from '@/components/settings/SettingsForm';

export default async function SettingsPage() {
  // Check if auth is disabled
  const isAuthDisabled = process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true';
  
  // Conditionally get user only when auth is enabled
  const user = isAuthDisabled ? null : await currentUser();

  if (!isAuthDisabled && !user) {
    redirect('/sign-in');
  }

  return (
    <DashboardShell>
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white transition-colors duration-200">
              Settings
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your account settings and API keys
            </p>
          </div>
          
          <SettingsForm userId={isAuthDisabled ? 'dev-user' : user?.id || 'unknown'} />
        </div>
      </div>
    </DashboardShell>
  );
}
