'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, CheckCircle, Clock, Target, Users } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  estimatedHours: number;
  dependencies: string[];
}

interface TaskPanelProps {
  project: any;
  onUpdate: (updates: any) => void;
}

export function TaskPanel({ project, onUpdate }: TaskPanelProps) {
  const [tasks, setTasks] = useState<Task[]>(project.tasks || []);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateTasks = async () => {
    setIsGenerating(true);
    try {
      // Simulate AI task generation
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const generatedTasks = [
        {
          id: `task_${Date.now()}_1`,
          title: 'Market Research & Validation',
          description: 'Conduct primary and secondary research to validate the problem and market size.',
          category: 'Research',
          priority: 'High',
          estimatedHours: 20,
          dependencies: []
        },
        {
          id: `task_${Date.now()}_2`,
          title: 'User Interviews & Surveys',
          description: 'Interview potential users to understand pain points and validate solution.',
          category: 'User Research',
          priority: 'High',
          estimatedHours: 15,
          dependencies: ['Market Research & Validation']
        },
        {
          id: `task_${Date.now()}_3`,
          title: 'Competitive Analysis Deep Dive',
          description: 'Analyze top 5 competitors in detail and identify differentiation opportunities.',
          category: 'Analysis',
          priority: 'Medium',
          estimatedHours: 12,
          dependencies: ['Market Research & Validation']
        },
        {
          id: `task_${Date.now()}_4`,
          title: 'MVP Feature Prioritization',
          description: 'Prioritize MVP features based on user feedback and business impact.',
          category: 'Planning',
          priority: 'Medium',
          estimatedHours: 8,
          dependencies: ['User Interviews & Surveys']
        },
        {
          id: `task_${Date.now()}_5`,
          title: 'Technical Architecture Design',
          description: 'Design the technical architecture and technology stack for the MVP.',
          category: 'Technical',
          priority: 'Medium',
          estimatedHours: 16,
          dependencies: ['MVP Feature Prioritization']
        }
      ];
      
      setTasks(generatedTasks);
      onUpdate({ tasks: generatedTasks });
    } finally {
      setIsGenerating(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-800 border-red-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Research': return <Target className="h-4 w-4" />;
      case 'User Research': return <Users className="h-4 w-4" />;
      case 'Analysis': return <ClipboardList className="h-4 w-4" />;
      case 'Planning': return <CheckCircle className="h-4 w-4" />;
      case 'Technical': return <Clock className="h-4 w-4" />;
      default: return <ClipboardList className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
          <ClipboardList className="h-5 w-5 mr-2" />
          Task Generation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Generate Tasks */}
        <div className="text-center p-6 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-800 mb-2">AI-Powered Task Planning</h3>
          <p className="text-blue-600 mb-4">
            Generate a comprehensive task list to execute your startup plan
          </p>
          <Button
            onClick={generateTasks}
            disabled={isGenerating}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isGenerating ? 'Generating Tasks...' : 'Generate Task List'}
          </Button>
        </div>

        {/* Tasks Display */}
        {tasks.length > 0 && (
          <div>
            <h3 className="font-semibold mb-4">Your Action Plan</h3>
            <div className="space-y-4">
              {tasks.map((task) => (
                <Card key={task.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg mb-2">{task.title}</h4>
                        <p className="text-gray-600 text-sm mb-3">{task.description}</p>
                        
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="text-xs">
                            {getCategoryIcon(task.category)}
                            <span className="ml-1">{task.category}</span>
                          </Badge>
                          
                          <Badge className={`text-xs ${getPriorityColor(task.priority)}`}>
                            {task.priority} Priority
                          </Badge>
                          
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {task.estimatedHours}h
                          </Badge>
                        </div>
                        
                        {task.dependencies.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs text-gray-500 mb-1">Dependencies:</p>
                            <div className="flex flex-wrap gap-1">
                              {task.dependencies.map((dep, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {dep}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {/* Summary */}
            <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-800 mb-2">Project Summary</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Total Tasks:</span> {tasks.length}
                </div>
                <div>
                  <span className="font-medium">Estimated Hours:</span> {tasks.reduce((sum, task) => sum + task.estimatedHours, 0)}h
                </div>
                <div>
                  <span className="font-medium">High Priority:</span> {tasks.filter(task => task.priority === 'High').length}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
