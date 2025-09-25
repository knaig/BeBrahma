'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Zap, Plus, CheckCircle, ArrowRight, Edit3, Trash2 } from 'lucide-react';

interface Solution {
  id: string;
  title: string;
  description: string;
  isSelected: boolean;
}

interface SolutionPanelProps {
  project: any;
  onUpdate: (updates: any) => void;
  onNextStep: () => void;
}

export function SolutionPanel({ project, onUpdate, onNextStep }: SolutionPanelProps) {
  const [solutions, setSolutions] = useState<Solution[]>(project.solutions || []);
  const [newSolution, setNewSolution] = useState({ title: '', description: '' });
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const generateSolutions = async () => {
    setIsGenerating(true);
    try {
      // Simulate AI solution generation
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const generatedSolutions: Solution[] = [
        {
          id: `sol_${Date.now()}_1`,
          title: 'AI-Powered Market Research Platform',
          description: 'Leverage machine learning to analyze market trends and identify opportunities in real-time.',
          isSelected: false
        },
        {
          id: `sol_${Date.now()}_2`,
          title: 'Collaborative Problem-Solving Network',
          description: 'Connect entrepreneurs with domain experts and mentors through a structured collaboration platform.',
          isSelected: false
        },
        {
          id: `sol_${Date.now()}_3`,
          title: 'Predictive Business Model Generator',
          description: 'Use data analytics to generate and validate business models based on market conditions and trends.',
          isSelected: false
        }
      ];
      
      setSolutions(generatedSolutions);
      onUpdate({ solutions: generatedSolutions });
    } finally {
      setIsGenerating(false);
    }
  };

  const addCustomSolution = () => {
    if (!newSolution.title.trim() || !newSolution.description.trim()) return;
    
    const solution: Solution = {
      id: `sol_${Date.now()}`,
      title: newSolution.title,
      description: newSolution.description,
      isSelected: false
    };
    
    const updatedSolutions = [...solutions, solution];
    setSolutions(updatedSolutions);
    onUpdate({ solutions: updatedSolutions });
    
    setNewSolution({ title: '', description: '' });
    setShowAddForm(false);
  };

  const toggleSolutionSelection = (solutionId: string) => {
    const updatedSolutions = solutions.map((sol: Solution) => ({
      ...sol,
      isSelected: sol.id === solutionId ? !sol.isSelected : false
    }));
    
    setSolutions(updatedSolutions);
    onUpdate({ 
      solutions: updatedSolutions,
      selectedSolution: updatedSolutions.find((s: Solution) => s.isSelected)?.id
    });
  };

  const deleteSolution = (solutionId: string) => {
    const updatedSolutions = solutions.filter((sol: Solution) => sol.id !== solutionId);
    setSolutions(updatedSolutions);
    onUpdate({ solutions: updatedSolutions });
  };

  const hasSelectedSolution = solutions.some((sol: Solution) => sol.isSelected);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
          <Zap className="h-5 w-5 mr-2" />
          Solution Brainstorming
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Generate Solutions */}
        <div className="text-center p-6 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-800 mb-2">AI-Powered Solution Generation</h3>
          <p className="text-blue-600 mb-4">
            Let AI help you brainstorm innovative solutions to your problem
          </p>
          <Button
            onClick={generateSolutions}
            disabled={isGenerating}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isGenerating ? 'Generating Solutions...' : 'Generate AI Solutions'}
          </Button>
                    </div>

        {/* Add Custom Solution */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Add Custom Solution</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              {showAddForm ? 'Cancel' : <Plus className="h-4 w-4" />}
            </Button>
                  </div>
                  
          {showAddForm && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Solution Title</label>
                <input
                  type="text"
                  value={newSolution.title}
                  onChange={(e) => setNewSolution({ ...newSolution, title: e.target.value })}
                  placeholder="Enter solution title..."
                  className="w-full p-2 border rounded-md"
                />
              </div>
                    <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <Textarea
                  value={newSolution.description}
                  onChange={(e) => setNewSolution({ ...newSolution, description: e.target.value })}
                  placeholder="Describe your solution..."
                  className="min-h-[80px]"
                />
              </div>
              <Button onClick={addCustomSolution} className="w-full">
                Add Solution
              </Button>
            </div>
          )}
                    </div>
                    
        {/* Solutions List */}
        {solutions.length > 0 && (
                    <div>
            <h3 className="font-semibold mb-4">Generated Solutions</h3>
            <div className="space-y-4">
              {solutions.map((solution) => (
                <Card key={solution.id} className={`border-2 ${
                  solution.isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-semibold">{solution.title}</h4>
                          {solution.isSelected && (
                            <Badge className="bg-green-600">Selected</Badge>
                          )}
                        </div>
                        <p className="text-gray-600 text-sm">{solution.description}</p>
                    </div>
                    
                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleSolutionSelection(solution.id)}
                          className={solution.isSelected ? 'bg-green-100 border-green-300' : ''}
                        >
                          {solution.isSelected ? <CheckCircle className="h-4 w-4 text-green-600" /> : 'Select'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteSolution(solution.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            </div>
          </div>
        )}

        {/* Next Step */}
        <div className="flex justify-end">
            <Button
            onClick={onNextStep}
            disabled={!hasSelectedSolution}
              className="bg-green-600 hover:bg-green-700"
            >
            Continue to Competitor Analysis <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
      </CardContent>
    </Card>
  );
}
