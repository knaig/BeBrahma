'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Clock, AlertTriangle, TrendingUp, Users, FileText, RefreshCw } from 'lucide-react';
import { useAsyncOperation } from '../../hooks/useAsyncOperation';
import { handleError, createUserInputError, logError } from '../../utils/errorHandling';

interface DecisionItem {
  id: string;
  title: string;
  workflowStage: string;
  involvedAgents: string[];
  evidenceSummary: string;
  confidenceScore: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  context: {
    relatedDiscussions: string[];
    supportingData: any[];
    risks: string[];
    recommendations: string[];
  };
}

interface DecisionHubProps {
  decisions: DecisionItem[];
  onDecisionAction: (decisionId: string, action: 'approve' | 'reject') => Promise<void>;
  onViewDetails: (decision: DecisionItem) => void;
}

export default function DecisionHub({
  decisions,
  onDecisionAction,
  onViewDetails
}: DecisionHubProps) {
  const [selectedDecision, setSelectedDecision] = useState<DecisionItem | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'confidence' | 'priority'>('date');
  const [actionError, setActionError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<{ decisionId: string; action: string } | null>(null);

  const filteredDecisions = decisions.filter(decision => {
    if (filterStatus === 'all') return true;
    return decision.status === filterStatus;
  });

  const sortedDecisions = [...filteredDecisions].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'confidence':
        return b.confidenceScore - a.confidenceScore;
      case 'priority':
        // Priority based on status and confidence
        const priorityA = getPriorityScore(a);
        const priorityB = getPriorityScore(b);
        return priorityB - priorityA;
      default:
        return 0;
    }
  });

  const getPriorityScore = (decision: DecisionItem) => {
    let score = decision.confidenceScore;
    if (decision.status === 'pending') score += 100;
    if (decision.context.risks.length > 0) score += 50;
    return score;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'border-green-500 bg-green-50';
      case 'rejected':
        return 'border-red-500 bg-red-50';
      case 'pending':
        return 'border-yellow-500 bg-yellow-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Decision Management Hub</h1>
              <p className="text-gray-600">Review and approve workflow decisions</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                <span className="text-sm text-blue-600">Total Decisions:</span>
                <span className="ml-2 font-semibold text-blue-800">{decisions.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="date">Sort by Date</option>
                <option value="confidence">Sort by Confidence</option>
                <option value="priority">Sort by Priority</option>
              </select>
            </div>

            <div className="text-sm text-gray-500">
              Showing {filteredDecisions.length} of {decisions.length} decisions
            </div>
          </div>
        </div>
      </div>

      {/* Decision Grid */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {sortedDecisions.map((decision, index) => (
              <motion.div
                key={decision.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
                className={`bg-white rounded-xl border-2 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${getStatusColor(decision.status)}`}
                onClick={() => onViewDetails(decision)}
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-lg mb-2 line-clamp-2">
                        {decision.title}
                      </h3>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(decision.status)}
                        <span className="text-sm font-medium capitalize text-gray-600">
                          {decision.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Workflow Stage */}
                  <div className="mb-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium text-gray-700">Stage</span>
                    </div>
                    <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                      {decision.workflowStage.replace('-', ' ')}
                    </span>
                  </div>

                  {/* Confidence Score */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Confidence</span>
                      <span className={`text-sm font-semibold ${getConfidenceColor(decision.confidenceScore)}`}>
                        {decision.confidenceScore}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          decision.confidenceScore >= 80 ? 'bg-green-500' :
                          decision.confidenceScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${decision.confidenceScore}%` }}
                      />
                    </div>
                  </div>

                  {/* Agents */}
                  <div className="mb-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Users className="w-4 h-4 text-purple-500" />
                      <span className="text-sm font-medium text-gray-700">Involved Agents</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {decision.involvedAgents.slice(0, 3).map((agent, idx) => (
                        <span
                          key={idx}
                          className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full"
                        >
                          {agent}
                        </span>
                      ))}
                      {decision.involvedAgents.length > 3 && (
                        <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                          +{decision.involvedAgents.length - 3}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Evidence Summary */}
                  <div className="mb-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <FileText className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium text-gray-700">Evidence</span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {decision.evidenceSummary}
                    </p>
                  </div>

                  {/* Risks */}
                  {decision.context.risks.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                        <span className="text-sm font-medium text-gray-700">Risks</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {decision.context.risks.slice(0, 2).map((risk, idx) => (
                          <span
                            key={idx}
                            className="inline-block bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full"
                          >
                            {risk}
                          </span>
                        ))}
                        {decision.context.risks.length > 2 && (
                          <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                            +{decision.context.risks.length - 2}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className="text-xs text-gray-500">
                    Created {new Date(decision.createdAt).toLocaleDateString()}
                  </div>

                  {/* Action Buttons for Pending Decisions */}
                  {decision.status === 'pending' && (
                    <div className="mt-4 space-y-2">
                      <div className="flex space-x-2">
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              setActionError(null);
                              setLastAction({ decisionId: decision.id, action: 'approve' });
                              await onDecisionAction(decision.id, 'approve');
                            } catch (error) {
                              const appError = handleError(error, { 
                                context: 'decisionAction', 
                                decisionId: decision.id, 
                                action: 'approve' 
                              });
                              setActionError(appError.userMessage || 'An error occurred while processing action');
                              logError(appError);
                            }
                          }}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm py-2 px-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={lastAction?.decisionId === decision.id && lastAction?.action === 'approve'}
                        >
                          Approve
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              setActionError(null);
                              setLastAction({ decisionId: decision.id, action: 'reject' });
                              await onDecisionAction(decision.id, 'reject');
                            } catch (error) {
                              const appError = handleError(error, { 
                                context: 'decisionAction', 
                                decisionId: decision.id, 
                                action: 'reject' 
                              });
                              setActionError(appError.userMessage || 'An error occurred while processing action');
                              logError(appError);
                            }
                          }}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm py-2 px-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={lastAction?.decisionId === decision.id && lastAction?.action === 'reject'}
                        >
                          Reject
                        </button>
                      </div>
                      
                      {/* Action Error Display */}
                      {actionError && lastAction?.decisionId === decision.id && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="flex items-center space-x-2 text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg px-2 py-1"
                        >
                          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                          <span>{actionError}</span>
                        </motion.div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {sortedDecisions.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No decisions found</h3>
            <p className="text-gray-500">
              {filterStatus === 'all' 
                ? 'No decisions have been created yet.'
                : `No ${filterStatus} decisions found.`
              }
            </p>
          </div>
        )}
      </div>

      {/* Decision Details Modal */}
      <AnimatePresence>
        {selectedDecision && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedDecision(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  {selectedDecision.title}
                </h2>
                
                {/* Decision details content */}
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-2">Evidence Summary</h3>
                    <p className="text-gray-600">{selectedDecision.evidenceSummary}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-2">Recommendations</h3>
                    <ul className="list-disc list-inside text-gray-600 space-y-1">
                      {selectedDecision.context.recommendations.map((rec, idx) => (
                        <li key={idx}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                  
                  {selectedDecision.context.risks.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-700 mb-2">Risks</h3>
                      <ul className="list-disc list-inside text-gray-600 space-y-1">
                        {selectedDecision.context.risks.map((risk, idx) => (
                          <li key={idx}>{risk}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setSelectedDecision(null)}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
