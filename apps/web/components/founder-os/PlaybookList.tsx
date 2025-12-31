'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { founderOSAPI } from '@/lib/founderOS/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Play, CheckCircle, Clock, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type Playbook = {
  id: string;
  name: string;
  description: string;
  goal: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  workspace: {
    id: string;
    name: string;
    slug: string;
  };
  phases: Array<{
    id: string;
    name: string;
    status: string;
    order: number;
  }>;
};

type PlaybookListProps = {
  workspaceSlug?: string;
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 border-gray-300',
  ACTIVE: 'bg-blue-100 text-blue-700 border-blue-300',
  COMPLETED: 'bg-green-100 text-green-700 border-green-300',
  PAUSED: 'bg-yellow-100 text-yellow-700 border-yellow-300',
};

export default function PlaybookList({ workspaceSlug }: PlaybookListProps) {
  const router = useRouter();
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPlaybooks();
  }, [workspaceSlug]);

  const loadPlaybooks = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {};
      if (workspaceSlug) params.workspaceSlug = workspaceSlug;

      const response = await founderOSAPI.playbook.list(params);

      if (response.success) {
        setPlaybooks(response.data);
      } else {
        setError(response.error || 'Failed to load playbooks');
      }
    } catch (err) {
      setError('Failed to load playbooks');
      console.error('Playbook list error:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = (playbook: Playbook) => {
    const total = playbook.phases.length;
    const completed = playbook.phases.filter((p) => p.status === 'COMPLETED').length;
    return total > 0 ? (completed / total) * 100 : 0;
  };

  const handlePlaybookClick = (playbook: Playbook) => {
    router.push(`/founder-os/playbooks/${playbook.id}`);
  };

  const handleStartPlaybook = async (playbook: Playbook, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      const response = await founderOSAPI.playbook.start(playbook.id);
      if (response.success) {
        loadPlaybooks();
        router.push(`/founder-os/playbooks/${playbook.id}/run`);
      }
    } catch (err) {
      console.error('Start playbook error:', err);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mt-2"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50/30">
        <CardHeader>
          <CardTitle className="text-red-700">Error Loading Playbooks</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {playbooks.length === 0 ? (
        <Card className="border-gray-200">
          <CardHeader className="text-center py-12">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <CardTitle className="text-gray-600">No playbooks found</CardTitle>
            <CardDescription>Create your first playbook to guide your startup journey</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {playbooks.map((playbook) => {
            const progress = calculateProgress(playbook);
            const currentPhase = playbook.phases.find((p) => p.status === 'IN_PROGRESS');

            return (
              <Card
                key={playbook.id}
                className="hover:shadow-md transition-shadow cursor-pointer border-l-4"
                style={{
                  borderLeftColor:
                    playbook.status === 'COMPLETED'
                      ? '#10b981'
                      : playbook.status === 'ACTIVE'
                        ? '#3b82f6'
                        : '#9ca3af',
                }}
                onClick={() => handlePlaybookClick(playbook)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className={STATUS_COLORS[playbook.status]}>
                          {playbook.status}
                        </Badge>
                        {playbook.status === 'ACTIVE' && currentPhase && (
                          <span className="text-xs text-gray-500">Phase: {currentPhase.name}</span>
                        )}
                      </div>
                      <CardTitle className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5" />
                        {playbook.name}
                      </CardTitle>
                      <CardDescription className="mt-1">{playbook.description}</CardDescription>
                    </div>
                  </div>

                  {/* Goal */}
                  <div className="mt-3 text-sm">
                    <span className="font-medium text-gray-700">Goal:</span>{' '}
                    <span className="text-gray-600">{playbook.goal}</span>
                  </div>

                  {/* Progress */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                      <span>
                        {playbook.phases.filter((p) => p.status === 'COMPLETED').length} /{' '}
                        {playbook.phases.length} phases
                      </span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 mt-4">
                    {playbook.status === 'DRAFT' && (
                      <Button
                        size="sm"
                        onClick={(e) => handleStartPlaybook(playbook, e)}
                        className="flex-1"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Start Playbook
                      </Button>
                    )}
                    {playbook.status === 'ACTIVE' && (
                      <Button size="sm" variant="default" className="flex-1">
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Continue
                      </Button>
                    )}
                    {playbook.status === 'COMPLETED' && (
                      <Button size="sm" variant="outline" className="flex-1" disabled>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Completed
                      </Button>
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center gap-4 text-xs text-gray-500 mt-4 pt-4 border-t">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {playbook.startedAt
                        ? `Started ${formatDistanceToNow(new Date(playbook.startedAt), { addSuffix: true })}`
                        : `Created ${formatDistanceToNow(new Date(playbook.createdAt), { addSuffix: true })}`}
                    </div>
                    <div>{playbook.workspace.name}</div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
