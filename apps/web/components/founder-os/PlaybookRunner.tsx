'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { founderOSAPI } from '@/lib/founderOS/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle,
  Circle,
  Lock,
  ArrowRight,
  Flag,
  AlertCircle,
  Trophy,
  Clock,
} from 'lucide-react';

type Gate = {
  id: string;
  name: string;
  type: string;
  criteria: string;
  status: string;
  order: number;
  notes: string | null;
};

type Phase = {
  id: string;
  name: string;
  description: string;
  status: string;
  order: number;
  estimatedDuration: string | null;
  startedAt: string | null;
  completedAt: string | null;
  gates: Gate[];
};

type Playbook = {
  id: string;
  name: string;
  description: string;
  goal: string;
  status: string;
  phases: Phase[];
  progress: number;
  stats: {
    totalPhases: number;
    completedPhases: number;
    currentPhase: string | null;
  };
};

type PlaybookRunnerProps = {
  playbookId: string;
};

export default function PlaybookRunner({ playbookId }: PlaybookRunnerProps) {
  const router = useRouter();
  const [playbook, setPlaybook] = useState<Playbook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gateResults, setGateResults] = useState<Record<string, boolean>>({});
  const [completionNotes, setCompletionNotes] = useState('');
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    loadPlaybook();
  }, [playbookId]);

  const loadPlaybook = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await founderOSAPI.playbook.get(playbookId);

      if (response.success) {
        setPlaybook(response.data);

        // Initialize gate results for current phase
        const currentPhase = response.data.phases.find((p: Phase) => p.status === 'IN_PROGRESS');
        if (currentPhase) {
          const initialResults: Record<string, boolean> = {};
          currentPhase.gates.forEach((gate: Gate) => {
            initialResults[gate.id] = gate.status === 'PASSED';
          });
          setGateResults(initialResults);
        }
      } else {
        setError(response.error || 'Failed to load playbook');
      }
    } catch (err) {
      setError('Failed to load playbook');
      console.error('Playbook runner error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGateToggle = (gateId: string, checked: boolean) => {
    setGateResults((prev) => ({
      ...prev,
      [gateId]: checked,
    }));
  };

  const handleCompletePhase = async () => {
    if (!playbook) return;

    const currentPhase = playbook.phases.find((p) => p.status === 'IN_PROGRESS');
    if (!currentPhase) return;

    try {
      setCompleting(true);

      const response = await founderOSAPI.playbook.completePhase(currentPhase.id, {
        gateResults,
        notes: completionNotes,
      });

      if (response.success) {
        await loadPlaybook();
        setCompletionNotes('');

        // Check if playbook is complete
        if (response.data.status === 'COMPLETED') {
          router.push(`/founder-os/playbooks/${playbookId}?completed=true`);
        }
      } else {
        setError(response.error || 'Failed to complete phase');
      }
    } catch (err) {
      setError('Failed to complete phase');
      console.error('Complete phase error:', err);
    } finally {
      setCompleting(false);
    }
  };

  const allGatesPassed = () => {
    return Object.values(gateResults).every((result) => result === true);
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !playbook) {
    return (
      <Card className="border-red-200 bg-red-50/30">
        <CardHeader>
          <CardTitle className="text-red-700">Error Loading Playbook</CardTitle>
          <CardDescription>{error || 'Playbook not found'}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const currentPhase = playbook.phases.find((p) => p.status === 'IN_PROGRESS');

  if (playbook.status === 'COMPLETED') {
    return (
      <Card className="border-green-300 bg-green-50/30">
        <CardHeader className="text-center py-12">
          <Trophy className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <CardTitle className="text-2xl text-green-700">Playbook Completed!</CardTitle>
          <CardDescription className="text-lg mt-2">
            Congratulations! You've completed all phases of "{playbook.name}"
          </CardDescription>
          <div className="mt-6">
            <Button onClick={() => router.push('/founder-os/playbooks')}>Back to Playbooks</Button>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{playbook.name}</CardTitle>
          <CardDescription>{playbook.description}</CardDescription>
          <div className="mt-4">
            <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
              <Flag className="h-4 w-4" />
              <span className="font-medium">Goal:</span> {playbook.goal}
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">Overall Progress</span>
                <span className="font-medium">{Math.round(playbook.progress)}%</span>
              </div>
              <Progress value={playbook.progress} className="h-3" />
              <p className="text-xs text-gray-500 mt-1">
                {playbook.stats.completedPhases} of {playbook.stats.totalPhases} phases completed
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Phase Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Phase Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {playbook.phases.map((phase, index) => (
              <div
                key={phase.id}
                className={`flex items-start gap-3 p-3 rounded-lg ${
                  phase.status === 'IN_PROGRESS'
                    ? 'bg-blue-50 border-2 border-blue-300'
                    : phase.status === 'COMPLETED'
                      ? 'bg-green-50'
                      : 'bg-gray-50'
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {phase.status === 'COMPLETED' ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : phase.status === 'IN_PROGRESS' ? (
                    <Circle className="h-5 w-5 text-blue-600 fill-blue-200" />
                  ) : (
                    <Lock className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">
                      Phase {index + 1}: {phase.name}
                    </h4>
                    {phase.status === 'IN_PROGRESS' && (
                      <Badge variant="default" className="text-xs">
                        Current
                      </Badge>
                    )}
                  </div>
                  {phase.description && (
                    <p className="text-sm text-gray-600 mt-1">{phase.description}</p>
                  )}
                  {phase.estimatedDuration && (
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {phase.estimatedDuration}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Phase Gates */}
      {currentPhase && (
        <Card className="border-2 border-blue-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Circle className="h-5 w-5 text-blue-600 fill-blue-200" />
              Current Phase: {currentPhase.name}
            </CardTitle>
            <CardDescription>
              Complete all gates below to proceed to the next phase
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Gates */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-gray-700">Phase Gates</h3>
              {currentPhase.gates.map((gate) => (
                <div
                  key={gate.id}
                  className={`p-4 border rounded-lg ${
                    gateResults[gate.id]
                      ? 'border-green-300 bg-green-50/30'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={gate.id}
                      checked={gateResults[gate.id] || false}
                      onCheckedChange={(checked) => handleGateToggle(gate.id, checked as boolean)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <label
                        htmlFor={gate.id}
                        className="font-medium cursor-pointer flex items-center gap-2"
                      >
                        {gate.name}
                        <Badge variant="outline" className="text-xs">
                          {gate.type}
                        </Badge>
                      </label>
                      <p className="text-sm text-gray-600 mt-1">{gate.criteria}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Completion Notes */}
            <div className="space-y-2">
              <label htmlFor="notes" className="text-sm font-medium text-gray-700">
                Completion Notes (Optional)
              </label>
              <Textarea
                id="notes"
                placeholder="Add notes about this phase completion..."
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* Complete Phase Button */}
            <div className="flex items-start gap-3">
              {!allGatesPassed() && (
                <div className="flex-1 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">All gates must pass</p>
                      <p className="text-xs text-yellow-700 mt-1">
                        Complete all gate criteria before proceeding
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <Button
                onClick={handleCompletePhase}
                disabled={!allGatesPassed() || completing}
                size="lg"
                className="whitespace-nowrap"
              >
                {completing ? (
                  'Completing...'
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Complete Phase
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
