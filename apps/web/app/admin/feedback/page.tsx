import React from 'react';
import { Metadata } from 'next';
import { FeedbackManager } from '../../../components/admin/FeedbackManager';

export const metadata: Metadata = {
  title: 'Feedback Management - BeBrahma Admin',
  description: 'Manage user feedback, bug reports, feature requests, and survey responses',
};

export default function AdminFeedbackPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <FeedbackManager />
    </div>
  );
}
