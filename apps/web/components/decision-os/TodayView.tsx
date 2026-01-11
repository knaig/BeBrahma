'use client';

import React, { useState, useEffect } from 'react';
import {
  Play,
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  Eye,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Experiment, Direction, Venture, EvidenceRung } from '@/lib/decision-os/types';
import { apiClient } from '@/lib/decision-os/api-client';
import { formatCost, cheapSignalHint } from '@/lib/decision-os/policy-engine';
import { DecisionCard } from './DecisionCard';
import { ExperimentRunner } from './ExperimentRunner';
import { SoftFrictionModal } from './SoftFrictionModal';

interface TodayViewProps {
  ventureId: string;
}

export function TodayView({ ventureId }: TodayViewProps) {
  const [venture, setVenture] = useState<Venture | null>(null);
  const [directions, setDirections] = useState<Direction[]>([]);
  const [activeExperiment, setActiveExperiment] = useState<Experiment | null>(null);
  const [nextExperiment, setNextExperiment] = useState<Experiment | null>(null);
  const [preparedOutputs, setPreparedOutputs] = useState<any[]>([]);
  const [showWhyThis, setShowWhyThis] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [ventureId]);

  async function loadData() {
    try {
      setLoading(true);
      const [ventureData, directionsData, activeExp, nextExp] = await Promise.all([
        apiClient.getVenture(ventureId),
        apiClient.getDirections(ventureId),
        apiClient.getActiveExperiment(ventureId),
        apiClient.getNextExperiment(ventureId),
      ]);

      setVenture(ventureData);
      setDirections(directionsData);
      setActiveExperiment(activeExp);
      setNextExperiment(nextExp);

      // Mock prepared outputs (Grade 0)
      setPreparedOutputs([
        {
          type: 'outreach_copy',
          title: 'Email variants A + B',
          description: 'Pain-focused vs benefit-focused subject lines',
        },
        {
          type: 'icp_shortlist',
          title: '20 target companies',
          description: 'SME finance teams with 10-50 employees',
        },
      ]);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRunNextLoop() {
    try {
      await apiClient.runLoopTick(ventureId);
      await loadData(); // Refresh
    } catch (error) {
      console.error('Failed to run loop:', error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading today...</p>
        </div>
      </div>
    );
  }

  const decisionQueue = directions.filter((d) => d.status === 'pending').slice(0, 3);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Today
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <button
          onClick={handleRunNextLoop}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Play className="w-4 h-4" />
          Run next loop
        </button>
      </div>

      {/* Decision Queue */}
      {decisionQueue.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Decision Queue ({decisionQueue.length})
            </h2>
            <span className="text-sm text-gray-500">Max 3 items</span>
          </div>

          {decisionQueue.map((direction) => (
            <DecisionCard
              key={direction.id}
              direction={direction}
              venture={venture!}
              onAction={loadData}
            />
          ))}
        </div>
      )}

      {/* Active Experiment Runner */}
      {activeExperiment && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Running Now
          </h2>
          <ExperimentRunner
            experiment={activeExperiment}
            direction={directions.find((d) => d.id === activeExperiment.directionId)!}
            onUpdate={loadData}
          />
        </div>
      )}

      {/* Next Experiment Card */}
      {nextExperiment && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Next Experiment
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {nextExperiment.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {nextExperiment.hypothesis}
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
                    Grade {nextExperiment.grade}
                  </span>
                  <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded-full">
                    {nextExperiment.speedMode === 'fast' ? '⚡ Fast' : '🐢 Slow'}
                  </span>
                  <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded-full">
                    {formatCost(
                      nextExperiment.estimatedHours,
                      nextExperiment.estimatedSends,
                      nextExperiment.estimatedSpend
                    )}
                  </span>
                  <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full">
                    → {nextExperiment.targetRung}
                  </span>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Pass criteria:
                  </h4>
                  {nextExperiment.gates.map((gate, index) => (
                    <div
                      key={gate.id}
                      className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
                    >
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs">
                        {index + 1}
                      </div>
                      <span>{gate.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={async () => {
                  await apiClient.updateExperiment(nextExperiment.id, {
                    status: 'running',
                    startedAt: new Date().toISOString(),
                  });
                  await loadData();
                }}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Play className="w-4 h-4" />
                Run
              </button>
              <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Modify
              </button>
              <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Defer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prepared for You (Grade 0 outputs) */}
      {preparedOutputs.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Prepared for You
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {preparedOutputs.map((output, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <Eye className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                      {output.title}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {output.description}
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                    View →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Why This (Collapsible) */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
        <button
          onClick={() => setShowWhyThis(!showWhyThis)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Why this?
          </span>
          {showWhyThis ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </button>
        {showWhyThis && (
          <div className="px-4 pb-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p>• Decision Queue shows top 3 directions needing funding decisions</p>
            <p>• Active experiment tracks current validation work</p>
            <p>• Next experiment is highest-priority queued work</p>
            <p>• Prepared outputs are Grade 0 (auto-run) - no approval needed</p>
          </div>
        )}
      </div>
    </div>
  );
}
