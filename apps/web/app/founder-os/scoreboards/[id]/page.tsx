import { Metadata } from 'next';
import ScoreboardDashboard from '@/components/founder-os/ScoreboardDashboard';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

type Props = {
  params: { id: string };
};

export const metadata: Metadata = {
  title: 'Scoreboard - Founder OS',
  description: 'Track your metrics and progress',
};

export default function ScoreboardPage({ params }: Props) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/founder-os/scoreboards">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Scoreboards
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Scoreboard Dashboard */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <ScoreboardDashboard scoreboardId={params.id} />
      </div>
    </div>
  );
}
