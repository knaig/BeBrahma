import React from 'react';
import ContextEngineeringPanel from '@/components/ContextEngineeringPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, FileText, CheckCircle, Tool, Activity } from 'lucide-react';

export default function ContextPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Context Engineering Dashboard</h1>
        <p className="text-gray-600">
          Monitor and manage AI agent conversations, decisions, and tool usage
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">
              +2 from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Notes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">
              +12 from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stage Evaluations</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7</div>
            <p className="text-xs text-muted-foreground">
              +3 from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tool Executions</CardTitle>
            <Tool className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">156</div>
            <p className="text-xs text-muted-foreground">
              +89 from last week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Context Engineering Panel */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Session Context</h2>
        </div>
        
        {/* For now, show with a demo session ID - in real app this would come from context */}
        <ContextEngineeringPanel 
          sessionId="demo_session_123" 
          className="min-h-[600px]"
        />
      </div>

      {/* Additional Context Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Memory Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Manage long-term memory, embeddings, and cross-session recall for AI agents.
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Vector Database Size</span>
                <span className="font-medium">2.4 GB</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Embedding Dimensions</span>
                <span className="font-medium">1536</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Total Vectors</span>
                <span className="font-medium">12,847</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tool className="h-5 w-5" />
              Tool Registry
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Monitor registered tools, their schemas, and execution performance.
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Registered Tools</span>
                <span className="font-medium">8</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Success Rate</span>
                <span className="font-medium text-green-600">94.2%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Avg Response Time</span>
                <span className="font-medium">1.2s</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
