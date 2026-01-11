'use client';

import React, { useState } from 'react';
import { CheckCircle, Play, Pause, AlertCircle } from 'lucide-react';
import { Experiment, Direction } from '@/lib/decision-os/types';
import { apiClient } from '@/lib/decision-os/api-client';
import { formatCost } from '@/lib/decision-os/policy-engine';

interface ExperimentRunnerProps {
  experiment: Experiment;
  direction: Direction;
  onUpdate: () => void;
}

export function ExperimentRunner({ experiment, direction, onUpdate }: ExperimentRunnerProps) {
  const [evidenceInput, setEvidenceInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleAddSignal() {
    if (!evidenceInput.trim()) return;

    try {
      setSubmitting(true);
      await apiClient.addEvidence({
        ventureId: experiment.ventureId,
        directionId: experiment.directionId,
        experimentId: experiment.id,
        rung: experiment.targetRung,
        type: 'manual_entry',
        description: evidenceInput,
        data: {},
        source: 'manual',
      });

      setEvidenceInput('');
      onUpdate();
    } catch (error) {
      console.error('Failed to add signal:', error);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCompleteExperiment(passed: boolean) {
    try {
      await apiClient.updateExperiment(experiment.id, {
        status: passed ? 'passed' : 'failed',
        completedAt: new Date().toISOString(),
      });

      if (passed) {
        // Update direction rung
        await apiClient.updateDirection(direction.id, {
          currentRung: experiment.targetRung,
          confidenceScore: Math.min(100, direction.confidenceScore + 15),
        });
      }

      onUpdate();
    } catch (error) {
      console.error('Failed to complete experiment:', error);
    }
  }

  const passedGates = experiment.gates.filter((g) => g.status === 'passed').length;
  const totalGates = experiment.gates.length;
  const progress = totalGates > 0 ? (passedGates / totalGates) * 100 : 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full">
              Running
            </span>
            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
              Grade {experiment.grade}
            </span>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {experiment.title}
          </h3>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            <strong>Hypothesis:</strong> {experiment.hypothesis}
          </p>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            <strong>Approach:</strong> {experiment.approach}
          </p>

          {/* Progress */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600 dark:text-gray-400">
                Progress: {passedGates}/{totalGates} gates
              </span>
              <span className="font-medium text-gray-900 dark:text-white">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Gates */}
          <div className="space-y-2 mb-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Gates:
            </h4>
            {experiment.gates.map((gate, index) => (
              <div
                key={gate.id}
                className="flex items-center gap-2 text-sm"
              >
                {gate.status === 'passed' ? (
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600 flex-shrink-0" />
                )}
                <span className={gate.status === 'passed' ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}>
                  {gate.description}
                </span>
              </div>
            ))}
          </div>

          {/* Latest signals input */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Add latest signal:
            </h4>
            <div className="flex gap-2">
              <input
                type="text"
                value={evidenceInput}
                onChange={(e) => setEvidenceInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddSignal()}
                placeholder="e.g., Completed 10/30 sends, got 2 replies"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
              <button
                onClick={handleAddSignal}
                disabled={submitting || !evidenceInput.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => handleCompleteExperiment(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <CheckCircle className="w-4 h-4" />
          Pass
        </button>
        <button
          onClick={() => handleCompleteExperiment(false)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <AlertCircle className="w-4 h-4" />
          Fail
        </button>
        <button
          onClick={async () => {
            await apiClient.updateExperiment(experiment.id, { status: 'abandoned' });
            onUpdate();
          }}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Abandon
        </button>
      </div>
    </div>
  );
}
