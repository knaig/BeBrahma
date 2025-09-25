'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Clipboard, 
  Target, 
  Clock, 
  DollarSign, 
  Users, 
  RefreshCw,
  CheckCircle,
  Plus,
  Edit3,
  Trash2
} from 'lucide-react';

interface MVPFeature {
  id: string;
  name: string;
  description: string;
  priority: 'MUST_HAVE' | 'SHOULD_HAVE' | 'COULD_HAVE' | 'WONT_HAVE';
  effort: 'LOW' | 'MEDIUM' | 'HIGH';
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
  scaAlignment: string[];
  userStories: string[];
  acceptanceCriteria: string[];
  estimatedTime: string;
  estimatedCost: string;
}

interface Project {
  id: string;
  name: string;
  workflowStep?: string;
  progress?: number;
  mvpFeatures?: MVPFeature[];
  scaFactors?: any[];
}

interface MVPPlanningPanelProps {
  project: Project;
  onUpdate: (project: Project) => void;
}

export function MVPPlanningPanel({ project, onUpdate }: MVPPlanningPanelProps) {
  const [isPlanning, setIsPlanning] = useState(false);
  const [mvpFeatures, setMvpFeatures] = useState<MVPFeature[]>(project.mvpFeatures || []);
  const [showAddFeature, setShowAddFeature] = useState(false);

  const priorityColors = {
    MUST_HAVE: 'bg-red-100 text-red-800 border-red-200',
    SHOULD_HAVE: 'bg-orange-100 text-orange-800 border-orange-200',
    COULD_HAVE: 'bg-blue-100 text-blue-800 border-blue-200',
    WONT_HAVE: 'bg-gray-100 text-gray-800 border-gray-200'
  };

  const effortColors = {
    LOW: 'bg-green-100 text-green-800 border-green-200',
    MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    HIGH: 'bg-red-100 text-red-800 border-red-200'
  };

  const impactColors = {
    LOW: 'bg-gray-100 text-gray-800 border-gray-200',
    MEDIUM: 'bg-blue-100 text-blue-800 border-blue-200',
    HIGH: 'bg-purple-100 text-purple-800 border-purple-200'
  };

  const generateMVPPlan = async () => {
    setIsPlanning(true);
    try {
      const response = await fetch('/api/ai/mvp-planning', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: project.id,
          projectName: project.name,
          scaFactors: project.scaFactors || [],
          context: `Generate MVP plan for project: ${project.name}`
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newFeatures = data.mvpFeatures || [];
        setMvpFeatures(newFeatures);
        
        // Update project with MVP features
        const updatedProject = {
          ...project,
          mvpFeatures: newFeatures
        };
        onUpdate(updatedProject);
      }
    } catch (error) {
      console.error('Error generating MVP plan:', error);
    } finally {
      setIsPlanning(false);
    }
  };

  const addFeature = (feature: MVPFeature) => {
    const newFeatures = [...mvpFeatures, feature];
    setMvpFeatures(newFeatures);
    
    const updatedProject = {
      ...project,
      mvpFeatures: newFeatures
    };
    onUpdate(updatedProject);
    setShowAddFeature(false);
  };

  const updateFeature = (id: string, updates: Partial<MVPFeature>) => {
    const updatedFeatures = mvpFeatures.map(feature => 
      feature.id === id ? { ...feature, ...updates } : feature
    );
    setMvpFeatures(updatedFeatures);
    
    const updatedProject = {
      ...project,
      mvpFeatures: updatedFeatures
    };
    onUpdate(updatedProject);
  };

  const deleteFeature = (id: string) => {
    const updatedFeatures = mvpFeatures.filter(feature => feature.id !== id);
    setMvpFeatures(updatedFeatures);
    
    const updatedProject = {
      ...project,
      mvpFeatures: updatedFeatures
    };
    onUpdate(updatedProject);
  };

  const getPriorityScore = (feature: MVPFeature) => {
    const priorityScores = { MUST_HAVE: 4, SHOULD_HAVE: 3, COULD_HAVE: 2, WONT_HAVE: 1 };
    const effortScores = { LOW: 3, MEDIUM: 2, HIGH: 1 };
    const impactScores = { LOW: 1, MEDIUM: 2, HIGH: 3 };
    
    return (priorityScores[feature.priority] * impactScores[feature.impact]) / effortScores[feature.effort];
  };

  const sortedFeatures = [...mvpFeatures].sort((a, b) => getPriorityScore(b) - getPriorityScore(a));

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clipboard className="h-6 w-6 text-green-600" />
          <span>MVP Planning</span>
          <Badge variant="outline" className="ml-2">
            Step 6 of 7
          </Badge>
        </CardTitle>
        <p className="text-gray-600">
          Plan your minimum viable product with clear scope and priorities
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Planning Controls */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
          <div>
            <h3 className="font-semibold text-green-800">MVP Feature Planning</h3>
            <p className="text-sm text-green-600">
              AI will generate an MVP plan based on your SCA analysis and project goals
            </p>
          </div>
          <div className="flex space-x-2">
            <Button 
              onClick={() => setShowAddFeature(true)}
              variant="outline"
              className="border-green-300 text-green-700 hover:bg-green-50"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Feature
            </Button>
            <Button 
              onClick={generateMVPPlan} 
              disabled={isPlanning}
              className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
            >
              {isPlanning ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Clipboard className="h-4 w-4 mr-2" />
              )}
              {isPlanning ? 'Planning...' : 'Generate MVP Plan'}
            </Button>
          </div>
        </div>

        {/* MVP Features Display */}
        {mvpFeatures.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">MVP Features ({mvpFeatures.length})</h3>
              <div className="text-sm text-gray-500">
                Sorted by priority score (impact × priority ÷ effort)
              </div>
            </div>
            
            {sortedFeatures.map((feature, index) => (
              <Card key={feature.id} className="border-l-4 border-l-green-500">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Badge className="text-xs bg-gray-100 text-gray-700">
                        #{index + 1}
                      </Badge>
                      <Badge className={`text-xs ${priorityColors[feature.priority]}`}>
                        {feature.priority.replace('_', ' ')}
                      </Badge>
                      <Badge className={`text-xs ${effortColors[feature.effort]}`}>
                        {feature.effort} Effort
                      </Badge>
                      <Badge className={`text-xs ${impactColors[feature.impact]}`}>
                        {feature.impact} Impact
                      </Badge>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {/* TODO: Edit feature */}}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteFeature(feature.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <h4 className="font-semibold text-gray-800 mb-2">{feature.name}</h4>
                  <p className="text-gray-600 text-sm mb-3">{feature.description}</p>
                  
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Estimated Time:</p>
                      <p className="text-sm text-gray-700 flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {feature.estimatedTime}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Estimated Cost:</p>
                      <p className="text-sm text-gray-700 flex items-center">
                        <DollarSign className="h-3 w-3 mr-1" />
                        {feature.estimatedCost}
                      </p>
                    </div>
                  </div>
                  
                  {feature.scaAlignment.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-gray-500 mb-1">SCA Alignment:</p>
                      <div className="flex flex-wrap gap-1">
                        {feature.scaAlignment.map((sca, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {sca}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {feature.userStories.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-gray-500 mb-1">User Stories:</p>
                      <ul className="space-y-1">
                        {feature.userStories.map((story, idx) => (
                          <li key={idx} className="text-sm text-gray-700 flex items-start space-x-2">
                            <Users className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                            <span>{story}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {feature.acceptanceCriteria.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Acceptance Criteria:</p>
                      <ul className="space-y-1">
                        {feature.acceptanceCriteria.map((criteria, idx) => (
                          <li key={idx} className="text-sm text-gray-700 flex items-start space-x-2">
                            <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{criteria}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {mvpFeatures.length === 0 && !isPlanning && (
          <div className="text-center py-12">
            <Clipboard className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No MVP Features Yet</h3>
            <p className="text-gray-500 mb-4">
              Click "Generate MVP Plan" to create a structured MVP plan based on your SCA analysis
            </p>
          </div>
        )}

        {/* Next Steps */}
        {mvpFeatures.length > 0 && (
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-800">MVP Planning Complete!</h3>
                <p className="text-sm text-blue-600 mb-4">
                  You've planned {mvpFeatures.length} MVP features. 
                  Next step: Task Generation to break down features into actionable tasks.
                </p>
                
                <Button
                  onClick={() => onUpdate({
                    ...project,
                    workflowStep: 'TASK_GENERATION',
                    progress: Math.round((7 / 7) * 100)
                  })}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Clipboard className="h-4 w-4 mr-2" />
                  Proceed to Task Generation
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
