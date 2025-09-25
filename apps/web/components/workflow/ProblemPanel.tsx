'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Target, Users, Zap, ArrowRight } from 'lucide-react';

interface ProblemPanelProps {
  project: any;
  onUpdate: (updates: any) => void;
  onNextStep: () => void;
  isClarification?: boolean;
}

export function ProblemPanel({ project, onUpdate, onNextStep, isClarification = false }: ProblemPanelProps) {
  const [rawInput, setRawInput] = useState(project.problem?.rawInput || '');
  const [clarifiedProblem, setClarifiedProblem] = useState(project.problem?.clarifiedProblem || '');
  const [isClarifying, setIsClarifying] = useState(false);

  // Sync local state with project updates
  useEffect(() => {
    setRawInput(project.problem?.rawInput || '');
    setClarifiedProblem(project.problem?.clarifiedProblem || '');
  }, [project.problem]);

  // Update project when rawInput changes
  const handleRawInputChange = (value: string) => {
    setRawInput(value);
    onUpdate({
      problem: {
        ...project.problem,
        rawInput: value
      }
    });
  };

  const handleClarifyProblem = async () => {
    if (!rawInput.trim()) return;
    
    setIsClarifying(true);
    try {
      // Use CrewAI system to clarify the problem
      const response = await fetch('/api/ai/clarify-problem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          problem: rawInput,
          projectId: project.id,
          projectName: project.name,
          context: `Clarify and structure this problem statement for a startup project: ${rawInput}`
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const clarified = data.clarifiedProblem || data.response || `AI analysis of: ${rawInput}`;
        
        setClarifiedProblem(clarified);
        onUpdate({
          problem: {
            rawInput,
            clarifiedProblem: clarified
          }
        });
      } else {
        // Fallback to CrewAI chat suggestion if API fails
        const fallbackClarified = `**Problem Statement Analysis Needed**

Your input: "${rawInput}"

**Next Steps:**
1. **Use the AI Co-Founder chat widget** on the right to discuss this problem
2. **Ask the AI team** to help clarify and structure your problem statement
3. **Get insights** from different perspectives (Leadership, Technical, Business, etc.)

**Suggested questions for the AI team:**
• "How can I make this problem statement more specific?"
• "What are the key components I should focus on?"
• "Who is the target audience for this problem?"
• "What makes this problem worth solving?"

Click "Continue to Solutions" when you're ready, or use the chat to get AI clarification.`;
        
        setClarifiedProblem(fallbackClarified);
        onUpdate({
          problem: {
            rawInput,
            clarifiedProblem: fallbackClarified
          }
        });
      }
    } catch (error) {
      console.error('Error clarifying problem:', error);
      
      // Fallback message encouraging use of CrewAI chat
      const fallbackClarified = `**Problem Statement Analysis Needed**

Your input: "${rawInput}"

**Next Steps:**
1. **Use the AI Co-Founder chat widget** on the right to discuss this problem
2. **Ask the AI team** to help clarify and structure your problem statement
3. **Get insights** from different perspectives (Leadership, Technical, Business, etc.)

**Suggested questions for the AI team:**
• "How can I make this problem statement more specific?"
• "What are the key components I should focus on?"
• "Who is the target audience for this problem?"
• "What makes this problem worth solving?"

Click "Continue to Solutions" when you're ready, or use the chat to get AI clarification.`;
      
      setClarifiedProblem(fallbackClarified);
      onUpdate({
        problem: {
          rawInput,
          clarifiedProblem: fallbackClarified
        }
      });
    } finally {
      setIsClarifying(false);
    }
  };

  if (isClarification) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
            <Target className="h-5 w-5 mr-2" />
            Problem Clarification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">Your Initial Input:</h3>
            <Textarea
              value={rawInput}
              onChange={(e) => handleRawInputChange(e.target.value)}
              placeholder="Describe your problem or startup idea..."
              className="min-h-[100px]"
            />
          </div>
          
          {clarifiedProblem && (
            <div>
              <h3 className="font-semibold mb-2">AI Clarification:</h3>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: clarifiedProblem.replace(/\n/g, '<br/>') }} />
              </div>
            </div>
          )}
          
          <div className="flex justify-between">
            <Button
              onClick={handleClarifyProblem}
              disabled={isClarifying || !rawInput.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isClarifying ? 'Clarifying...' : 'Clarify Problem Statement'}
            </Button>
            
            {clarifiedProblem && (
              <Button onClick={onNextStep} className="bg-green-600 hover:bg-green-700">
                Continue to Solutions <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
          <Lightbulb className="h-5 w-5 mr-2" />
          Problem Capture
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="font-semibold mb-2">Describe Your Problem or Idea:</h3>
          <Textarea
            value={rawInput}
            onChange={(e) => handleRawInputChange(e.target.value)}
            placeholder="Describe the problem you're trying to solve or the idea you want to explore..."
            className="min-h-[120px]"
          />
          <p className="text-sm text-gray-500 mt-2">
            Be specific about what you're trying to solve and who experiences this problem.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <h4 className="font-semibold text-blue-800">Target Audience</h4>
            <p className="text-sm text-blue-600">Who experiences this problem?</p>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <Target className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <h4 className="font-semibold text-green-800">Pain Points</h4>
            <p className="text-sm text-green-600">What are the specific frustrations?</p>
          </div>
          
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <Zap className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <h4 className="font-semibold text-purple-800">Opportunity</h4>
            <p className="text-sm text-purple-600">What's missing in current solutions?</p>
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button
            onClick={onNextStep}
            disabled={!rawInput.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Continue to Clarification <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
