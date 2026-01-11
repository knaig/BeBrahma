'use client';

import React, { useState, useEffect } from 'react';
import { Direction, Venture, Experiment } from '@/lib/decision-os/types';
import { apiClient } from '@/lib/decision-os/api-client';
import { TrendingUp, GitBranch, CheckCircle, XCircle, Clock } from 'lucide-react';

interface GraphViewProps {
  ventureId: string;
}

export function GraphView({ ventureId }: GraphViewProps) {
  const [venture, setVenture] = useState<Venture | null>(null);
  const [directions, setDirections] = useState<Direction[]>([]);
  const [selectedDirection, setSelectedDirection] = useState<Direction | null>(null);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [ventureId]);

  useEffect(() => {
    if (selectedDirection) {
      loadExperiments(selectedDirection.id);
    }
  }, [selectedDirection]);

  async function loadData() {
    try {
      setLoading(true);
      const [ventureData, directionsData] = await Promise.all([
        apiClient.getVenture(ventureId),
        apiClient.getDirections(ventureId),
      ]);

      setVenture(ventureData);
      setDirections(directionsData);

      if (directionsData.length > 0) {
        setSelectedDirection(directionsData[0]);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadExperiments(directionId: string) {
    try {
      const exps = await apiClient.getExperiments(directionId);
      setExperiments(exps);
    } catch (error) {
      console.error('Failed to load experiments:', error);
    }
  }

  if (loading || !venture) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading graph...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Graph
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Frontier graph for transparency and pruning
        </p>
      </div>

      {/* Direction List (Frontier) */}
      <div className="grid gap-4 md:grid-cols-3">
        {directions.map((direction) => (
          <button
            key={direction.id}
            onClick={() => setSelectedDirection(direction)}
            className={`text-left p-4 rounded-lg border transition-colors ${
              selectedDirection?.id === direction.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {direction.icp}
              </h3>
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                  direction.status === 'funded'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : direction.status === 'killed'
                    ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                }`}
              >
                {direction.status}
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
              {direction.problem}
            </p>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500">Confidence:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {direction.confidenceScore}%
              </span>
              <span className="text-gray-300 dark:text-gray-700">|</span>
              <span className="text-gray-500">EV:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {direction.expectedValue}%
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Inspector */}
      {selectedDirection && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Inspector
          </h2>

          {/* Direction Vector */}
          <div className="space-y-3 mb-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Direction Vector
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <span className="text-xs text-gray-500">ICP:</span>
                <p className="text-sm text-gray-900 dark:text-white">
                  {selectedDirection.icp}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Problem:</span>
                <p className="text-sm text-gray-900 dark:text-white">
                  {selectedDirection.problem}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Offer:</span>
                <p className="text-sm text-gray-900 dark:text-white">
                  {selectedDirection.offer}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Channel:</span>
                <p className="text-sm text-gray-900 dark:text-white">
                  {selectedDirection.channel}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Price:</span>
                <p className="text-sm text-gray-900 dark:text-white">
                  {selectedDirection.price}
                </p>
              </div>
            </div>
          </div>

          {/* Evidence Ladder */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Evidence Ladder
            </h3>
            <div className="flex items-center gap-2">
              {['synthetic', 'attention', 'intent', 'commitment', 'retention'].map((rung, index) => (
                <React.Fragment key={rung}>
                  <div
                    className={`flex-1 h-10 rounded flex items-center justify-center text-xs font-medium ${
                      rung === selectedDirection.currentRung
                        ? 'bg-blue-500 text-white'
                        : index < ['synthetic', 'attention', 'intent', 'commitment', 'retention'].indexOf(selectedDirection.currentRung as any)
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {rung}
                  </div>
                  {index < 4 && (
                    <div className="text-gray-400">→</div>
                  )}
                </React.Fragment>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Current rung: <strong>{selectedDirection.currentRung}</strong>
            </p>
          </div>

          {/* Experiments Timeline */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Experiments ({experiments.length})
            </h3>
            {experiments.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                No experiments yet
              </p>
            ) : (
              <div className="space-y-2">
                {experiments.map((experiment) => (
                  <div
                    key={experiment.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                  >
                    {experiment.status === 'passed' ? (
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : experiment.status === 'failed' ? (
                      <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    ) : experiment.status === 'running' ? (
                      <Clock className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <GitBranch className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {experiment.title}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                        {experiment.hypothesis}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            experiment.status === 'passed'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : experiment.status === 'failed'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : experiment.status === 'running'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                          }`}
                        >
                          {experiment.status}
                        </span>
                        <span className="text-xs text-gray-500">
                          Grade {experiment.grade}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Kill Criteria */}
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <h3 className="text-sm font-medium text-red-900 dark:text-red-300 mb-2">
              Kill Criteria
            </h3>
            <ul className="space-y-1 text-sm text-red-800 dark:text-red-400">
              {selectedDirection.killCriteria.map((criteria, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="flex-shrink-0">✗</span>
                  <span>{criteria}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
