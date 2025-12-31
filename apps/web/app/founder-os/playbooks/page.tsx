import { Metadata } from 'next';
import PlaybookList from '@/components/founder-os/PlaybookList';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus, ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Playbooks - Founder OS',
  description: 'Structured workflows to guide your startup journey',
};

export default function PlaybooksPage() {
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
                <h1 className="text-2xl font-bold">Playbooks</h1>
                <p className="text-sm text-gray-600">Structured workflows to guide your progress</p>
              </div>
            </div>
            <Link href="/founder-os/playbooks/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Playbook
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Playbook List */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <PlaybookList />
      </div>
    </div>
  );
}
