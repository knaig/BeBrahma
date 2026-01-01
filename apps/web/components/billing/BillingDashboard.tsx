'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  CreditCard,
  Download,
  Settings,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Calendar,
  DollarSign,
  Activity,
  BarChart3,
  PieChart,
  LineChart
} from 'lucide-react';
import { useAnalytics } from '../analytics/AnalyticsProvider';
import { UsageAnalytics } from './UsageAnalytics';
import { SubscriptionControls } from './SubscriptionControls';

// Subscription plan interface
interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  limits: {
    projects: number;
    tasks: number;
    storage: number;
    apiCalls: number;
  };
  current: boolean;
}

// Billing data interface
interface BillingData {
  subscription: {
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    plan: SubscriptionPlan;
  };
  usage: {
    projects: number;
    tasks: number;
    storage: number;
    apiCalls: number;
    limits: {
      projects: number;
      tasks: number;
      storage: number;
      apiCalls: number;
    };
  };
  invoices: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    date: string;
    pdfUrl?: string;
  }>;
  paymentMethods: Array<{
    id: string;
    type: string;
    last4: string;
    brand: string;
    expMonth: number;
    expYear: number;
    isDefault: boolean;
  }>;
}

// Billing dashboard component
export const BillingDashboard: React.FC = () => {
  // Check if auth is disabled
  const isAuthDisabled = process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true';

  // Conditionally use Clerk hook only when auth is enabled
  const clerkUser = isAuthDisabled ? null : useUser();
  const user = isAuthDisabled ? null : clerkUser?.user;

  const analytics = isAuthDisabled ? null : useAnalytics();
  const trackFeatureUsage = analytics?.trackFeatureUsage || (() => { });

  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'usage' | 'billing' | 'settings'>('overview');

  // Fetch billing data
  useEffect(() => {
    const fetchBillingData = async () => {
      try {
        setLoading(true);

        // In dev mode with auth disabled, use mock data
        if (isAuthDisabled) {
          // Mock billing data for development
          const mockData: BillingData = {
            subscription: {
              status: 'active',
              currentPeriodStart: new Date().toISOString(),
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              cancelAtPeriodEnd: false,
              plan: {
                id: 'free',
                name: 'Free Plan',
                price: 0,
                currency: 'usd',
                interval: 'month',
                features: ['Basic features', 'Limited projects', 'Community support'],
                limits: {
                  projects: 3,
                  tasks: 50,
                  storage: 1024,
                  apiCalls: 1000,
                },
                current: true,
              },
            },
            usage: {
              projects: 1,
              tasks: 12,
              storage: 256,
              apiCalls: 150,
              limits: {
                projects: 3,
                tasks: 50,
                storage: 1024,
                apiCalls: 1000,
              },
            },
            invoices: [],
            paymentMethods: [],
          };

          setBillingData(mockData);
          setLoading(false);
          return;
        }

        // Fetch subscription data
        const subscriptionResponse = await fetch('/api/billing/subscription');
        const subscriptionData = await subscriptionResponse.json();

        // Fetch usage analytics
        const usageResponse = await fetch('/api/analytics/usage/' + user?.id);
        const usageData = await usageResponse.json();

        // Fetch invoices
        const invoicesResponse = await fetch('/api/billing/invoices');
        const invoicesData = await invoicesResponse.json();

        // Fetch payment methods
        const paymentMethodsResponse = await fetch('/api/billing/payment-methods');
        const paymentMethodsData = await paymentMethodsResponse.json();

        // Combine data
        const combinedData: BillingData = {
          subscription: subscriptionData.subscription,
          usage: usageData.usage,
          invoices: invoicesData.invoices,
          paymentMethods: paymentMethodsData.paymentMethods,
        };

        setBillingData(combinedData);

        // Track billing dashboard access
        trackFeatureUsage('billing_dashboard', 'accessed', {
          subscriptionStatus: combinedData.subscription.status,
          planName: combinedData.subscription.plan.name,
        });

      } catch (err) {
        console.error('Error fetching billing data:', err);
        setError('Failed to load billing information');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthDisabled || user) {
      fetchBillingData();
    }
  }, [user, trackFeatureUsage, isAuthDisabled]);

  // Handle tab change
  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    trackFeatureUsage('billing_dashboard', 'tab_changed', { tab });
  };

  // Handle subscription upgrade
  const handleUpgrade = async (planId: string) => {
    try {
      trackFeatureUsage('billing_dashboard', 'subscription_upgrade_started', { planId });

      // Redirect to checkout or handle upgrade
      const response = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });

      const { url } = await response.json();
      window.location.href = url;

    } catch (err) {
      console.error('Error starting upgrade:', err);
      setError('Failed to start upgrade process');
    }
  };

  // Handle subscription cancellation
  const handleCancel = async () => {
    try {
      trackFeatureUsage('billing_dashboard', 'subscription_cancellation_started');

      const response = await fetch('/api/billing/cancel-subscription', {
        method: 'POST',
      });

      if (response.ok) {
        // Refresh billing data
        window.location.reload();
      } else {
        throw new Error('Failed to cancel subscription');
      }

    } catch (err) {
      console.error('Error cancelling subscription:', err);
      setError('Failed to cancel subscription');
    }
  };

  // Handle payment method update
  const handlePaymentMethodUpdate = async (paymentMethodId: string) => {
    try {
      trackFeatureUsage('billing_dashboard', 'payment_method_update_started');

      // Redirect to payment method update
      const response = await fetch('/api/billing/update-payment-method', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethodId }),
      });

      const { url } = await response.json();
      window.location.href = url;

    } catch (err) {
      console.error('Error updating payment method:', err);
      setError('Failed to update payment method');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center transition-colors">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading billing information...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center transition-colors">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Error Loading Billing</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 dark:bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!billingData) {
    return null;
  }

  const { subscription, usage, invoices, paymentMethods } = billingData;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Billing & Subscription</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Manage your subscription, view usage, and update billing information
          </p>
        </div>

        {/* Subscription Status Banner */}
        <div className="mb-6">
          <div className={`rounded-lg p-4 border-l-4 ${subscription.status === 'active'
            ? 'bg-green-50 dark:bg-green-900/20 border-green-400 dark:border-green-600'
            : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-400 dark:border-yellow-600'
            }`}>
            <div className="flex items-center">
              {subscription.status === 'active' ? (
                <CheckCircle className="w-5 h-5 text-green-400 dark:text-green-500 mr-3" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-yellow-400 dark:text-yellow-500 mr-3" />
              )}
              <div>
                <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                  {subscription.status === 'active' ? 'Active Subscription' : 'Subscription Issue'}
                </h3>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  {subscription.status === 'active'
                    ? `You're currently on the ${subscription.plan.name} plan`
                    : 'Please check your payment method or contact support'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6">
          <nav className="flex space-x-8 border-b border-gray-200 dark:border-gray-700">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'usage', label: 'Usage Analytics', icon: Activity },
              { id: 'billing', label: 'Billing History', icon: CreditCard },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => handleTabChange(id as typeof activeTab)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === id
                  ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow transition-colors">
          {activeTab === 'overview' && (
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Current Plan */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Current Plan</h3>
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div className="mb-4">
                    <p className="text-2xl font-bold">{subscription.plan.name}</p>
                    <p className="text-blue-100">
                      ${subscription.plan.price}/{subscription.plan.interval}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {subscription.plan.features.slice(0, 3).map((feature, index) => (
                      <div key={index} className="flex items-center text-sm">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => handleTabChange('settings')}
                    className="mt-4 w-full bg-white/20 hover:bg-white/30 text-white py-2 px-4 rounded-md transition-colors"
                  >
                    Manage Plan
                  </button>
                </div>

                {/* Usage Summary */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage This Month</h3>
                  <div className="space-y-4">
                    {Object.entries(usage).filter(([key]) => key !== 'limits').map(([key, value]) => {
                      const limit = usage.limits[key as keyof typeof usage.limits];
                      const percentage = limit ? (value / limit) * 100 : 0;
                      const isOverLimit = percentage > 100;

                      return (
                        <div key={key} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 capitalize">{key}</span>
                            <span className="font-medium">
                              {value} / {limit || '∞'}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${isOverLimit ? 'bg-red-500' : percentage > 80 ? 'bg-yellow-500' : 'bg-blue-500'
                                }`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => handleTabChange('usage')}
                    className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    View Detailed Usage
                  </button>
                </div>

                {/* Billing Summary */}
                <div className="bg-green-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing Summary</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Next Billing Date</span>
                      <span className="font-medium">
                        {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Payment Method</span>
                      <span className="font-medium">
                        {paymentMethods.find(pm => pm.isDefault)?.brand || 'Not set'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Status</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${subscription.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                        }`}>
                        {subscription.status}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleTabChange('billing')}
                    className="mt-4 w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
                  >
                    View Billing History
                  </button>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <button
                    onClick={() => handleTabChange('settings')}
                    className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <Settings className="w-5 h-5 text-gray-600" />
                    <span className="text-gray-700">Update Plan</span>
                  </button>
                  <button
                    onClick={() => handleTabChange('settings')}
                    className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <CreditCard className="w-5 h-5 text-gray-600" />
                    <span className="text-gray-700">Payment Methods</span>
                  </button>
                  <button
                    onClick={() => handleTabChange('usage')}
                    className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <Activity className="w-5 h-5 text-gray-600" />
                    <span className="text-gray-700">Usage Reports</span>
                  </button>
                  <button
                    onClick={() => handleTabChange('billing')}
                    className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <Download className="w-5 h-5 text-gray-600" />
                    <span className="text-gray-700">Download Invoices</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'usage' && (
            <UsageAnalytics usage={usage} />
          )}

          {activeTab === 'billing' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Billing History</h3>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
                  Download All
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {invoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(invoice.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {subscription.plan.name} Subscription
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${invoice.amount} {invoice.currency.toUpperCase()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${invoice.status === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                            }`}>
                            {invoice.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {invoice.pdfUrl && (
                            <a
                              href={invoice.pdfUrl}
                              className="text-blue-600 hover:text-blue-900"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Download
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <SubscriptionControls
              subscription={subscription}
              paymentMethods={paymentMethods}
              onUpgrade={handleUpgrade}
              onCancel={handleCancel}
              onPaymentMethodUpdate={handlePaymentMethodUpdate}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default BillingDashboard;
