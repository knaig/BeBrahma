import { Metadata } from 'next';
import WorkspaceOnboarding from '@/components/founder-os/WorkspaceOnboarding';

export const metadata: Metadata = {
  title: 'Workspace Setup - Founder OS',
  description: 'Create your Founder OS workspace',
};

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <WorkspaceOnboarding />
    </div>
  );
}
