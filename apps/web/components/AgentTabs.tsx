import React, { useState } from 'react';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai' | 'agent';
  timestamp: Date;
  agentId?: string;
  agentName?: string;
  agentTitle?: string;
  type?: 'user_input' | 'agent_contribution' | 'decision_point' | 'user_approval';
  metadata?: {
    tokens?: number;
    cost?: number;
    model?: string;
    dataPoints?: string[];
    source?: string;
    thinkingTime?: number;
    department?: string;
    messages?: any[];
    decisionDocument?: string;
    confidence?: number;
    sampleSize?: number;
    dataQueries?: any[];
    effort?: string;
    strategy?: string;
    questions?: string[];
    nextSteps?: string[];
  };
}

interface AgentTabsProps {
  messages: Message[];
  decisionDocument: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

interface AgentWork {
  agentId: string;
  agentName: string;
  agentTitle: string;
  department: string;
  detailedAnalysis: string;
  recommendations: string[];
  dataPoints: any[];
  confidence: number;
  effort: string;
  strategy: string;
  questions: string[];
  nextSteps: string[];
}

export const AgentTabs: React.FC<AgentTabsProps> = ({
  messages,
  decisionDocument,
  activeTab,
  onTabChange
}) => {
  const [selectedAgent, setSelectedAgent] = useState<string>('');

  // Extract agent work from messages
  const getAgentWork = (): AgentWork[] => {
    const agentMessages = messages.filter(m => m.sender === 'agent' && m.agentName);
    const agentWork: { [key: string]: AgentWork } = {};

    agentMessages.forEach(msg => {
      if (!agentWork[msg.agentId!]) {
        agentWork[msg.agentId!] = {
          agentId: msg.agentId!,
          agentName: msg.agentName!,
          agentTitle: msg.agentTitle!,
          department: msg.metadata?.department || 'General',
          detailedAnalysis: msg.content,
          recommendations: [],
          dataPoints: msg.metadata?.dataPoints || [],
          confidence: msg.metadata?.confidence || 0.8,
          effort: msg.metadata?.effort || 'Standard analysis',
          strategy: msg.metadata?.strategy || 'Data-driven approach',
          questions: [],
          nextSteps: []
        };
      } else {
        // Append additional content
        agentWork[msg.agentId!].detailedAnalysis += '\n\n' + msg.content;
      }
    });

    return Object.values(agentWork);
  };

  const agentWork = getAgentWork();

  // Generate comprehensive document
  const generateComprehensiveReport = (): string => {
    let report = `# Comprehensive Business Analysis Report\n\n`;
    report += `**Generated**: ${new Date().toLocaleDateString()}\n`;
    report += `**Total Agents**: ${agentWork.length}\n\n`;

    // Executive Summary
    report += `## 📋 Executive Summary\n\n`;
    report += `This report presents a comprehensive analysis conducted by our AI business team.\n\n`;

    // Agent Contributions
    report += `## 👥 Agent Contributions\n\n`;
    agentWork.forEach(agent => {
      report += `### ${agent.agentName} (${agent.agentTitle})\n`;
      report += `**Department**: ${agent.department}\n`;
      report += `**Confidence**: ${Math.round(agent.confidence * 100)}%\n`;
      report += `**Strategy**: ${agent.strategy}\n`;
      report += `**Effort**: ${agent.effort}\n\n`;
      report += `**Analysis**:\n${agent.detailedAnalysis}\n\n`;
      report += `---\n\n`;
    });

    // Decision Document
    if (decisionDocument) {
      report += `## 🎯 Decision Points\n\n${decisionDocument}\n\n`;
    }

    return report;
  };

  const exportToMarkdown = () => {
    const report = generateComprehensiveReport();
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `business-analysis-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportToPDF = async () => {
    // Use a free open source service for PDF conversion
    const report = generateComprehensiveReport();
    
    try {
      // Using a free PDF conversion service
      const response = await fetch('https://api.github.com/markdown', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: report,
          mode: 'gfm'
        })
      });

      if (response.ok) {
        const html = await response.text();
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <html>
              <head>
                <title>Business Analysis Report</title>
                <style>
                  body { font-family: Arial, sans-serif; margin: 40px; }
                  h1, h2, h3 { color: #333; }
                  .agent { margin-bottom: 30px; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
                </style>
              </head>
              <body>${html}</body>
            </html>
          `);
          printWindow.document.close();
          printWindow.print();
        }
      }
    } catch (error) {
      console.error('PDF export error:', error);
      alert('PDF export failed. Please try the Markdown export instead.');
    }
  };

  const exportToWord = () => {
    const report = generateComprehensiveReport();
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>Business Analysis Report</title></head>
        <body>${report.replace(/\n/g, '<br>').replace(/#{1,6}\s+(.+)/g, '<h1>$1</h1>')}</body>
      </html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `business-analysis-${new Date().toISOString().split('T')[0]}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => onTabChange('chat')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'chat'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            💬 Main Chat
          </button>
          
          {agentWork.map(agent => (
            <button
              key={agent.agentId}
              onClick={() => onTabChange(`agent-${agent.agentId}`)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === `agent-${agent.agentId}`
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              👤 {agent.agentName}
            </button>
          ))}
          
          <button
            onClick={() => onTabChange('documents')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'documents'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📄 Documents
          </button>
          

        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'chat' && (
          <div className="text-center text-gray-500 py-8">
            <p>Main chat content is displayed in the chat area above</p>
            <p>Use the agent tabs to see detailed work from each specialist</p>
          </div>
        )}

        {activeTab.startsWith('agent-') && (
          <div className="space-y-6">
            {(() => {
              const agentId = activeTab.replace('agent-', '');
              const agent = agentWork.find(a => a.agentId === agentId);
              if (!agent) return <div>Agent not found</div>;

              return (
                <div className="space-y-6">
                  {/* Agent Header */}
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-purple-500 rounded-lg flex items-center justify-center text-white text-2xl font-bold">
                        {agent.agentName.charAt(0)}
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                          {agent.agentName}
                        </h2>
                        <p className="text-lg text-purple-600 dark:text-purple-400">
                          {agent.agentTitle}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Department: {agent.department}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Strategy & Effort */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
                        🎯 Strategy
                      </h3>
                      <p className="text-gray-700 dark:text-gray-300">{agent.strategy}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
                        ⚡ Effort Level
                      </h3>
                      <p className="text-gray-700 dark:text-gray-300">{agent.effort}</p>
                    </div>
                  </div>

                  {/* Confidence & Data Points */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
                        📊 Confidence Level
                      </h3>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="bg-purple-600 h-2.5 rounded-full transition-all duration-300"
                          style={{ width: `${agent.confidence * 100}%` }}
                        ></div>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        {Math.round(agent.confidence * 100)}% confidence
                      </p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
                        📈 Data Points
                      </h3>
                      <p className="text-gray-700 dark:text-gray-300">
                        {agent.dataPoints.length > 0 
                          ? `${agent.dataPoints.length} data points collected`
                          : 'No specific data points available'
                        }
                      </p>
                    </div>
                  </div>

                  {/* Detailed Analysis */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
                      🔍 Detailed Analysis
                    </h3>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                        {agent.detailedAnalysis}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                📄 Document Export
              </h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={exportToMarkdown}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  📝 Export Markdown
                </button>
                <button
                  onClick={exportToPDF}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                >
                  📄 Export PDF
                </button>
                <button
                  onClick={exportToWord}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  📘 Export Word
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                📋 Comprehensive Report Preview
              </h3>
              <div className="prose prose-sm dark:prose-invert max-w-none max-h-96 overflow-y-auto">
                <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                  {generateComprehensiveReport()}
                </div>
              </div>
            </div>
          </div>
        )}


      </div>
    </div>
  );
};
