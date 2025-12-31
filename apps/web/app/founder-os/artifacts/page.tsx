import { Metadata } from 'next';
import ArtifactList from '@/components/founder-os/ArtifactList';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus, ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'All Artifacts - Founder OS',
  description: 'Browse all your artifacts',
};

export default function ArtifactsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/founder-os/workspace">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Mission Control
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">All Artifacts</h1>
                <p className="text-sm text-gray-600">Browse and manage your documents</p>
              </div>
            </div>
            <Link href="/founder-os/artifacts/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Artifact
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Artifact List */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <ArtifactList />
      </div>
    </div>
  );
}
