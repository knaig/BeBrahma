'use client';

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Clock,
  Send,
  AlertCircle,
  CheckCircle,
  TrendingUp,
} from 'lucide-react';
import { Direction, Venture, VCMemoLite } from '@/lib/decision-os/types';
import { apiClient } from '@/lib/decision-os/api-client';
import { PolicyEngine } from '@/lib/decision-os/policy-engine';
import { VCMemoCard } from './VCMemoCard';

interface ThisWeekViewProps {
  ventureId: string;
}

export function ThisWeekView({ ventureId }: ThisWeekViewProps) {
  const [venture, setVenture] = useState<Venture | null>(null);
  const [directions, setDirections] = useState<Direction[]>([]);
  const [topDirections, setTopDirections] = useState<Direction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [ventureId]);

  async function loadData() {
    try {
      setLoading(true);
      const [ventureData, directionsData, topDirs] = await Promise.all([
        apiClient.getVenture(ventureId),
        apiClient.getDirections(ventureId),
        apiClient.getTopDirections(ventureId, 3),
      ]);

      setVenture(ventureData);
      setDirections(directionsData);
      setTopDirections(topDirs);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !venture) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading this week...</p>
        </div>
      </div>
    );
  }

  const fundedDirections = directions.filter((d) => d.status === 'funded');
  const activeExperiments = directions.filter((d) => d.status === 'funded').length; // Simplified

  // Calculate allocations
  const totalAllocatedHours = fundedDirections.reduce((sum, d) => sum + d.allocatedHours, 0);
  const totalAllocatedSends = fundedDirections.reduce((sum, d) => sum + d.allocatedSends, 0);
  const totalAllocatedSpend = fundedDirections.reduce((sum, d) => sum + d.allocatedSpend, 0);

  const remainingHours = venture.budgets.hoursPerWeek - totalAllocatedHours;
  const remainingSends = venture.budgets.sendsPerWeek - totalAllocatedSends;
  const remainingSpend = venture.budgets.spendPerWeek - totalAllocatedSpend;

  const wipCheck = PolicyEngine.validateWIPLimits(
    fundedDirections.length,
    activeExperiments,
    { venture, actionType: 'fund' }
  );

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          This Week
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Budget allocation & WIP limits
        </p>
      </div>

      {/* Budget Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Hours
              </span>
            </div>
            <span className="text-xs text-gray-500">
              {totalAllocatedHours}/{venture.budgets.hoursPerWeek}
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {remainingHours}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                remaining
              </span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500"
                style={{
                  width: `${(totalAllocatedHours / venture.budgets.hoursPerWeek) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Sends
              </span>
            </div>
            <span className="text-xs text-gray-500">
              {totalAllocatedSends}/{venture.budgets.sendsPerWeek}
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {remainingSends}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                remaining
              </span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500"
                style={{
                  width: `${(totalAllocatedSends / venture.budgets.sendsPerWeek) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Spend
              </span>
            </div>
            <span className="text-xs text-gray-500">
              ${totalAllocatedSpend}/${venture.budgets.spendPerWeek}
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                ${remainingSpend}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                remaining
              </span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500"
                style={{
                  width: `${(totalAllocatedSpend / venture.budgets.spendPerWeek) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* WIP Limits */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">
              WIP Limits ({venture.founderProfile})
            </h3>
            <div className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
              <p>
                Directions: {fundedDirections.length}/{venture.wipLimits.maxDirections}{' '}
                {fundedDirections.length >= venture.wipLimits.maxDirections && (
                  <span className="text-red-600 dark:text-red-400 font-medium">
                    (At limit - defund one to add more)
                  </span>
                )}
              </p>
              <p>
                Active experiments: {activeExperiments}/{venture.wipLimits.maxActiveExperiments}{' '}
                {activeExperiments >= venture.wipLimits.maxActiveExperiments && (
                  <span className="text-red-600 dark:text-red-400 font-medium">
                    (At limit - complete one first)
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Directions (VC Memo Lite) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Top Directions (Ranked Deals)
          </h2>
          <span className="text-sm text-gray-500">
            60-90 sec skim each
          </span>
        </div>

        {topDirections.map((direction, index) => (
          <VCMemoCard
            key={direction.id}
            direction={direction}
            venture={venture}
            rank={index + 1}
            onAction={loadData}
          />
        ))}
      </div>

      {!wipCheck.valid && (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <p className="text-sm text-red-800 dark:text-red-400 font-medium">
              {wipCheck.message}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
