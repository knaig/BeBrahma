interface ProgressState {
  phase: 'planning' | 'agent_selection' | 'data_gathering' | 'analysis' | 'decision_making' | 'complete';
  currentPhase: string;
  overallProgress: number;
  agents: any[];
  estimatedTotalTime: number;
  currentBudget: number;
  totalBudget: number;
}

interface StageNavigationProps {
  progressState?: ProgressState;
}

export function StageNavigation({ progressState }: StageNavigationProps) {
  // Default stages - all pending initially
  const getStages = () => {
    if (!progressState) {
      return [
        { 
          id: 'planning', 
          name: 'Planning & Research', 
          status: 'pending',
          description: 'Problem validation, market sizing, competitive analysis'
        },
        { 
          id: 'agent-selection', 
          name: 'Agent Selection', 
          status: 'pending',
          description: 'Expert team assembly and strategy planning'
        },
        { 
          id: 'data-gathering', 
          name: 'Data Gathering', 
          status: 'pending',
          description: 'Market research, customer insights, industry data'
        },
        { 
          id: 'analysis', 
          name: 'Strategic Analysis', 
          status: 'pending',
          description: 'Multi-agent analysis and insights generation'
        },
        { 
          id: 'decision-making', 
          name: 'Decision Making', 
          status: 'pending',
          description: 'Scenario modeling and strategic recommendations'
        },
        { 
          id: 'implementation', 
          name: 'Implementation Planning', 
          status: 'pending',
          description: 'Go-to-market strategy and execution roadmap'
        }
      ];
    }

    // Map progress state to stage status
    const phaseToStageMap: Record<string, string> = {
      'planning': 'planning',
      'agent_selection': 'agent-selection',
      'data_gathering': 'data-gathering',
      'analysis': 'analysis',
      'decision_making': 'decision-making',
      'complete': 'implementation'
    };

    const currentPhase = progressState.phase;
    const currentPhaseId = phaseToStageMap[currentPhase];

    return [
      { 
        id: 'planning', 
        name: 'Planning & Research', 
        status: currentPhase === 'planning' ? 'in-progress' : 
                ['agent_selection', 'data_gathering', 'analysis', 'decision_making', 'complete'].includes(currentPhase) ? 'completed' : 'pending',
        description: 'Problem validation, market sizing, competitive analysis'
      },
      { 
        id: 'agent-selection', 
        name: 'Agent Selection', 
        status: currentPhase === 'agent_selection' ? 'in-progress' : 
                ['data_gathering', 'analysis', 'decision_making', 'complete'].includes(currentPhase) ? 'completed' : 'pending',
        description: 'Expert team assembly and strategy planning'
      },
      { 
        id: 'data-gathering', 
        name: 'Data Gathering', 
        status: currentPhase === 'data_gathering' ? 'in-progress' : 
                ['analysis', 'decision_making', 'complete'].includes(currentPhase) ? 'completed' : 'pending',
        description: 'Market research, customer insights, industry data'
      },
      { 
        id: 'analysis', 
        name: 'Strategic Analysis', 
        status: currentPhase === 'analysis' ? 'in-progress' : 
                ['decision_making', 'complete'].includes(currentPhase) ? 'completed' : 'pending',
        description: 'Multi-agent analysis and insights generation'
      },
      { 
        id: 'decision-making', 
        name: 'Decision Making', 
        status: currentPhase === 'decision_making' ? 'in-progress' : 
                currentPhase === 'complete' ? 'completed' : 'pending',
        description: 'Scenario modeling and strategic recommendations'
      },
      { 
        id: 'implementation', 
        name: 'Implementation Planning', 
        status: currentPhase === 'complete' ? 'completed' : 'pending',
        description: 'Go-to-market strategy and execution roadmap'
      }
    ];
  };

  const stages = getStages();
  const completedStages = stages.filter(stage => stage.status === 'completed').length;
  const totalStages = stages.length;

  return (
    <div className="p-4">
      <h3 className="font-semibold text-lg mb-4 text-gray-900 dark:text-white">SaaS Analysis Stages</h3>
      
      {!progressState && (
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            💡 Start a conversation to begin the analysis and see real-time stage progress
          </p>
        </div>
      )}
      
      <div className="space-y-3">
        {stages.map((stage) => (
          <div
            key={stage.id}
            className={`p-3 rounded-lg border transition-colors ${
              stage.status === 'completed'
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                : stage.status === 'in-progress'
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`font-medium text-sm ${
                stage.status === 'completed'
                  ? 'text-green-900 dark:text-green-100'
                  : stage.status === 'in-progress'
                  ? 'text-blue-900 dark:text-blue-100'
                  : 'text-gray-900 dark:text-gray-100'
              }`}>
                {stage.name}
              </span>
              <span
                className={`text-xs px-2 py-1 rounded-full font-medium ${
                  stage.status === 'completed'
                    ? 'bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200'
                    : stage.status === 'in-progress'
                    ? 'bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200'
                }`}
              >
                {stage.status === 'completed' ? '✓' : 
                 stage.status === 'in-progress' ? '🔄' : '⏳'}
              </span>
            </div>
            <p className={`text-xs ${
              stage.status === 'completed'
                ? 'text-green-700 dark:text-green-300'
                : stage.status === 'in-progress'
                ? 'text-blue-700 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-400'
            }`}>
              {stage.description}
            </p>
          </div>
        ))}
      </div>
      
      {/* Progress Summary */}
      <div className="mt-6 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600">
        <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">Overall Progress</div>
        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 mb-2">
          <div 
            className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(completedStages / totalStages) * 100}%` }}
          ></div>
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400">
          {completedStages} of {totalStages} stages completed
        </div>
        
        {progressState && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-600">
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
              Current Phase: <span className="font-medium text-gray-800 dark:text-gray-200">
                {progressState.currentPhase}
              </span>
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Budget: <span className="font-medium text-gray-800 dark:text-gray-200">
                ${progressState.currentBudget} / ${progressState.totalBudget}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
