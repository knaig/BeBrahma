'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Lightbulb, 
  Target, 
  Zap, 
  Search, 
  TrendingUp, 
  ClipboardList, 
  CheckCircle,
  Users,
  Shield,
  Circle,
  CheckSquare
} from 'lucide-react';

interface ProgressStepperProps {
  currentStep: string;
  onStepClick: (step: string) => void;
}

export function ProgressStepper({ currentStep, onStepClick }: ProgressStepperProps) {
  const workflowSteps = [
      'PROBLEM_CAPTURE',
  'PROBLEM_CLARIFICATION', 
  'SOLUTION_BRAINSTORM',
  'COMPETITOR_ANALYSIS',
  'SCA_ANALYSIS',
  'MVP_PLANNING',
  'TASK_GENERATION'
  ];

  const getStepLabel = (step: string) => {
    const labels: { [key: string]: string } = {
      'PROBLEM_CAPTURE': 'Problem',
      'PROBLEM_CLARIFICATION': 'Clarify',
      'SOLUTION_BRAINSTORM': 'Solutions',
      'COMPETITOR_ANALYSIS': 'Competitors',
      'SCA_ANALYSIS': 'SCA',
      'MVP_PLANNING': 'MVP',
      'TASK_GENERATION': 'Tasks'
    };
    return labels[step] || step;
  };

  const getStepIcon = (step: string) => {
    const icons: { [key: string]: React.ReactNode } = {
      'PROBLEM_CAPTURE': <Target className="h-4 w-4" />,
      'PROBLEM_CLARIFICATION': <Lightbulb className="h-4 w-4" />,
      'SOLUTION_BRAINSTORM': <Zap className="h-4 w-4" />,
      'COMPETITOR_ANALYSIS': <Users className="h-4 w-4" />,
      'SCA_ANALYSIS': <Shield className="h-4 w-4" />,
      'MVP_PLANNING': <ClipboardList className="h-4 w-4" />,
      'TASK_GENERATION': <CheckSquare className="h-4 w-4" />
    };
    return icons[step] || <Circle className="h-4 w-4" />;
  };

  return (
    <div className="flex items-center justify-between space-x-2">
      {workflowSteps.map((step, index) => {
        const isCompleted = index < workflowSteps.indexOf(currentStep);
        const isCurrent = step === currentStep;
        const isAccessible = index <= workflowSteps.indexOf(currentStep) + 1;
        
        return (
          <Button
            key={step}
            variant="ghost"
            size="sm"
            onClick={() => isAccessible && onStepClick(step)}
            disabled={!isAccessible}
            className={`flex flex-col items-center p-2 h-auto min-w-0 flex-1 ${
              isCurrent 
                ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                : isCompleted 
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="mb-1">
              {isCompleted ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                getStepIcon(step)
              )}
            </div>
            <div className="text-xs font-medium text-center leading-tight">
              {getStepLabel(step)}
            </div>
          </Button>
        );
      })}
    </div>
  );
}
