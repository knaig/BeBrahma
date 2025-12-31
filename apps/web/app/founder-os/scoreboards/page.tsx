import { Metadata } from 'next';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus, ArrowLeft, BarChart3 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Scoreboards - Founder OS',
  description: 'Track metrics and measure progress',
};

export default function ScoreboardsPage() {
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
                <h1 className="text-2xl font-bold">Scoreboards</h1>
                <p className="text-sm text-gray-600">Track metrics and measure your progress</p>
              </div>
            </div>
            <Link href="/founder-os/scoreboards/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Scoreboard
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Scoreboard List - Placeholder */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Card className="border-gray-200">
          <CardHeader className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <CardTitle className="text-gray-600">No scoreboards found</CardTitle>
            <CardDescription>Create your first scoreboard to start tracking metrics</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
