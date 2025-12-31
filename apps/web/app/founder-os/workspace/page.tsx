import { Metadata } from 'next';
import MissionControl from '@/components/founder-os/MissionControl';
import GlobalSearch from '@/components/founder-os/GlobalSearch';
import SessionSummary from '@/components/founder-os/SessionSummary';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus, Settings } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Mission Control - Founder OS',
  description: 'Your founder operating system dashboard',
};

export default function WorkspacePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Mission Control</h1>
              <p className="text-sm text-gray-600">Your Founder Operating System</p>
            </div>
            <div className="flex gap-2">
              <SessionSummary />
              <Link href="/founder-os/artifacts/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Artifact
                </Button>
              </Link>
              <Link href="/founder-os/settings">
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </Link>
            </div>
          </div>

          {/* Global Search */}
          <GlobalSearch />
        </div>
      </div>

      {/* Mission Control Dashboard */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <MissionControl />
      </div>
    </div>
  );
}
