'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileText, 
  Brain, 
  CheckCircle, 
  Tool, 
  Plus, 
  Search,
  Clock,
  User,
  MessageSquare,
  Activity
} from 'lucide-react';

interface Note {
  id: string;
  content: string;
  author: string;
  timestamp: string;
  session_id: string;
}

interface Summary {
  id: string;
  stage: string;
  content: string;
  timestamp: string;
  session_id: string;
}

interface EvalResult {
  id: string;
  stage: string;
  score: number;
  feedback: string;
  timestamp: string;
  session_id: string;
}

interface ToolTrace {
  id: string;
  tool_name: string;
  input: string;
  output: string;
  execution_time: number;
  timestamp: string;
  session_id: string;
  status: 'success' | 'error' | 'pending';
}

interface ContextEngineeringPanelProps {
  sessionId: string;
  className?: string;
}

export default function ContextEngineeringPanel({ 
  sessionId, 
  className = '' 
}: ContextEngineeringPanelProps) {
  const [activeTab, setActiveTab] = useState('notes');
  const [notes, setNotes] = useState<Note[]>([]);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [evalResults, setEvalResults] = useState<EvalResult[]>([]);
  const [toolTraces, setToolTraces] = useState<ToolTrace[]>([]);
  const [loading, setLoading] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch data based on active tab
  useEffect(() => {
    if (sessionId) {
      fetchTabData(activeTab);
    }
  }, [activeTab, sessionId]);

  const fetchTabData = async (tab: string) => {
    setLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_CHAT_API_URL || 'http://localhost:3001/api';
      
      switch (tab) {
        case 'notes':
          const notesRes = await fetch(`${baseUrl}/chat/notes?sessionId=${sessionId}`);
          if (notesRes.ok) {
            const notesData = await notesRes.json();
            setNotes(notesData.notes || []);
          }
          break;
          
        case 'summaries':
          const summariesRes = await fetch(`${baseUrl}/chat/summarize?sessionId=${sessionId}`);
          if (summariesRes.ok) {
            const summariesData = await summariesRes.json();
            setSummaries(summariesData.summaries || []);
          }
          break;
          
        case 'evaluations':
          const evalRes = await fetch(`${baseUrl}/chat/eval/stage-flow?sessionId=${sessionId}`);
          if (evalRes.ok) {
            const evalData = await evalRes.json();
            setEvalResults(evalData.results || []);
          }
          break;
          
        case 'tools':
          const toolsRes = await fetch(`${baseUrl}/chat/tools`);
          if (toolsRes.ok) {
            const toolsData = await toolsRes.json();
            setToolTraces(toolsData.traces || []);
          }
          break;
      }
    } catch (error) {
      console.error(`Error fetching ${tab} data:`, error);
    } finally {
      setLoading(false);
    }
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    
    try {
      const baseUrl = process.env.NEXT_PUBLIC_CHAT_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${baseUrl}/chat/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          content: newNote,
          author: 'User'
        })
      });
      
      if (response.ok) {
        setNewNote('');
        fetchTabData('notes');
      }
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const filteredNotes = notes.filter(note => 
    note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSummaries = summaries.filter(summary => 
    summary.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    summary.stage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredEvalResults = evalResults.filter(eval => 
    eval.feedback.toLowerCase().includes(searchQuery.toLowerCase()) ||
    eval.stage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredToolTraces = toolTraces.filter(trace => 
    trace.tool_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    trace.input.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`w-full ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Context Engineering
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="notes" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Notes
              </TabsTrigger>
              <TabsTrigger value="summaries" className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Summaries
              </TabsTrigger>
              <TabsTrigger value="evaluations" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Evaluations
              </TabsTrigger>
              <TabsTrigger value="tools" className="flex items-center gap-2">
                <Tool className="h-4 w-4" />
                Tools
              </TabsTrigger>
            </TabsList>

            {/* Search Bar */}
            <div className="mt-4 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search across all content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Notes Tab */}
            <TabsContent value="notes" className="mt-4">
              <div className="space-y-4">
                {/* Add Note */}
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Add a new note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="flex-1"
                    rows={3}
                  />
                  <Button onClick={addNote} className="self-end">
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>

                {/* Notes List */}
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {loading ? (
                      <div className="text-center py-8">Loading notes...</div>
                    ) : filteredNotes.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">No notes yet</div>
                    ) : (
                      filteredNotes.map((note) => (
                        <Card key={note.id} className="p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm text-gray-600 mb-2">{note.content}</p>
                              <div className="flex items-center gap-4 text-xs text-gray-400">
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {note.author}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(note.timestamp).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>

            {/* Summaries Tab */}
            <TabsContent value="summaries" className="mt-4">
              <ScrollArea className="h-80">
                <div className="space-y-3">
                  {loading ? (
                    <div className="text-center py-8">Loading summaries...</div>
                  ) : filteredSummaries.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No summaries yet</div>
                  ) : (
                    filteredSummaries.map((summary) => (
                      <Card key={summary.id} className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="secondary">{summary.stage}</Badge>
                          <span className="text-xs text-gray-400">
                            {new Date(summary.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm">{summary.content}</p>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Evaluations Tab */}
            <TabsContent value="evaluations" className="mt-4">
              <ScrollArea className="h-80">
                <div className="space-y-3">
                  {loading ? (
                    <div className="text-center py-8">Loading evaluations...</div>
                  ) : filteredEvalResults.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No evaluations yet</div>
                  ) : (
                    filteredEvalResults.map((eval) => (
                      <Card key={eval.id} className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="secondary">{eval.stage}</Badge>
                          <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4" />
                            <span className="text-sm font-medium">Score: {eval.score}/10</span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{eval.feedback}</p>
                        <span className="text-xs text-gray-400">
                          {new Date(eval.timestamp).toLocaleString()}
                        </span>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Tools Tab */}
            <TabsContent value="tools" className="mt-4">
              <ScrollArea className="h-80">
                <div className="space-y-3">
                  {loading ? (
                    <div className="text-center py-8">Loading tool traces...</div>
                  ) : filteredToolTraces.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No tool executions yet</div>
                  ) : (
                    filteredToolTraces.map((trace) => (
                      <Card key={trace.id} className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Tool className="h-4 w-4" />
                            <span className="font-medium">{trace.tool_name}</span>
                          </div>
                          <Badge 
                            variant={trace.status === 'success' ? 'default' : 
                                   trace.status === 'error' ? 'destructive' : 'secondary'}
                          >
                            {trace.status}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium text-gray-600">Input:</span>
                            <p className="text-gray-800 bg-gray-50 p-2 rounded mt-1">
                              {trace.input}
                            </p>
                          </div>
                          
                          <div>
                            <span className="font-medium text-gray-600">Output:</span>
                            <p className="text-gray-800 bg-gray-50 p-2 rounded mt-1">
                              {trace.output}
                            </p>
                          </div>
                          
                          <div className="flex items-center justify-between text-xs text-gray-400">
                            <span>Execution: {trace.execution_time}ms</span>
                            <span>{new Date(trace.timestamp).toLocaleString()}</span>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
