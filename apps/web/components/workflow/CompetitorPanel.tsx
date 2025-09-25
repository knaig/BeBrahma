'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, TrendingUp, ArrowRight, Target, AlertTriangle } from 'lucide-react';

interface Competitor {
  id: string;
  name: string;
  description: string;
  strengths: string[];
  weaknesses: string[];
}

interface CompetitorPanelProps {
  project: any;
  onUpdate: (updates: any) => void;
  onNextStep: () => void;
}

export function CompetitorPanel({ project, onUpdate, onNextStep }: CompetitorPanelProps) {
  const [competitors, setCompetitors] = useState<Competitor[]>(project.competitors || []);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeCompetitors = async () => {
    setIsAnalyzing(true);
    try {
      // Simulate AI competitor analysis
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const generatedCompetitors = [
        {
          id: `comp_${Date.now()}_1`,
          name: 'Market Research Pro',
          description: 'Established platform with comprehensive market data and analytics.',
          strengths: ['Large user base', 'Comprehensive data', 'Established brand'],
          weaknesses: ['Expensive pricing', 'Complex interface', 'Slow innovation']
        },
        {
          id: `comp_${Date.now()}_2`,
          name: 'Startup Insights',
          description: 'Focused on startup ecosystem with mentorship and networking.',
          strengths: ['Startup-focused', 'Strong community', 'Affordable pricing'],
          weaknesses: ['Limited data', 'Small team', 'Regional focus']
        },
        {
          id: `comp_${Date.now()}_3`,
          name: 'Business Model Canvas',
          description: 'Simple tool for business model development and validation.',
          strengths: ['Simple interface', 'Free tier', 'Widely adopted'],
          weaknesses: ['Basic features', 'No AI integration', 'Limited analytics']
        }
      ];
      
      setCompetitors(generatedCompetitors);
      onUpdate({ competitors: generatedCompetitors });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
          <Search className="h-5 w-5 mr-2" />
          Competitor Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Analysis Section */}
        <div className="text-center p-6 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-800 mb-2">AI-Powered Competitor Research</h3>
          <p className="text-blue-600 mb-4">
            Analyze your competitive landscape to identify opportunities and threats
          </p>
          <Button
            onClick={analyzeCompetitors}
            disabled={isAnalyzing}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isAnalyzing ? 'Analyzing Competitors...' : 'Analyze Competitors'}
          </Button>
        </div>

        {/* Competitors Display */}
        {competitors.length > 0 && (
          <div>
            <h3 className="font-semibold mb-4">Competitive Landscape</h3>
            <div className="space-y-4">
              {competitors.map((competitor) => (
                <Card key={competitor.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-lg">{competitor.name}</h4>
                        <p className="text-gray-600 text-sm">{competitor.description}</p>
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-medium text-green-700 mb-2 flex items-center">
                          <TrendingUp className="h-4 w-4 mr-1" />
                          Strengths
                        </h5>
                        <ul className="space-y-1">
                          {competitor.strengths.map((strength, index) => (
                            <li key={index} className="text-sm text-green-600 flex items-center">
                              <Target className="h-3 w-3 mr-2" />
                              {strength}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h5 className="font-medium text-red-700 mb-2 flex items-center">
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          Weaknesses
                        </h5>
                        <ul className="space-y-1">
                          {competitor.weaknesses.map((weakness, index) => (
                            <li key={index} className="text-sm text-red-600 flex items-center">
                              <AlertTriangle className="h-3 w-3 mr-2" />
                              {weakness}
                            </li>
                          ))}
                        </ul>
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
            disabled={competitors.length === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            Continue to SCA Analysis <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
