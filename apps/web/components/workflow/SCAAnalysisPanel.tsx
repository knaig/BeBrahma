'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Target, 
  Shield, 
  TrendingUp, 
  Lightbulb, 
  RefreshCw,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface SCAFactor {
  id: string;
  category: 'TECHNICAL' | 'BUSINESS_MODEL' | 'NETWORK_EFFECTS' | 'BRAND' | 'REGULATORY' | 'RESOURCE_BASED';
  factor: string;
  description: string;
  strength: 'LOW' | 'MEDIUM' | 'HIGH';
  sustainability: 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';
  evidence: string;
  actionItems: string[];
}

interface Project {
  id: string;
  name: string;
  workflowStep?: string;
  progress?: number;
  scaFactors?: SCAFactor[];
}

interface SCAAnalysisPanelProps {
  project: Project;
  onUpdate: (project: Project) => void;
}

export function SCAAnalysisPanel({ project, onUpdate }: SCAAnalysisPanelProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scaFactors, setScaFactors] = useState<SCAFactor[]>(project.scaFactors || []);
  const [analysisStatus, setAnalysisStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const strengthColors = {
    LOW: 'bg-red-100 text-red-800 border-red-200',
    MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    HIGH: 'bg-green-100 text-green-800 border-green-200'
  };

  const sustainabilityColors = {
    SHORT_TERM: 'bg-orange-100 text-orange-800 border-orange-200',
    MEDIUM_TERM: 'bg-blue-100 text-blue-800 border-blue-200',
    LONG_TERM: 'bg-purple-100 text-purple-800 border-purple-200'
  };

  const categoryIcons = {
    TECHNICAL: <Zap className="h-4 w-4" />,
    BUSINESS_MODEL: <TrendingUp className="h-4 w-4" />,
    NETWORK_EFFECTS: <Target className="h-4 w-4" />,
    BRAND: <Shield className="h-4 w-4" />,
    REGULATORY: <AlertCircle className="h-4 w-4" />,
    RESOURCE_BASED: <Lightbulb className="h-4 w-4" />
  };

  const analyzeSCA = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/ai/sca-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: project.id,
          projectName: project.name,
          context: `Analyze sustainable competitive advantages for project: ${project.name}`
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newScaFactors = data.scaFactors || [];
        setScaFactors(newScaFactors);
        
        // Update project with SCA factors
        const updatedProject = {
          ...project,
          scaFactors: newScaFactors
        };
        onUpdate(updatedProject);
        setAnalysisStatus('success');
      } else {
        // Handle API errors gracefully
        const errorData = await response.json().catch(() => ({}));
        console.error('SCA Analysis API error:', errorData);
        
        // Create fallback SCA factors if API fails
        const fallbackFactors: SCAFactor[] = [
          {
            id: 'fallback_1',
            category: 'TECHNICAL',
            factor: 'AI-Powered Platform',
            description: 'Leveraging artificial intelligence for enhanced user experience and automation',
            strength: 'HIGH',
            sustainability: 'LONG_TERM',
            evidence: 'AI technology provides significant competitive moat and continuous improvement potential',
            actionItems: ['Develop AI capabilities', 'Build technical team', 'Protect IP']
          },
          {
            id: 'fallback_2',
            category: 'BUSINESS_MODEL',
            factor: 'Subscription Revenue Model',
            description: 'Recurring revenue stream with predictable cash flow',
            strength: 'MEDIUM',
            sustainability: 'MEDIUM_TERM',
            evidence: 'Proven business model with high customer lifetime value',
            actionItems: ['Optimize pricing', 'Improve retention', 'Scale operations']
          }
        ];
        
        setScaFactors(fallbackFactors);
              const updatedProject = {
        ...project,
        scaFactors: fallbackFactors
      };
      onUpdate(updatedProject);
              setAnalysisStatus('error');
      }
    } catch (error) {
      console.error('Error analyzing SCA:', error);
      
      // Create fallback SCA factors on network error
      const fallbackFactors: SCAFactor[] = [
        {
          id: 'fallback_1',
          category: 'TECHNICAL',
          factor: 'AI-Powered Platform',
          description: 'Leveraging artificial intelligence for enhanced user experience and automation',
          strength: 'HIGH',
          sustainability: 'LONG_TERM',
          evidence: 'AI technology provides significant competitive moat and continuous improvement potential',
          actionItems: ['Develop AI capabilities', 'Build technical team', 'Protect IP']
        },
        {
          id: 'fallback_2',
          category: 'BUSINESS_MODEL',
          factor: 'Subscription Revenue Model',
          description: 'Recurring revenue stream with predictable cash flow',
          strength: 'MEDIUM',
          sustainability: 'MEDIUM_TERM',
          evidence: 'Proven business model with high customer lifetime value',
          actionItems: ['Optimize pricing', 'Improve retention', 'Scale operations']
        }
      ];
      
      setScaFactors(fallbackFactors);
      const updatedProject = {
        ...project,
        scaFactors: fallbackFactors
      };
      onUpdate(updatedProject);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const updateSCAFactor = (id: string, updates: Partial<SCAFactor>) => {
    const updatedFactors = scaFactors.map(factor => 
      factor.id === id ? { ...factor, ...updates } : factor
    );
    setScaFactors(updatedFactors);
    
    const updatedProject = {
      ...project,
      scaFactors: updatedFactors
    };
    onUpdate(updatedProject);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Zap className="h-6 w-6 text-purple-600" />
          <span>SCA Analysis</span>
          <Badge variant="outline" className="ml-2">
            Step 5 of 7
          </Badge>
        </CardTitle>
        <p className="text-gray-600">
          Identify your sustainable competitive advantages and differentiation strategies
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Analysis Controls */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
          <div>
            <h3 className="font-semibold text-purple-800">Strategic Competitive Analysis</h3>
            <p className="text-sm text-purple-600">
              AI will analyze your project and identify potential sustainable competitive advantages
            </p>
          </div>
          <Button 
            onClick={analyzeSCA} 
            disabled={isAnalyzing}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {isAnalyzing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            {isAnalyzing ? 'Analyzing...' : 'Analyze SCA'}
          </Button>
        </div>

        {/* Status Messages */}
        {analysisStatus === 'success' && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="text-green-800 font-medium">SCA Analysis completed successfully!</p>
            </div>
            <p className="text-green-700 text-sm mt-1">
              {scaFactors.length} competitive advantage factors have been identified.
            </p>
          </div>
        )}

        {analysisStatus === 'error' && (
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <p className="text-orange-800 font-medium">SCA Analysis completed with fallback data</p>
            </div>
            <p className="text-orange-700 text-sm mt-1">
              The AI analysis encountered an issue, but we've provided sample SCA factors to get you started.
            </p>
          </div>
        )}

        {/* SCA Factors Display */}
        {scaFactors.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Identified SCA Factors</h3>
            
            {scaFactors.map((factor) => (
              <Card key={factor.id} className="border-l-4 border-l-purple-500">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {categoryIcons[factor.category]}
                      <Badge variant="outline" className="text-xs">
                        {factor.category.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex space-x-2">
                      <Badge className={`text-xs ${strengthColors[factor.strength]}`}>
                        {factor.strength} Strength
                      </Badge>
                      <Badge className={`text-xs ${sustainabilityColors[factor.sustainability]}`}>
                        {factor.sustainability.replace('_', ' ')} Term
                      </Badge>
                    </div>
                  </div>
                  
                  <h4 className="font-semibold text-gray-800 mb-2">{factor.factor}</h4>
                  <p className="text-gray-600 text-sm mb-3">{factor.description}</p>
                  
                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-500 mb-1">Evidence:</p>
                    <p className="text-sm text-gray-700">{factor.evidence}</p>
                  </div>
                  
                  {factor.actionItems.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2">Action Items:</p>
                      <ul className="space-y-1">
                        {factor.actionItems.map((item, index) => (
                          <li key={index} className="flex items-center space-x-2 text-sm text-gray-700">
                            <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                            <span>{item}</span>
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
        {scaFactors.length === 0 && !isAnalyzing && (
          <div className="text-center py-12">
            <Zap className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No SCA Factors Yet</h3>
            <p className="text-gray-500 mb-4">
              Click "Analyze SCA" to identify your sustainable competitive advantages
            </p>
          </div>
        )}

        {/* Next Steps */}
        {scaFactors.length > 0 && (
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div className="flex-1">
                <h3 className="font-semibold text-green-800">SCA Analysis Complete!</h3>
                <p className="text-sm text-green-600 mb-4">
                  You've identified {scaFactors.length} competitive advantages. 
                  Next step: MVP Planning to prioritize features based on your SCAs.
                </p>
                
                <Button
                  onClick={() => onUpdate({
                    ...project,
                    workflowStep: 'MVP_PLANNING',
                    progress: Math.round((6 / 7) * 100)
                  })}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Target className="h-4 w-4 mr-2" />
                  Proceed to MVP Planning
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
