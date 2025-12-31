'use client';

import { useState, useEffect } from 'react';
import { founderOSAPI } from '@/lib/founderOS/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  FileText,
  CheckCircle,
  Clock,
  Edit,
  Award,
  MessageSquare,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

type SessionSummaryData = {
  sessionStart: string;
  summary: {
    artifactsCreated: number;
    artifactsEdited: number;
    tasksCreated: number;
    tasksCompleted: number;
    decisionsMade: number;
  };
  details: {
    artifactsCreated: Array<{
      id: string;
      title: string;
      type: string;
      createdAt: string;
    }>;
    artifactsEdited: Array<{
      id: string;
      title: string;
      type: string;
      updatedAt: string;
    }>;
    tasksCreated: Array<{
      id: string;
      title: string;
      priority: string;
      status: string;
      createdAt: string;
    }>;
    tasksCompleted: Array<{
      id: string;
      title: string;
      completedAt: string;
    }>;
    decisions: Array<{
      id: string;
      title: string;
      type: string;
      createdAt: string;
    }>;
    openThreads: any[];
  };
};

type SessionSummaryProps = {
  sessionStart?: Date;
  trigger?: React.ReactNode;
};

export default function SessionSummary({ sessionStart, trigger }: SessionSummaryProps) {
  const [data, setData] = useState<SessionSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      loadSessionSummary();
    }
  }, [open]);

  const loadSessionSummary = async () => {
    try {
      setLoading(true);
      setError(null);

      const since = sessionStart?.toISOString();
      const response = await founderOSAPI.dashboard.getSessionSummary(since);

      if (response.success) {
        setData(response.data);
      } else {
        setError(response.error || 'Failed to load session summary');
      }
    } catch (err) {
      setError('Failed to load session summary');
      console.error('Session summary error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTotalActivity = () => {
    if (!data) return 0;
    return (
      data.summary.artifactsCreated +
      data.summary.artifactsEdited +
      data.summary.tasksCompleted +
      data.summary.decisionsMade
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Clock className="h-4 w-4 mr-2" />
            Session Summary
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-blue-600" />
            Session Summary
          </DialogTitle>
          <DialogDescription>
            {data && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Started {formatDistanceToNow(new Date(data.sessionStart), { addSuffix: true })}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded animate-pulse"></div>
            ))}
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card className="border-green-200 bg-green-50/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    Created
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-700">
                    {data.summary.artifactsCreated}
                  </div>
                  <p className="text-xs text-gray-600">Artifacts</p>
                </CardContent>
              </Card>

              <Card className="border-blue-200 bg-blue-50/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-1">
                    <Edit className="h-4 w-4" />
                    Edited
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-700">
                    {data.summary.artifactsEdited}
                  </div>
                  <p className="text-xs text-gray-600">Artifacts</p>
                </CardContent>
              </Card>

              <Card className="border-purple-200 bg-purple-50/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    Completed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-700">
                    {data.summary.tasksCompleted}
                  </div>
                  <p className="text-xs text-gray-600">Tasks</p>
                </CardContent>
              </Card>

              <Card className="border-orange-200 bg-orange-50/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-1">
                    <MessageSquare className="h-4 w-4" />
                    Decisions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-700">
                    {data.summary.decisionsMade}
                  </div>
                  <p className="text-xs text-gray-600">Made</p>
                </CardContent>
              </Card>

              <Card className="border-gray-200 bg-gray-50/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    New Tasks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-700">
                    {data.summary.tasksCreated}
                  </div>
                  <p className="text-xs text-gray-600">Created</p>
                </CardContent>
              </Card>

              <Card className="border-blue-300 bg-blue-100/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-1">
                    <Award className="h-4 w-4" />
                    Total
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-800">{getTotalActivity()}</div>
                  <p className="text-xs text-gray-600">Actions</p>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Breakdown */}
            {data.details.artifactsCreated.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4 text-green-600" />
                    Artifacts Created ({data.details.artifactsCreated.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {data.details.artifactsCreated.map((artifact) => (
                      <li
                        key={artifact.id}
                        className="flex items-center justify-between text-sm py-2 border-b last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {artifact.type.replace(/_/g, ' ')}
                          </Badge>
                          <span>{artifact.title}</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {format(new Date(artifact.createdAt), 'HH:mm')}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {data.details.tasksCompleted.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-purple-600" />
                    Tasks Completed ({data.details.tasksCompleted.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {data.details.tasksCompleted.map((task) => (
                      <li
                        key={task.id}
                        className="flex items-center justify-between text-sm py-2 border-b last:border-0"
                      >
                        <span className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          {task.title}
                        </span>
                        <span className="text-xs text-gray-500">
                          {format(new Date(task.completedAt), 'HH:mm')}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {data.details.decisions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-orange-600" />
                    Decisions Made ({data.details.decisions.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {data.details.decisions.map((decision) => (
                      <li
                        key={decision.id}
                        className="flex items-center justify-between text-sm py-2 border-b last:border-0"
                      >
                        <span>{decision.title}</span>
                        <span className="text-xs text-gray-500">
                          {format(new Date(decision.createdAt), 'HH:mm')}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {getTotalActivity() === 0 && (
              <Card className="border-gray-200">
                <CardContent className="py-8 text-center">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">No activity yet this session</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Start creating artifacts or completing tasks to see your progress
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
