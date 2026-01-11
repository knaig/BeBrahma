'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Direction, Venture, VCMemoLite } from '@/lib/decision-os/types';
import { apiClient } from '@/lib/decision-os/api-client';

interface VCMemoCardProps {
  direction: Direction;
  venture: Venture;
  rank: number;
  onAction: () => void;
}

export function VCMemoCard({ direction, venture, rank, onAction }: VCMemoCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [memo, setMemo] = useState<VCMemoLite | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (expanded && !memo) {
      loadMemo();
    }
  }, [expanded]);

  async function loadMemo() {
    try {
      setLoading(true);
      const memoData = await apiClient.getVCMemoLite(direction.id);
      setMemo(memoData);
    } catch (error) {
      console.error('Failed to load memo:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleFund() {
    try {
      // Allocate default budgets (can be customized later)
      await apiClient.updateDirection(direction.id, {
        status: 'funded',
        allocatedHours: 8,
        allocatedSends: 30,
        allocatedSpend: 100,
      });
      await apiClient.recordDecision({
        ventureId: venture.id,
        directionId: direction.id,
        actionType: 'fund',
        reason: 'Funded from This Week view',
        confidenceScore: direction.confidenceScore,
        expectedValue: direction.expectedValue,
        currentRung: direction.currentRung,
        userId: venture.userId,
      });
      onAction();
    } catch (error) {
      console.error('Failed to fund direction:', error);
    }
  }

  async function handleModify() {
    // TODO: Open modal to adjust budgets
    alert('Modify budget allocation (coming soon)');
  }

  async function handleDefer() {
    try {
      await apiClient.updateDirection(direction.id, { status: 'deferred' });
      await apiClient.recordDecision({
        ventureId: venture.id,
        directionId: direction.id,
        actionType: 'defer',
        reason: 'Deferred from This Week view',
        confidenceScore: direction.confidenceScore,
        expectedValue: direction.expectedValue,
        currentRung: direction.currentRung,
        userId: venture.userId,
      });
      onAction();
    } catch (error) {
      console.error('Failed to defer direction:', error);
    }
  }

  async function handleKill() {
    if (!confirm('Are you sure you want to kill this direction?')) return;

    try {
      await apiClient.updateDirection(direction.id, { status: 'killed' });
      await apiClient.recordDecision({
        ventureId: venture.id,
        directionId: direction.id,
        actionType: 'kill',
        reason: 'Killed from This Week view',
        confidenceScore: direction.confidenceScore,
        expectedValue: direction.expectedValue,
        currentRung: direction.currentRung,
        userId: venture.userId,
      });
      onAction();
    } catch (error) {
      console.error('Failed to kill direction:', error);
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Header (always visible) */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
      >
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-bold flex items-center justify-center text-sm">
              #{rank}
            </span>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {direction.icp}
            </h3>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            <strong>Problem:</strong> {direction.problem}
          </p>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Confidence:</span>
              <div className="flex items-center gap-1">
                <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500"
                    style={{ width: `${direction.confidenceScore}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-900 dark:text-white">
                  {direction.confidenceScore}%
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Expected Value:</span>
              <div className="flex items-center gap-1">
                <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500"
                    style={{ width: `${direction.expectedValue}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-900 dark:text-white">
                  {direction.expectedValue}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {expanded ? (
          <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0 ml-4" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0 ml-4" />
        )}
      </button>

      {/* Expanded content (VC Memo Lite) */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            </div>
          ) : memo ? (
            <>
              {/* Deal Headline */}
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">
                  Deal Headline
                </h4>
                <p className="text-sm text-gray-900 dark:text-white font-medium">
                  {memo.headline}
                </p>
              </div>

              {/* Thesis */}
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">
                  Thesis (3 bullets)
                </h4>
                <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  {memo.thesis.map((point, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="flex-shrink-0">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Assumption Ledger */}
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">
                  Assumption Ledger
                </h4>
                <div className="space-y-2">
                  {memo.topAssumptions.map((assumption, index) => (
                    <div
                      key={index}
                      className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3"
                    >
                      <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                        {assumption.assumption}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                          {assumption.rung}
                        </span>
                        <span>→ {assumption.cheapestTest}</span>
                        <span className="text-gray-500">({assumption.estimatedCost})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Next Experiment */}
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">
                  Next Experiment
                </h4>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                    {memo.nextExperiment.title}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    <strong>Pass criteria:</strong> {memo.nextExperiment.passCriteria}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    <strong>Cost:</strong> {memo.nextExperiment.cost}
                  </p>
                </div>
              </div>

              {/* Kill Criteria */}
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">
                  Kill Criteria
                </h4>
                <ul className="space-y-1 text-sm text-red-700 dark:text-red-400">
                  {memo.killCriteria.map((criteria, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="flex-shrink-0">✗</span>
                      <span>{criteria}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">
              Failed to load memo
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleFund}
              disabled={direction.status === 'funded'}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle className="w-4 h-4" />
              {direction.status === 'funded' ? 'Funded' : 'Fund'}
            </button>
            <button
              onClick={handleModify}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Modify
            </button>
            <button
              onClick={handleDefer}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Clock className="w-4 h-4" />
              Defer
            </button>
            <button
              onClick={handleKill}
              className="flex items-center gap-2 px-4 py-2 border border-red-300 dark:border-red-600 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <XCircle className="w-4 h-4" />
              Kill
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
