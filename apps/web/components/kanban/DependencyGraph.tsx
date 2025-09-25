'use client';

import React, { useMemo } from 'react';
import { ForceGraph2D } from 'react-force-graph';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dependencies?: string[];
}

interface DependencyGraphProps {
  tasks: Task[];
  width?: number;
  height?: number;
}

const DependencyGraph: React.FC<DependencyGraphProps> = ({ 
  tasks, 
  width = 600, 
  height = 400 
}) => {
  const graphData = useMemo(() => {
    const nodes = tasks.map(task => ({
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      val: 1
    }));

    const links: any[] = [];
    
    // Create links based on task dependencies
    tasks.forEach(task => {
      if (task.dependencies) {
        task.dependencies.forEach(depId => {
          links.push({
            source: depId,
            target: task.id,
            type: 'dependency'
          });
        });
      }
    });

    return { nodes, links };
  }, [tasks]);

  const getNodeColor = (node: any) => {
    switch (node.status) {
      case 'TODO': return '#6B7280';
      case 'IN_PROGRESS': return '#3B82F6';
      case 'IN_REVIEW': return '#8B5CF6';
      case 'DONE': return '#10B981';
      case 'BLOCKED': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getNodeSize = (node: any) => {
    switch (node.priority.toLowerCase()) {
      case 'high': return 8;
      case 'medium': return 6;
      case 'low': return 4;
      default: return 5;
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        No tasks to display
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4">Task Dependencies</h3>
      <div className="bg-gray-50 rounded-lg overflow-hidden">
        <ForceGraph2D
          graphData={graphData}
          width={width}
          height={height}
          nodeColor={getNodeColor}
          nodeVal={getNodeSize}
          linkColor={() => '#94A3B8'}
          linkWidth={1}
          nodeLabel={(node: any) => `
            <div class="bg-white p-2 rounded shadow-lg border">
              <div class="font-semibold">${node.title}</div>
              <div class="text-sm text-gray-600">Status: ${node.status}</div>
              <div class="text-sm text-gray-600">Priority: ${node.priority}</div>
            </div>
          `}
          onNodeClick={(node: any) => {
            console.log('Clicked node:', node);
          }}
          cooldownTicks={100}
          nodeCanvasObject={(node: any, ctx, globalScale) => {
            const label = node.title;
            const fontSize = 12 / globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            const textWidth = ctx.measureText(label).width;
            const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillRect(
              node.x - bckgDimensions[0] / 2,
              node.y + bckgDimensions[1] / 2,
              ...bckgDimensions
            );

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#374151';
            ctx.fillText(label, node.x, node.y + bckgDimensions[1] / 2 + fontSize * 0.1);
          }}
        />
      </div>
      
      <div className="mt-4 flex flex-wrap gap-2">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-full bg-gray-500"></div>
          <span>TODO</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span>IN_PROGRESS</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-full bg-purple-500"></div>
          <span>IN_REVIEW</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span>DONE</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span>BLOCKED</span>
        </div>
      </div>
    </div>
  );
};

export default DependencyGraph;
