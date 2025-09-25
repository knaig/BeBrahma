import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import Link from 'next/link';

export default async function DashboardPage() {
  // Check if auth is disabled
  const isAuthDisabled = process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true';
  
  // Conditionally get user only when auth is enabled
  const user = isAuthDisabled ? null : await currentUser();

  if (!isAuthDisabled && !user) {
    redirect('/sign-in');
  }

  const isAdmin = isAuthDisabled ? false : user?.publicMetadata?.role === 'admin';
  const userId = isAuthDisabled ? 'dev-user' : user?.id || 'unknown';

  return (
    <DashboardShell>
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white transition-colors duration-200">
                Welcome back, {isAuthDisabled ? 'Developer' : (user?.firstName || 'User')}!
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {isAuthDisabled ? 'Development mode - Auth disabled for testing' : 'Ready to build your next breakthrough?'}
              </p>
            </div>
            <ThemeToggle />
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card className="dark:bg-slate-800 dark:border-slate-700 transition-colors duration-200">
              <CardHeader>
                <CardTitle className="text-lg dark:text-white transition-colors duration-200">Account Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Plan:</span>
                    <span className="text-sm font-medium">Free Trial</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Usage:</span>
                    <span className="text-sm font-medium">12/100 credits</span>
                  </div>
                  <Link href="/billing">
                    <Button variant="outline" size="sm" className="w-full mt-3">
                      Upgrade Plan
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card className="dark:bg-slate-800 dark:border-slate-700 transition-colors duration-200">
              <CardHeader>
                <CardTitle className="text-lg dark:text-white transition-colors duration-200">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Link href="/simple-chat">
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      💬 Start Chat
                    </Button>
                  </Link>
                  <Link href="/settings">
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      🔑 API Keys
                    </Button>
                  </Link>
                  <Link href="/billing">
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      💳 Billing
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {isAdmin && (
              <Card className="dark:bg-slate-800 dark:border-slate-700 transition-colors duration-200">
                <CardHeader>
                  <CardTitle className="text-lg dark:text-white transition-colors duration-200">Admin Panel</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Link href="/admin">
                      <Button variant="outline" size="sm" className="w-full justify-start bg-red-50 hover:bg-red-100 dark:bg-red-900/20">
                        👑 Admin Dashboard
                      </Button>
                    </Link>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Manage users and system settings
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card className="dark:bg-slate-800 dark:border-slate-700 transition-colors duration-200">
              <CardHeader>
                <CardTitle className="text-xl dark:text-white transition-colors duration-200">AI Co-Founder System</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400 mb-4 transition-colors duration-200">
                  Experience the unified chat interface with multi-agent coordination via LangGraph backend.
                </p>
                <div className="space-y-3">
                  <Link href="/simple-chat">
                    <Button 
                      className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                    >
                      🚀 Start New Project
                    </Button>
                  </Link>
                  <Link href="/test-chat">
                    <Button variant="outline" className="w-full dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors duration-200">
                      💬 Test Chat Interface
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
            
            <Card className="dark:bg-slate-800 dark:border-slate-700 transition-colors duration-200">
              <CardHeader>
                <CardTitle className="text-xl dark:text-white transition-colors duration-200">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Business Plan Analysis</span>
                    <span className="text-xs text-gray-500">2h ago</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Market Research</span>
                    <span className="text-xs text-gray-500">1d ago</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Competitor Analysis</span>
                    <span className="text-xs text-gray-500">3d ago</span>
                  </div>
                  <Link href="/simple-chat">
                    <Button variant="outline" size="sm" className="w-full mt-3">
                      View All Projects
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card className="dark:bg-slate-800 dark:border-slate-700 transition-colors duration-200">
            <CardHeader>
              <CardTitle className="text-xl dark:text-white transition-colors duration-200">System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-2xl mb-2">✅</div>
                  <div className="font-semibold text-green-800 dark:text-green-200">Frontend</div>
                  <div className="text-sm text-green-600 dark:text-green-400">Running</div>
                </div>
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-2xl mb-2">🔧</div>
                  <div className="font-semibold text-blue-800 dark:text-blue-200">Backend</div>
                  <div className="text-sm text-blue-600 dark:text-blue-400">Ready</div>
                </div>
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="text-2xl mb-2">🤖</div>
                  <div className="font-semibold text-purple-800 dark:text-purple-200">AI Agents</div>
                  <div className="text-sm text-purple-600 dark:text-purple-400">6 Active</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div className="text-2xl mb-2">💾</div>
                  <div className="font-semibold text-yellow-800 dark:text-yellow-200">Database</div>
                  <div className="text-sm text-yellow-600 dark:text-yellow-400">Connected</div>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </DashboardShell>
  );
}
