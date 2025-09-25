import React, { useState } from 'react';
import { Brain, Users, Target, Zap, Lightbulb, Download, Share2 } from 'lucide-react';

interface MindMapProps {
  progressState: any;
}

export function MindMap({ progressState }: MindMapProps) {
  const [zoom, setZoom] = useState(1);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Mind map data structure
  const mindMapData = {
    center: {
      id: 'saas-analysis',
      label: 'SaaS Business Analysis',
      type: 'center',
      icon: Brain
    },
    nodes: [
      // Planning Phase
      {
        id: 'planning',
        label: 'Planning & Research',
        type: 'phase',
        status: 'completed',
        icon: Target,
        position: { x: -300, y: -200 },
        children: [
          { id: 'market-research', label: 'Market Research', status: 'completed' },
          { id: 'problem-validation', label: 'Problem Validation', status: 'completed' },
          { id: 'competitive-analysis', label: 'Competitive Analysis', status: 'completed' }
        ]
      },
      // Agent Selection
      {
        id: 'agent-selection',
        label: 'Expert Team Assembly',
        type: 'phase',
        status: 'completed',
        icon: Users,
        position: { x: 300, y: -200 },
        children: [
          { id: 'ceo', label: 'CEO - Business Strategy', status: 'active' },
          { id: 'cto', label: 'CTO - Technical Feasibility', status: 'active' },
          { id: 'demand-modeler', label: 'Demand Modeler - Market Sizing', status: 'active' },
          { id: 'product-manager', label: 'Product Manager - Market Fit', status: 'pending' }
        ]
      },
      // Data Gathering
      {
        id: 'data-gathering',
        label: 'Data Collection & Analysis',
        type: 'phase',
        status: 'active',
        icon: Zap,
        position: { x: -300, y: 200 },
        children: [
          { id: 'market-data', label: 'Market Data', status: 'completed' },
          { id: 'user-research', label: 'User Research', status: 'active' },
          { id: 'technical-assessment', label: 'Technical Assessment', status: 'pending' }
        ]
      },
      // Decision Making
      {
        id: 'decision-making',
        label: 'Strategic Decision Making',
        type: 'phase',
        status: 'pending',
        icon: Lightbulb,
        position: { x: 300, y: 200 },
        children: [
          { id: 'business-model', label: 'Business Model Selection', status: 'pending' },
          { id: 'go-to-market', label: 'Go-to-Market Strategy', status: 'pending' },
          { id: 'resource-allocation', label: 'Resource Allocation', status: 'pending' }
        ]
      }
    ]
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'active': return 'bg-blue-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'active': return 'In Progress';
      case 'pending': return 'Pending';
      default: return 'Unknown';
    }
  };

  const renderNode = (node: any) => (
    <div
      key={node.id}
      className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 ${
        selectedNode === node.id ? 'scale-110 z-20' : 'z-10'
      }`}
      style={{
        left: `${node.position.x * zoom}px`,
        top: `${node.position.y * zoom}px`,
        transform: `translate(-50%, -50%) scale(${zoom})`
      }}
      onClick={() => setSelectedNode(node.id)}
    >
      {/* Node Content */}
      <div className={`relative p-4 rounded-lg border-2 shadow-lg transition-all duration-300 ${
        node.type === 'center'
          ? 'bg-purple-500 text-white border-purple-600 min-w-[200px]'
          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 min-w-[180px]'
      }`}>
        <div className="flex items-center gap-2 mb-2">
          <node.icon className="w-5 h-5" />
          <span className="font-semibold text-sm">{node.label}</span>
        </div>
        
        {node.type !== 'center' && (
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${getStatusColor(node.status)}`} />
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {getStatusText(node.status)}
            </span>
          </div>
        )}

        {/* Children Nodes */}
        {node.children && (
          <div className="mt-3 space-y-2">
            {node.children.map((child: any) => (
              <div
                key={child.id}
                className={`flex items-center gap-2 p-2 rounded text-xs ${
                  child.status === 'completed' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200' :
                  child.status === 'active' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200' :
                  'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${getStatusColor(child.status)}`} />
                {child.label}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Connection Lines */}
      {node.type !== 'center' && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{
            left: `${node.position.x * zoom}px`,
            top: `${node.position.y * zoom}px`,
            transform: `translate(-50%, -50%) scale(${zoom})`
          }}
        >
          <line
            x1="50%"
            y1="50%"
            x2="50%"
            y2="50%"
            stroke="#9CA3AF"
            strokeWidth="2"
            strokeDasharray="5,5"
          />
        </svg>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6">
        <h1 className="text-2xl font-bold mb-2">🧠 Strategic Mind Map</h1>
        <p className="text-orange-100">
          Visualize the thought process, planning stages, and expert involvement
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Zoom: {Math.round(zoom * 100)}%
            </label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-32"
            />
            <button
              onClick={() => setZoom(1)}
              className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Reset
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            <button className="flex items-center gap-2 px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="flex items-center gap-2 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors">
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>
        </div>
      </div>

      {/* Mind Map Canvas */}
      <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900 relative">
        <div className="relative w-full h-full min-h-[800px]">
          {/* Center Node */}
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
            <div className="bg-purple-500 text-white p-6 rounded-lg border-2 border-purple-600 shadow-lg min-w-[250px] text-center">
              <div className="flex items-center justify-center gap-3 mb-3">
                <Brain className="w-8 h-8" />
                <span className="text-xl font-bold">SaaS Business Analysis</span>
              </div>
              <div className="text-purple-100 text-sm">
                Strategic planning and expert analysis
              </div>
            </div>
          </div>

          {/* Phase Nodes */}
          {mindMapData.nodes.map(renderNode)}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-3">
        <div className="flex items-center justify-center space-x-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-gray-600 dark:text-gray-400">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-gray-600 dark:text-gray-400">In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-gray-600 dark:text-gray-400">Pending</span>
          </div>
        </div>
      </div>
    </div>
  );
}
