import React from 'react';
import { Metadata } from 'next';
import { BillingDashboard } from '../../components/billing/BillingDashboard';

export const metadata: Metadata = {
  title: 'Billing & Subscription - BeBrahma',
  description: 'Manage your subscription, view usage analytics, and handle billing preferences',
};

export default function BillingPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors">
      <BillingDashboard />
    </div>
  );
}
