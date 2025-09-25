'use client';

import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Shield, 
  Zap, 
  Check, 
  X, 
  AlertTriangle, 
  Info,
  Calendar,
  DollarSign,
  Users,
  HardDrive,
  Activity,
  ChevronRight,
  Edit,
  Trash2,
  Plus
} from 'lucide-react';
import { useAnalytics } from '../analytics/AnalyticsProvider';

// Subscription plan interface
interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  limits: {
    projects: number;
    tasks: number;
    storage: number;
    apiCalls: number;
    users: number;
  };
  popular?: boolean;
}

// Payment method interface
interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account';
  last4: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  isExpired: boolean;
}

// Subscription controls props
interface SubscriptionControlsProps {
  subscription: {
    id: string;
    planId: string;
    status: 'active' | 'canceled' | 'past_due' | 'unpaid';
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    plan: SubscriptionPlan;
  };
  paymentMethods: PaymentMethod[];
  onUpgrade: (planId: string) => void;
  onCancel: () => void;
  onPaymentMethodUpdate: (methodId: string, updates: Partial<PaymentMethod>) => void;
}

// Available plans
const AVAILABLE_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: 'month',
    features: [
      'Up to 3 projects',
      'Basic task management',
      '100MB storage',
      '1,000 API calls/month',
      'Single user'
    ],
    limits: {
      projects: 3,
      tasks: 100,
      storage: 100 * 1024 * 1024, // 100MB
      apiCalls: 1000,
      users: 1
    }
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 9,
    interval: 'month',
    features: [
      'Up to 10 projects',
      'Advanced task management',
      '5GB storage',
      '10,000 API calls/month',
      'Up to 3 team members',
      'Priority support'
    ],
    limits: {
      projects: 10,
      tasks: 500,
      storage: 5 * 1024 * 1024 * 1024, // 5GB
      apiCalls: 10000,
      users: 3
    }
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 29,
    interval: 'month',
    popular: true,
    features: [
      'Unlimited projects',
      'Advanced analytics',
      '25GB storage',
      '100,000 API calls/month',
      'Up to 10 team members',
      'Priority support',
      'Custom integrations'
    ],
    limits: {
      projects: -1, // Unlimited
      tasks: -1, // Unlimited
      storage: 25 * 1024 * 1024 * 1024, // 25GB
      apiCalls: 100000,
      users: 10
    }
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99,
    interval: 'month',
    features: [
      'Everything in Professional',
      'Unlimited storage',
      'Unlimited API calls',
      'Unlimited team members',
      'Dedicated support',
      'Custom features',
      'SLA guarantee'
    ],
    limits: {
      projects: -1, // Unlimited
      tasks: -1, // Unlimited
      storage: -1, // Unlimited
      apiCalls: -1, // Unlimited
      users: -1 // Unlimited
    }
  }
];

// Subscription controls component
export const SubscriptionControls: React.FC<SubscriptionControlsProps> = ({
  subscription,
  paymentMethods,
  onUpgrade,
  onCancel,
  onPaymentMethodUpdate
}) => {
  const { trackFeatureUsage } = useAnalytics();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingMethod, setEditingMethod] = useState<string | null>(null);

  // Get current plan
  const currentPlan = AVAILABLE_PLANS.find(plan => plan.id === subscription.planId) || AVAILABLE_PLANS[0];

  // Get next billing date
  const nextBillingDate = new Date(subscription.currentPeriodEnd).toLocaleDateString();

  // Handle plan upgrade
  const handleUpgrade = async (plan: SubscriptionPlan) => {
    setLoading(true);
    try {
      trackFeatureUsage('subscription', 'upgrade_initiated', { 
        fromPlan: currentPlan.id, 
        toPlan: plan.id 
      });
      
      await onUpgrade(plan.id);
      setShowUpgradeModal(false);
      
      trackFeatureUsage('subscription', 'upgrade_completed', { 
        fromPlan: currentPlan.id, 
        toPlan: plan.id 
      });
    } catch (error) {
      console.error('Error upgrading plan:', error);
      trackFeatureUsage('subscription', 'upgrade_failed', { 
        fromPlan: currentPlan.id, 
        toPlan: plan.id, 
        error: error.message 
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle subscription cancellation
  const handleCancel = async () => {
    setLoading(true);
    try {
      trackFeatureUsage('subscription', 'cancel_initiated', { 
        planId: currentPlan.id 
      });
      
      await onCancel();
      setShowCancelModal(false);
      
      trackFeatureUsage('subscription', 'cancel_completed', { 
        planId: currentPlan.id 
      });
    } catch (error) {
      console.error('Error canceling subscription:', error);
      trackFeatureUsage('subscription', 'cancel_failed', { 
        planId: currentPlan.id, 
        error: error.message 
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle payment method update
  const handlePaymentMethodUpdate = async (methodId: string, updates: Partial<PaymentMethod>) => {
    try {
      trackFeatureUsage('payment_method', 'update_initiated', { methodId });
      
      await onPaymentMethodUpdate(methodId, updates);
      setEditingMethod(null);
      
      trackFeatureUsage('payment_method', 'update_completed', { methodId });
    } catch (error) {
      console.error('Error updating payment method:', error);
      trackFeatureUsage('payment_method', 'update_failed', { 
        methodId, 
        error: error.message 
      });
    }
  };

  // Get plan comparison
  const getPlanComparison = (plan: SubscriptionPlan) => {
    const currentLimits = currentPlan.limits;
    const planLimits = plan.limits;
    
    return {
      projects: planLimits.projects > currentLimits.projects ? 'upgrade' : 
                planLimits.projects < currentLimits.projects ? 'downgrade' : 'same',
      tasks: planLimits.tasks > currentLimits.tasks ? 'upgrade' : 
             planLimits.tasks < currentLimits.tasks ? 'downgrade' : 'same',
      storage: planLimits.storage > currentLimits.storage ? 'upgrade' : 
               planLimits.storage < currentLimits.storage ? 'downgrade' : 'same',
      apiCalls: planLimits.apiCalls > currentLimits.apiCalls ? 'upgrade' : 
                planLimits.apiCalls < currentLimits.apiCalls ? 'downgrade' : 'same',
      users: planLimits.users > currentLimits.users ? 'upgrade' : 
             planLimits.users < currentLimits.users ? 'downgrade' : 'same'
    };
  };

  // Get comparison icon
  const getComparisonIcon = (change: 'upgrade' | 'downgrade' | 'same') => {
    switch (change) {
      case 'upgrade':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'downgrade':
        return <X className="w-4 h-4 text-red-500" />;
      default:
        return <span className="w-4 h-4 text-gray-400">—</span>;
    }
  };

  return (
    <div className="p-6">
      {/* Current Subscription Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Current Subscription</h3>
            <p className="text-sm text-gray-600">
              Manage your subscription and billing preferences
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Upgrade Plan
            </button>
            
            {subscription.status === 'active' && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="px-4 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50 transition-colors"
              >
                Cancel Subscription
              </button>
            )}
          </div>
        </div>

        {/* Current Plan Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Shield className="w-5 h-5 text-blue-600 mr-2" />
              <h4 className="font-medium text-blue-900">Current Plan</h4>
            </div>
            <p className="text-2xl font-bold text-blue-900">{currentPlan.name}</p>
            <p className="text-sm text-blue-600">
              ${currentPlan.price}/{currentPlan.interval}
            </p>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Calendar className="w-5 h-5 text-green-600 mr-2" />
              <h4 className="font-medium text-green-900">Next Billing</h4>
            </div>
            <p className="text-lg font-semibold text-green-900">{nextBillingDate}</p>
            <p className="text-sm text-green-600">
              {subscription.cancelAtPeriodEnd ? 'Will cancel after this period' : 'Auto-renewal enabled'}
            </p>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Activity className="w-5 h-5 text-purple-600 mr-2" />
              <h4 className="font-medium text-purple-900">Status</h4>
            </div>
            <p className="text-lg font-semibold text-purple-900 capitalize">{subscription.status}</p>
            <p className="text-sm text-purple-600">
              {subscription.status === 'active' ? 'All services active' : 'Some services may be limited'}
            </p>
          </div>
        </div>

        {/* Current Plan Features */}
        <div className="mt-6">
          <h4 className="font-medium text-gray-900 mb-3">Your Plan Features</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(currentPlan.limits).map(([key, value]) => (
              <div key={key} className="text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  {key === 'projects' && <Zap className="w-6 h-6 text-gray-600" />}
                  {key === 'tasks' && <Check className="w-6 h-6 text-gray-600" />}
                  {key === 'storage' && <HardDrive className="w-6 h-6 text-gray-600" />}
                  {key === 'apiCalls' && <Activity className="w-6 h-6 text-gray-600" />}
                  {key === 'users' && <Users className="w-6 h-6 text-gray-600" />}
                </div>
                <p className="text-sm font-medium text-gray-900 capitalize">{key}</p>
                <p className="text-xs text-gray-600">
                  {value === -1 ? 'Unlimited' : value.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Payment Methods</h3>
            <p className="text-sm text-gray-600">
              Manage your payment methods and billing information
            </p>
          </div>
          
          <button
            onClick={() => setShowPaymentModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Payment Method</span>
          </button>
        </div>

        <div className="space-y-4">
          {paymentMethods.map((method) => (
            <div key={method.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-gray-600" />
                </div>
                
                <div>
                  <div className="flex items-center space-x-2">
                    <p className="font-medium text-gray-900">
                      {method.brand || 'Card'} •••• {method.last4}
                    </p>
                    {method.isDefault && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        Default
                      </span>
                    )}
                    {method.isExpired && (
                      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                        Expired
                      </span>
                    )}
                  </div>
                  
                  {method.expiryMonth && method.expiryYear && (
                    <p className="text-sm text-gray-600">
                      Expires {method.expiryMonth}/{method.expiryYear}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {method.isDefault ? (
                  <button
                    onClick={() => handlePaymentMethodUpdate(method.id, { isDefault: false })}
                    className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    Remove Default
                  </button>
                ) : (
                  <button
                    onClick={() => handlePaymentMethodUpdate(method.id, { isDefault: true })}
                    className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                  >
                    Set Default
                  </button>
                )}
                
                <button
                  onClick={() => setEditingMethod(method.id)}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                  title="Edit payment method"
                >
                  <Edit className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to remove this payment method?')) {
                      // Handle removal
                    }
                  }}
                  className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                  title="Remove payment method"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          
          {paymentMethods.length === 0 && (
            <div className="text-center py-8">
              <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No payment methods added yet</p>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Add your first payment method
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Billing History */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Billing History</h3>
            <p className="text-sm text-gray-600">
              View and download your billing invoices
            </p>
          </div>
          
          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">
            View All Invoices
          </button>
        </div>

        <div className="space-y-4">
          {/* Recent invoices would be displayed here */}
          <div className="text-center py-8 text-gray-600">
            <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p>Billing history will be displayed here</p>
          </div>
        </div>
      </div>

      {/* Upgrade Plan Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Upgrade Your Plan</h2>
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Choose the plan that best fits your needs
              </p>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {AVAILABLE_PLANS.map((plan) => {
                  const isCurrentPlan = plan.id === currentPlan.id;
                  const comparison = getPlanComparison(plan);
                  
                  return (
                    <div
                      key={plan.id}
                      className={`relative border rounded-lg p-6 ${
                        plan.popular ? 'border-blue-500 ring-2 ring-blue-500' : 'border-gray-200'
                      } ${isCurrentPlan ? 'bg-gray-50' : 'bg-white'}`}
                    >
                      {plan.popular && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                          <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                            Most Popular
                          </span>
                        </div>
                      )}
                      
                      {isCurrentPlan && (
                        <div className="absolute -top-3 right-4">
                          <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                            Current Plan
                          </span>
                        </div>
                      )}

                      <div className="text-center mb-6">
                        <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                        <div className="mt-2">
                          <span className="text-3xl font-bold text-gray-900">${plan.price}</span>
                          <span className="text-gray-600">/{plan.interval}</span>
                        </div>
                      </div>

                      <ul className="space-y-3 mb-6">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-start">
                            <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-700">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="space-y-3 mb-6">
                        <h4 className="font-medium text-gray-900 text-sm">Plan Comparison</h4>
                        {Object.entries(comparison).map(([key, change]) => (
                          <div key={key} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 capitalize">{key}</span>
                            {getComparisonIcon(change)}
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => handleUpgrade(plan)}
                        disabled={isCurrentPlan || loading}
                        className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
                          isCurrentPlan
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {isCurrentPlan ? 'Current Plan' : 'Upgrade to This Plan'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Subscription Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <AlertTriangle className="w-8 h-8 text-red-500 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900">Cancel Subscription</h2>
              </div>
              
              <p className="text-gray-600 mb-6">
                Are you sure you want to cancel your subscription? You'll continue to have access to all features until the end of your current billing period on <strong>{nextBillingDate}</strong>.
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Keep Subscription
                </button>
                <button
                  onClick={handleCancel}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Canceling...' : 'Cancel Subscription'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Payment Method Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Add Payment Method</h2>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <p className="text-gray-600 mb-6">
                Add a new payment method to your account. This will be used for future billing.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Card Number
                  </label>
                  <input
                    type="text"
                    placeholder="1234 5678 9012 3456"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Expiry Date
                    </label>
                    <input
                      type="text"
                      placeholder="MM/YY"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CVC
                    </label>
                    <input
                      type="text"
                      placeholder="123"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                  Add Payment Method
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionControls;
