import React, { useState } from 'react';
import { GraphData, GraphNode, GraphEdge } from '../../types';
import { Shield, FileText, CheckCircle, AlertTriangle, Scale, Info } from 'lucide-react';

interface EvidenceGraphProps {
  graphData: GraphData;
  onSelectNode?: (node: GraphNode) => void;
}

export const EvidenceGraph: React.FC<EvidenceGraphProps> = ({ graphData, onSelectNode }) => {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  const { nodes, edges } = graphData;

  // Simple auto-layout calculation: group nodes by column/layer
  // Layer 0: Application
  // Layer 1: Documents
  // Layer 2: Claims (Fields)
  // Layer 3: Findings / Rules
  const appNodes = nodes.filter((n) => n.type === 'application');
  const docNodes = nodes.filter((n) => n.type === 'document');
  const claimNodes = nodes.filter((n) => n.type === 'claim');
  const findingNodes = nodes.filter((n) => n.type === 'finding');

  const width = 860;
  const height = 480;

  // Position mapping
  const positions: Record<string, { x: number; y: number }> = {};

  // Root App Node at (100, height / 2)
  appNodes.forEach((node, i) => {
    positions[node.id] = { x: 90, y: height / 2 + (i - (appNodes.length - 1) / 2) * 80 };
  });

  // Doc nodes at x = 300
  docNodes.forEach((node, i) => {
    const spacing = height / (docNodes.length + 1);
    positions[node.id] = { x: 300, y: (i + 1) * spacing };
  });

  // Claim nodes at x = 540
  claimNodes.forEach((node, i) => {
    const spacing = height / (claimNodes.length + 1 || 1);
    positions[node.id] = { x: 530, y: (i + 1) * spacing };
  });

  // Finding nodes at x = 740
  findingNodes.forEach((node, i) => {
    const spacing = height / (findingNodes.length + 1 || 1);
    positions[node.id] = { x: 740, y: (i + 1) * spacing };
  });

  const getNodeColor = (node: GraphNode) => {
    switch (node.type) {
      case 'application':
        return { bg: '#1e3a8a', border: '#3b82f6', text: '#ffffff' };
      case 'document':
        return { bg: '#0f766e', border: '#14b8a6', text: '#ffffff' };
      case 'claim':
        return { bg: '#4338ca', border: '#6366f1', text: '#ffffff' };
      case 'finding':
        if (node.severity === 'high') return { bg: '#991b1b', border: '#ef4444', text: '#ffffff' };
        if (node.severity === 'medium') return { bg: '#b45309', border: '#f59e0b', text: '#ffffff' };
        return { bg: '#1e293b', border: '#64748b', text: '#ffffff' };
      default:
        return { bg: '#334155', border: '#94a3b8', text: '#ffffff' };
    }
  };

  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node);
    onSelectNode?.(node);
  };

  return (
    <div className="relative bg-slate-900 rounded-xl border border-slate-800 p-4 shadow-lg overflow-hidden">
      {/* Legend Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800 text-xs">
        <span className="font-semibold text-slate-300">Claim–Evidence Relational Graph</span>
        <div className="flex items-center space-x-4">
          <span className="flex items-center space-x-1.5 text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-700"></span>
            <span>Application</span>
          </span>
          <span className="flex items-center space-x-1.5 text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-700"></span>
            <span>Document</span>
          </span>
          <span className="flex items-center space-x-1.5 text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-700"></span>
            <span>Claim/Field</span>
          </span>
          <span className="flex items-center space-x-1.5 text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-700"></span>
            <span>Finding</span>
          </span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="overflow-x-auto py-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[440px] select-none">
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="18"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
            </marker>
            <marker
              id="arrow-alert"
              viewBox="0 0 10 10"
              refX="18"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
            </marker>
          </defs>

          {/* Render Edges */}
          {edges.map((edge, idx) => {
            const p1 = positions[edge.source];
            const p2 = positions[edge.target];
            if (!p1 || !p2) return null;

            const isContradiction = edge.relationship === 'contradicts' || edge.relationship === 'violates';
            const strokeColor = isContradiction ? '#ef4444' : '#475569';
            const marker = isContradiction ? 'url(#arrow-alert)' : 'url(#arrow)';

            // Cubic bezier curve for nice connector
            const dx = p2.x - p1.x;
            const pathD = `M ${p1.x} ${p1.y} C ${p1.x + dx * 0.4} ${p1.y}, ${p2.x - dx * 0.4} ${p2.y}, ${p2.x} ${p2.y}`;

            return (
              <g key={`edge-${idx}`}>
                <path
                  d={pathD}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={isContradiction ? 2 : 1.2}
                  strokeDasharray={isContradiction ? '4 3' : undefined}
                  markerEnd={marker}
                />
              </g>
            );
          })}

          {/* Render Nodes */}
          {nodes.map((node) => {
            const pos = positions[node.id];
            if (!pos) return null;
            const { bg, border, text } = getNodeColor(node);
            const isSelected = selectedNode?.id === node.id;

            return (
              <g
                key={node.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                onClick={() => handleNodeClick(node)}
                className="cursor-pointer transition-transform hover:scale-110"
              >
                <circle
                  r={isSelected ? 26 : 22}
                  fill={bg}
                  stroke={isSelected ? '#ffffff' : border}
                  strokeWidth={isSelected ? 3 : 2}
                  className="transition-all"
                />
                <text
                  textAnchor="middle"
                  dy="4"
                  fill={text}
                  fontSize="9"
                  fontWeight="bold"
                  pointerEvents="none"
                >
                  {node.type.slice(0, 3).toUpperCase()}
                </text>
                <text
                  textAnchor="middle"
                  dy="38"
                  fill="#cbd5e1"
                  fontSize="9.5"
                  className="font-medium"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                >
                  {node.label.length > 22 ? `${node.label.slice(0, 20)}…` : node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected Node Details Drawer */}
      {selectedNode && (
        <div className="mt-3 p-3 bg-slate-800/90 rounded-lg border border-slate-700 text-xs flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-100">{selectedNode.label}</span>
              <span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-[10px] uppercase font-semibold">
                {selectedNode.type}
              </span>
            </div>
            {selectedNode.details && (
              <div className="mt-1.5 text-slate-400 space-y-0.5 font-mono text-[11px]">
                {Object.entries(selectedNode.details).map(([k, v]) => (
                  <div key={k}>
                    <span className="text-slate-500">{k}:</span> {String(v)}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => setSelectedNode(null)}
            className="text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-700/60 text-[10px]"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};
