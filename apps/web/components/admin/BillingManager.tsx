'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, CreditCard, Users, TrendingUp } from 'lucide-react';

interface Subscription {
  id: string;
  userId: string;
  provider: 'STRIPE' | 'RAZORPAY';
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  user: {
    email: string;
    name: string;
  };
  paymentMethods: {
    type: string;
    last4?: string;
    brand?: string;
    isDefault: boolean;
  }[];
}

interface BillingStats {
  totalSubscriptions: number;
  activeSubscriptions: number;
  subscriptionsByProvider: Record<string, number>;
  recentSubscriptions: {
    id: string;
    userId: string;
    status: string;
    provider: string;
    createdAt: string;
  }[];
}

interface BillingManagerProps {
  className?: string;
}

export function BillingManager({ className }: BillingManagerProps) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscriptions = async () => {
    try {
      const response = await fetch('/api/admin/subscriptions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('clerk-session-token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch subscriptions');
      }

      const data = await response.json();
      setSubscriptions(data.subscriptions);
    } catch (error) {
      setError('Failed to load subscriptions');
      console.error('Error fetching subscriptions:', error);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('clerk-session-token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats');
      }

      const data = await response.json();
      if (data.success) {
        setStats({
          totalSubscriptions: data.dashboard.overview.totalSubscriptions,
          activeSubscriptions: data.dashboard.overview.activeSubscriptions,
          subscriptionsByProvider: data.dashboard.billing.subscriptionsByProvider,
          recentSubscriptions: data.dashboard.billing.recentSubscriptions,
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchSubscriptions(), fetchDashboardStats()]);
      setLoading(false);
    };

    loadData();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      ACTIVE: 'default',
      TRIALING: 'secondary',
      PAST_DUE: 'destructive',
      CANCELED: 'outline',
      INCOMPLETE: 'secondary',
    };

    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status.toLowerCase().replace('_', ' ')}
      </Badge>
    );
  };

  const getProviderBadge = (provider: string) => {
    const colors = {
      STRIPE: 'bg-purple-100 text-purple-800',
      RAZORPAY: 'bg-blue-100 text-blue-800',
    };

    return (
      <Badge className={colors[provider as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {provider}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className={className}>
        <Card>
          <CardContent className="flex justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading billing data...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-red-600">
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Subscriptions</p>
                    <p className="text-2xl font-bold">{stats.totalSubscriptions}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Active Subscriptions</p>
                    <p className="text-2xl font-bold">{stats.activeSubscriptions}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <CreditCard className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Stripe Users</p>
                    <p className="text-2xl font-bold">{stats.subscriptionsByProvider.STRIPE || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <DollarSign className="h-8 w-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Razorpay Users</p>
                    <p className="text-2xl font-bold">{stats.subscriptionsByProvider.RAZORPAY || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="subscriptions" className="w-full">
          <TabsList>
            <TabsTrigger value="subscriptions">All Subscriptions</TabsTrigger>
            <TabsTrigger value="recent">Recent Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="subscriptions">
            <Card>
              <CardHeader>
                <CardTitle>All Subscriptions</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions.map((subscription) => (
                      <TableRow key={subscription.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{subscription.user.name}</div>
                            <div className="text-sm text-gray-600">{subscription.user.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getProviderBadge(subscription.provider)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(subscription.status)}
                          {subscription.cancelAtPeriodEnd && (
                            <div className="text-xs text-orange-600 mt-1">
                              Cancels at period end
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{formatDate(subscription.currentPeriodStart)}</div>
                            <div className="text-gray-600">to {formatDate(subscription.currentPeriodEnd)}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {subscription.paymentMethods.length > 0 ? (
                            <div className="text-sm">
                              {subscription.paymentMethods.map((method, index) => (
                                <div key={index}>
                                  {method.brand} ••••{method.last4}
                                  {method.isDefault && <span className="text-green-600 ml-1">(Default)</span>}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400">No payment method</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-600">
                            Created {formatDate(subscription.createdAt)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recent">
            <Card>
              <CardHeader>
                <CardTitle>Recent Subscription Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {stats?.recentSubscriptions && stats.recentSubscriptions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User ID</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.recentSubscriptions.map((sub) => (
                        <TableRow key={sub.id}>
                          <TableCell>
                            <code className="text-xs">{sub.userId}</code>
                          </TableCell>
                          <TableCell>
                            {getProviderBadge(sub.provider)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(sub.status)}
                          </TableCell>
                          <TableCell>
                            {formatDate(sub.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-600">
                    No recent subscription activity
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}