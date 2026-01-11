'use client';

import React, { useState } from 'react';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { Direction, Venture, DecisionGrade } from '@/lib/decision-os/types';
import { PolicyEngine } from '@/lib/decision-os/policy-engine';
import { apiClient } from '@/lib/decision-os/api-client';
import { SoftFrictionModal } from './SoftFrictionModal';

interface DecisionCardProps {
  direction: Direction;
  venture: Venture;
  onAction: () => void;
}

export function DecisionCard({ direction, venture, onAction }: DecisionCardProps) {
  const [showFrictionModal, setShowFrictionModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<'fund' | 'defer' | 'kill' | null>(null);

  // Determine grade based on direction status (simplified)
  const grade: DecisionGrade = direction.status === 'pending' ? 2 : 1;
  const speedMode = PolicyEngine.determineSpeedMode(grade, {
    venture,
    direction,
    actionType: 'fund',
  });

  async function handleAction(action: 'fund' | 'defer' | 'kill') {
    const policy = PolicyEngine.evaluateAction('fund_direction', grade, speedMode, {
      venture,
      direction,
      actionType: action,
    });

    // If soft friction, show modal
    if (policy.friction === 'soft' && grade >= 3) {
      setPendingAction(action);
      setShowFrictionModal(true);
      return;
    }

    // Otherwise, proceed directly
    await executeAction(action, '');
  }

  async function executeAction(action: 'fund' | 'defer' | 'kill', reason: string) {
    try {
      if (action === 'fund') {
        await apiClient.updateDirection(direction.id, { status: 'funded' });
        await apiClient.recordDecision({
          ventureId: venture.id,
          directionId: direction.id,
          actionType: 'fund',
          reason: reason || 'Funding direction',
          confidenceScore: direction.confidenceScore,
          expectedValue: direction.expectedValue,
          currentRung: direction.currentRung,
          userId: venture.userId,
        });
      } else if (action === 'defer') {
        await apiClient.updateDirection(direction.id, { status: 'deferred' });
        await apiClient.recordDecision({
          ventureId: venture.id,
          directionId: direction.id,
          actionType: 'defer',
          reason: reason || 'Deferring direction',
          confidenceScore: direction.confidenceScore,
          expectedValue: direction.expectedValue,
          currentRung: direction.currentRung,
          userId: venture.userId,
        });
      } else if (action === 'kill') {
        await apiClient.updateDirection(direction.id, { status: 'killed' });
        await apiClient.recordDecision({
          ventureId: venture.id,
          directionId: direction.id,
          actionType: 'kill',
          reason: reason || 'Killing direction',
          confidenceScore: direction.confidenceScore,
          expectedValue: direction.expectedValue,
          currentRung: direction.currentRung,
          userId: venture.userId,
        });
      }

      onAction(); // Refresh
    } catch (error) {
      console.error('Failed to execute action:', error);
    }
  }

  function getGradeColor(grade: DecisionGrade): string {
    switch (grade) {
      case 0:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      case 1:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 2:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 3:
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    }
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getGradeColor(grade)}`}>
                Grade {grade}
              </span>
              <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded-full">
                {speedMode === 'fast' ? '⚡ Fast' : '🐢 Slow'}
              </span>
              <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
                {direction.currentRung}
              </span>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Direction: {direction.icp}
            </h3>

            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400 mb-4">
              <p><strong>Problem:</strong> {direction.problem}</p>
              <p><strong>Offer:</strong> {direction.offer}</p>
              <p><strong>Channel:</strong> {direction.channel}</p>
              <p><strong>Price:</strong> {direction.price}</p>
            </div>

            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <div className="text-xs text-gray-500 mb-1">Confidence</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${direction.confidenceScore}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {direction.confidenceScore}%
                  </span>
                </div>
              </div>
              <div className="flex-1">
                <div className="text-xs text-gray-500 mb-1">Expected Value</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500"
                      style={{ width: `${direction.expectedValue}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {direction.expectedValue}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => handleAction('fund')}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            Fund
          </button>
          <button
            onClick={() => handleAction('defer')}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Clock className="w-4 h-4" />
            Defer
          </button>
          <button
            onClick={() => handleAction('kill')}
            className="flex items-center gap-2 px-4 py-2 border border-red-300 dark:border-red-600 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <XCircle className="w-4 h-4" />
            Kill
          </button>
        </div>
      </div>

      {showFrictionModal && pendingAction && (
        <SoftFrictionModal
          title={`${pendingAction.charAt(0).toUpperCase() + pendingAction.slice(1)} Direction`}
          message="This is a Grade 2+ decision. Review carefully."
          recommendations={[
            'Review VC Memo Lite',
            'Check assumption ledger',
            'Verify budget allocation',
          ]}
          onProceed={(reason) => {
            executeAction(pendingAction, reason);
            setShowFrictionModal(false);
            setPendingAction(null);
          }}
          onCancel={() => {
            setShowFrictionModal(false);
            setPendingAction(null);
          }}
        />
      )}
    </>
  );
}
