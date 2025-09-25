'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WorkflowDashboard } from '@/components/WorkflowDashboard';

export default function DemoPage() {
  const [showWorkflow, setShowWorkflow] = useState(false);

  if (showWorkflow) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-white">
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">🚀 BeBrahma Workflow System</h1>
            <Button 
              onClick={() => setShowWorkflow(false)}
              variant="outline"
            >
              ← Back to Dashboard
            </Button>
          </div>
        </div>
        
        <WorkflowDashboard />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🚀 BeBrahma Demo Dashboard
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Experience the enhanced AI Co-Founder system with real-time agent collaboration and decision-making capabilities.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="shadow-lg border-2 border-blue-200">
            <CardHeader>
              <CardTitle className="text-xl flex items-center">
                <span className="text-2xl mr-2">🤖</span>
                AI Co-Founder System
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Launch your AI Co-Founder team and start collaborating on your startup project. 
                Experience real-time agent debates, decision-making, and strategic planning.
              </p>
              <Button 
                onClick={() => setShowWorkflow(true)}
                className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white py-3 text-lg font-semibold"
              >
                🚀 Launch AI Co-Founder
              </Button>
            </CardContent>
          </Card>
          
          <Card className="shadow-lg border-2 border-purple-200">
            <CardHeader>
              <CardTitle className="text-xl flex items-center">
                <span className="text-2xl mr-2">⚡</span>
                Workflow Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>7-Step Startup Workflow</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>AI-Powered Problem Analysis</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Solution Brainstorming</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Competitor Analysis</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>SCA & MVP Planning</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Task Generation</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card className="shadow-lg border-2 border-green-200">
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <span className="text-2xl mr-2">📈</span>
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-2xl mb-2">✅</div>
                <div className="font-semibold text-green-800">Frontend</div>
                <div className="text-sm text-green-600">Running</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-2xl mb-2">🔧</div>
                <div className="font-semibold text-blue-800">Backend</div>
                <div className="text-sm text-blue-600">Ready</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="text-2xl mb-2">🤖</div>
                <div className="font-semibold text-purple-800">AI Agents</div>
                <div className="text-sm text-purple-600">6 Active</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="text-2xl mb-2">💾</div>
                <div className="font-semibold text-yellow-800">Database</div>
                <div className="text-sm text-yellow-600">Connected</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="mt-8 text-center">
          <p className="text-gray-600 mb-4">
            Ready to experience the complete startup workflow with AI Co-Founder collaboration?
          </p>
          <Button 
            onClick={() => setShowWorkflow(true)}
            size="lg"
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-4 text-lg font-semibold"
          >
            🚀 Launch Complete Workflow System
          </Button>
        </div>
      </div>
    </div>
  );
}
