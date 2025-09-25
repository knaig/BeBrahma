import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import AdminDashboard from '../../components/AdminDashboard';

export default async function AdminPage() {
  // Check if auth is disabled
  const isAuthDisabled = process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true';
  
  // Conditionally get auth and user only when auth is enabled
  const authResult = isAuthDisabled ? { userId: null } : await auth();
  const user = isAuthDisabled ? null : await currentUser();
  
  if (!isAuthDisabled && !authResult.userId) {
    redirect('/sign-in');
  }
  
  // Check if user has admin role (allow access in dev mode)
  const isAdmin = isAuthDisabled || 
                  user?.publicMetadata?.role === 'admin' || 
                  user?.publicMetadata?.role === 'super_admin' ||
                  user?.emailAddresses?.some(email => 
                    email.emailAddress === 'karthiknaig@gmail.com' || // Your email for testing
                    email.emailAddress?.endsWith('@bebrahma.com') // Company domain
                  );

  if (!isAdmin) {
    redirect('/dashboard'); // Redirect non-admins to dashboard
  }

  return <AdminDashboard />;
}
