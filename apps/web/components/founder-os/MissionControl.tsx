'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { founderOSAPI, type DashboardData } from '@/lib/founderOS/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Flame,
  Clock,
  ArrowRight,
  AlertCircle,
  FileText,
  CheckCircle2,
  Loader2,
  Calendar,
  TrendingUp,
  BookOpen,
  BarChart3
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface MissionControlProps {
  workspaceSlug?: string;
}

export default function MissionControl({ workspaceSlug }: MissionControlProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboard();
  }, [workspaceSlug]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const response = await founderOSAPI.dashboard.get();
      if (response.success && response.data) {
        setData(response.data);
      } else {
        setError(response.error || 'Failed to load dashboard');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
        <p className="font-medium">Error loading dashboard</p>
        <p className="text-sm">{error}</p>
        <Button onClick={loadDashboard} variant="outline" className="mt-2">
          Retry
        </Button>
      </div>
    );
  }

  if (!data) {
    return <div>No data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.stats.totalTasks}</div>
            <p className="text-xs text-gray-500 mt-1">
              {data.stats.completedToday} completed today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Artifacts This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.stats.artifactsThisWeek}</div>
            <p className="text-xs text-gray-500 mt-1">
              Documents created or edited
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Momentum
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-green-600" />
              <div className="text-3xl font-bold">
                {data.stats.completedToday > 0 ? 'Strong' : 'Building'}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Keep shipping!
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access to Phase 2 Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/founder-os/playbooks">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-purple-200 bg-purple-50/30">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <BookOpen className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Playbooks</CardTitle>
                  <CardDescription className="text-xs">
                    Structured workflows to guide your progress
                  </CardDescription>
                </div>
                <ArrowRight className="h-4 w-4 text-purple-600 ml-auto" />
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/founder-os/scoreboards">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-blue-200 bg-blue-50/30">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Scoreboards</CardTitle>
                  <CardDescription className="text-xs">
                    Track metrics and measure your results
                  </CardDescription>
                </div>
                <ArrowRight className="h-4 w-4 text-blue-600 ml-auto" />
              </div>
            </CardHeader>
          </Card>
        </Link>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* On Fire */}
        <Card className="border-red-200 bg-red-50/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-red-600" />
              <CardTitle className="text-lg">On Fire</CardTitle>
            </div>
            <CardDescription>
              Overdue or due within 24 hours
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.onFire.length === 0 ? (
              <p className="text-sm text-gray-500 italic">
                Nothing urgent! 🎉
              </p>
            ) : (
              <div className="space-y-2">
                {data.onFire.slice(0, 5).map((task: any) => (
                  <TaskCard key={task.id} task={task} variant="urgent" />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* In Progress */}
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">In Progress</CardTitle>
            </div>
            <CardDescription>
              Currently being worked on
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.inProgress.length === 0 ? (
              <p className="text-sm text-gray-500 italic">
                Start something from "Next"
              </p>
            ) : (
              <div className="space-y-2">
                {data.inProgress.slice(0, 5).map((task: any) => (
                  <TaskCard key={task.id} task={task} variant="active" />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Next */}
        <Card className="border-green-200 bg-green-50/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-green-600" />
              <CardTitle className="text-lg">Next</CardTitle>
            </div>
            <CardDescription>
              Top 3 priority actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.next.length === 0 ? (
              <p className="text-sm text-gray-500 italic">
                All caught up!
              </p>
            ) : (
              <div className="space-y-2">
                {data.next.map((task: any) => (
                  <TaskCard key={task.id} task={task} variant="next" />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Blocked */}
        <Card className="border-yellow-200 bg-yellow-50/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <CardTitle className="text-lg">Blocked</CardTitle>
            </div>
            <CardDescription>
              Needs attention to unblock
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.blocked.length === 0 ? (
              <p className="text-sm text-gray-500 italic">
                No blockers 🚀
              </p>
            ) : (
              <div className="space-y-2">
                {data.blocked.map((task: any) => (
                  <TaskCard key={task.id} task={task} variant="blocked" />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active Artifacts & Recent Decisions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Artifacts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-gray-600" />
                <CardTitle className="text-lg">Active Artifacts</CardTitle>
              </div>
              <Link href="/founder-os/artifacts">
                <Button variant="ghost" size="sm">View all</Button>
              </Link>
            </div>
            <CardDescription>
              Recently accessed documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.activeArtifacts.length === 0 ? (
              <p className="text-sm text-gray-500 italic">
                No active artifacts yet
              </p>
            ) : (
              <div className="space-y-2">
                {data.activeArtifacts.map((artifact) => (
                  <Link
                    key={artifact.id}
                    href={`/founder-os/artifacts/${artifact.id}`}
                    className="block p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{artifact.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {artifact.type}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            v{artifact.version}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(artifact.updatedAt), { addSuffix: true })}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Decisions */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-gray-600" />
              <CardTitle className="text-lg">Recent Decisions</CardTitle>
            </div>
            <CardDescription>
              Last 3 decisions made
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentDecisions.length === 0 ? (
              <p className="text-sm text-gray-500 italic">
                No decisions logged yet
              </p>
            ) : (
              <div className="space-y-3">
                {data.recentDecisions.map((decision) => (
                  <Link
                    key={decision.id}
                    href={`/founder-os/artifacts/${decision.id}`}
                    className="block p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    <p className="font-medium text-sm">{decision.title}</p>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                      {decision.content}
                    </p>
                    <span className="text-xs text-gray-500 mt-1 block">
                      {formatDistanceToNow(new Date(decision.createdAt), { addSuffix: true })}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Task Card Component
function TaskCard({ task, variant }: { task: any; variant: 'urgent' | 'active' | 'next' | 'blocked' }) {
  const priorityColor = {
    P0: 'bg-red-100 text-red-800',
    P1: 'bg-orange-100 text-orange-800',
    P2: 'bg-yellow-100 text-yellow-800',
  }[task.priority] || 'bg-gray-100 text-gray-800';

  return (
    <div className="p-3 rounded-lg border bg-white hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="font-medium text-sm">{task.title}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={priorityColor} variant="secondary">
              {task.priority}
            </Badge>
            {task.dueDate && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(task.dueDate) < new Date() ? (
                  <span className="text-red-600 font-medium">Overdue</span>
                ) : (
                  formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
