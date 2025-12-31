'use client';

import { useState, useEffect } from 'react';
import { founderOSAPI } from '@/lib/founderOS/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  BarChart3,
  Plus,
  MessageSquare,
  CheckCircle,
} from 'lucide-react';
import { format } from 'date-fns';

type Metric = {
  id: string;
  name: string;
  type: string;
  target: number;
  unit?: string;
  frequency: string;
  current: number | null;
  average: number;
  trend: number;
  targetProgress: number;
  history: Array<{
    value: number;
    timestamp: string;
    notes?: string;
  }>;
};

type Scoreboard = {
  id: string;
  name: string;
  description: string;
  reviewFrequency: string;
  status: string;
  metrics: Metric[];
  lastUpdatedAt: string | null;
  lastReviewAt: string | null;
  workspace: {
    id: string;
    name: string;
    slug: string;
  };
};

type ScoreboardDashboardProps = {
  scoreboardId: string;
};

export default function ScoreboardDashboard({ scoreboardId }: ScoreboardDashboardProps) {
  const [scoreboard, setScoreboard] = useState<Scoreboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<Metric | null>(null);
  const [metricValue, setMetricValue] = useState('');
  const [metricNotes, setMetricNotes] = useState('');
  const [reviewInsights, setReviewInsights] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadScoreboard();
  }, [scoreboardId]);

  const loadScoreboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await founderOSAPI.scoreboard.get(scoreboardId, 30);

      if (response.success) {
        setScoreboard(response.data);
      } else {
        setError(response.error || 'Failed to load scoreboard');
      }
    } catch (err) {
      setError('Failed to load scoreboard');
      console.error('Scoreboard dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordMetric = async () => {
    if (!selectedMetric || !metricValue) return;

    try {
      setSubmitting(true);

      const response = await founderOSAPI.scoreboard.recordMetric(scoreboardId, {
        metricId: selectedMetric.id,
        value: parseFloat(metricValue),
        notes: metricNotes,
      });

      if (response.success) {
        await loadScoreboard();
        setRecordDialogOpen(false);
        setMetricValue('');
        setMetricNotes('');
        setSelectedMetric(null);
      }
    } catch (err) {
      console.error('Record metric error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateReview = async () => {
    try {
      setSubmitting(true);

      const response = await founderOSAPI.scoreboard.createReview(scoreboardId, {
        insights: reviewInsights,
      });

      if (response.success) {
        await loadScoreboard();
        setReviewDialogOpen(false);
        setReviewInsights('');
      }
    } catch (err) {
      console.error('Create review error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const openRecordDialog = (metric: Metric) => {
    setSelectedMetric(metric);
    setMetricValue(metric.current?.toString() || '');
    setRecordDialogOpen(true);
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'text-green-600';
    if (progress >= 75) return 'text-blue-600';
    if (progress >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-20 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !scoreboard) {
    return (
      <Card className="border-red-200 bg-red-50/30">
        <CardHeader>
          <CardTitle className="text-red-700">Error Loading Scoreboard</CardTitle>
          <CardDescription>{error || 'Scoreboard not found'}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-2xl flex items-center gap-2">
                <BarChart3 className="h-6 w-6" />
                {scoreboard.name}
              </CardTitle>
              <CardDescription className="mt-2">{scoreboard.description}</CardDescription>
              <div className="flex items-center gap-4 mt-4 text-sm">
                <Badge variant="outline">{scoreboard.reviewFrequency} Reviews</Badge>
                {scoreboard.lastReviewAt && (
                  <span className="text-gray-500">
                    Last review: {format(new Date(scoreboard.lastReviewAt), 'MMM d, yyyy')}
                  </span>
                )}
              </div>
            </div>
            <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Create Review
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Review Session</DialogTitle>
                  <DialogDescription>
                    Reflect on your progress and document insights
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Insights & Reflections</label>
                    <Textarea
                      placeholder="What's working? What needs improvement? Key learnings?"
                      value={reviewInsights}
                      onChange={(e) => setReviewInsights(e.target.value)}
                      rows={6}
                      className="mt-2"
                    />
                  </div>
                  <Button onClick={handleCreateReview} disabled={submitting} className="w-full">
                    {submitting ? 'Creating...' : 'Complete Review'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scoreboard.metrics.map((metric) => (
          <Card key={metric.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-base">{metric.name}</CardTitle>
                  <Badge variant="outline" className="mt-2 text-xs">
                    {metric.frequency}
                  </Badge>
                </div>
                {getTrendIcon(metric.trend)}
              </div>
            </CardHeader>
            <CardContent>
              {/* Current Value */}
              <div className="mb-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">
                    {metric.current !== null ? metric.current.toLocaleString() : '--'}
                  </span>
                  {metric.unit && <span className="text-gray-500">{metric.unit}</span>}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Average: {metric.average.toFixed(1)}
                  {metric.unit && ` ${metric.unit}`}
                </div>
              </div>

              {/* Target Progress */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="flex items-center gap-1 text-gray-600">
                    <Target className="h-3 w-3" />
                    Target: {metric.target}
                    {metric.unit && ` ${metric.unit}`}
                  </span>
                  <span className={`font-medium ${getProgressColor(metric.targetProgress)}`}>
                    {Math.round(metric.targetProgress)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      metric.targetProgress >= 100
                        ? 'bg-green-500'
                        : metric.targetProgress >= 75
                          ? 'bg-blue-500'
                          : metric.targetProgress >= 50
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(metric.targetProgress, 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Action Button */}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => openRecordDialog(metric)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Record Value
              </Button>

              {/* Recent History */}
              {metric.history.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs font-medium text-gray-700 mb-2">Recent Entries</p>
                  <div className="space-y-1">
                    {metric.history.slice(-3).reverse().map((entry, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">
                          {format(new Date(entry.timestamp), 'MMM d')}
                        </span>
                        <span className="font-medium">
                          {entry.value}
                          {metric.unit && ` ${metric.unit}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Record Metric Dialog */}
      <Dialog open={recordDialogOpen} onOpenChange={setRecordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record {selectedMetric?.name}</DialogTitle>
            <DialogDescription>
              Add a new data point for {selectedMetric?.frequency.toLowerCase()} tracking
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                Value {selectedMetric?.unit && `(${selectedMetric.unit})`}
              </label>
              <Input
                type="number"
                placeholder="Enter value"
                value={metricValue}
                onChange={(e) => setMetricValue(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Notes (Optional)</label>
              <Textarea
                placeholder="Add context or notes about this data point"
                value={metricNotes}
                onChange={(e) => setMetricNotes(e.target.value)}
                rows={3}
                className="mt-2"
              />
            </div>
            {selectedMetric && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                <p className="font-medium text-blue-900">Target: {selectedMetric.target}</p>
                <p className="text-blue-700 text-xs mt-1">
                  {metricValue && parseFloat(metricValue) >= selectedMetric.target ? (
                    <span className="flex items-center gap-1 text-green-700">
                      <CheckCircle className="h-3 w-3" />
                      Target met!
                    </span>
                  ) : (
                    `Need ${(selectedMetric.target - (parseFloat(metricValue) || 0)).toFixed(1)} more to reach target`
                  )}
                </p>
              </div>
            )}
            <Button onClick={handleRecordMetric} disabled={!metricValue || submitting} className="w-full">
              {submitting ? 'Recording...' : 'Record Value'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
