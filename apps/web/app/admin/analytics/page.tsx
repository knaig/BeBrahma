import React from 'react';
import { Metadata } from 'next';
import { AnalyticsDashboard } from '../../../components/admin/AnalyticsDashboard';

export const metadata: Metadata = {
  title: 'Analytics Dashboard - BeBrahma Admin',
  description: 'Comprehensive analytics and insights for user behavior, revenue, and system performance',
};

export default function AdminAnalyticsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AnalyticsDashboard />
    </div>
  );
}
