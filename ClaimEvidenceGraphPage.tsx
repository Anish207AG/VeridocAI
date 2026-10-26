import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { Application, GraphData, GraphNode } from '../types';
import { EvidenceGraph } from '../components/graph/EvidenceGraph';
import { GitBranch, Filter, RefreshCw } from 'lucide-react';

export const ClaimEvidenceGraphPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const appIdParam = searchParams.get('app_id') || '';

  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string>(appIdParam);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeNode, setActiveNode] = useState<GraphNode | null>(null);

  useEffect(() => {
    api.getApplications({}).then((apps) => {
      setApplications(apps);
      if (!selectedAppId && apps.length > 0) {
        setSelectedAppId(apps[0].id);
      }
    });
  }, []);

  const fetchGraph = async () => {
    if (!selectedAppId) return;
    try {
      setLoading(true);
      const data = await api.getGraph(selectedAppId);
      setGraphData(data);
    } catch (err) {
      console.error('Failed to load graph:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, [selectedAppId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Claim–Evidence Relational Graph</h1>
          <p className="text-sm text-slate-500 mt-1">
            NetworkX-generated directed graph illustrating dependency chains from filings to supporting evidence.
          </p>
        </div>
        <button
          onClick={fetchGraph}
          className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Graph</span>
        </button>
      </div>

      {/* Filter / Selector */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-700">Select Filing:</span>
          <select
            value={selectedAppId}
            onChange={(e) => setSelectedAppId(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white"
          >
            {applications.map((a) => (
              <option key={a.id} value={a.id}>
                {a.application_number} — {a.institution_name}
              </option>
            ))}
          </select>
        </div>

        {graphData && (
          <div className="text-xs text-slate-400 font-mono">
            {graphData.nodes.length} Nodes &bull; {graphData.edges.length} Relational Links
          </div>
        )}
      </div>

      {/* Graph Component */}
      {loading ? (
        <div className="p-16 text-center text-slate-400">Loading NetworkX Graph Nodes...</div>
      ) : graphData ? (
        <EvidenceGraph graphData={graphData} onSelectNode={(node) => setActiveNode(node)} />
      ) : (
        <div className="p-16 text-center text-slate-400">No graph data available.</div>
      )}
    </div>
  );
};
