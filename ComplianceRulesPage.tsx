import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { ComplianceRule } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Scale, Plus, ToggleLeft, ToggleRight, Edit, BookOpen, AlertCircle, CheckCircle2 } from 'lucide-react';

export const ComplianceRulesPage: React.FC = () => {
  const [rules, setRules] = useState<ComplianceRule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // New Rule Modal
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newRuleData, setNewRuleData] = useState({
    rule_code: 'CR-CUSTOM-008',
    name: '',
    description: '',
    category: 'cross_document_consistency',
    severity: 'medium' as 'high' | 'medium' | 'low' | 'info',
    citation_reference: '',
    parameters_json: '{}',
    is_enabled: true,
  });

  const fetchRules = async () => {
    try {
      setLoading(true);
      const data = await api.getRules();
      setRules(data);
    } catch (err) {
      console.error('Failed to load rules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleToggle = async (rule: ComplianceRule) => {
    try {
      await api.toggleRule(rule.id);
      setStatusMsg(`Rule ${rule.rule_code} ${rule.is_enabled ? 'disabled' : 'enabled'}.`);
      await fetchRules();
    } catch (err: any) {
      alert(`Toggle failed: ${err.message}`);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createRule(newRuleData);
      setShowCreateModal(false);
      setStatusMsg(`New rule ${newRuleData.rule_code} registered successfully.`);
      await fetchRules();
    } catch (err: any) {
      alert(`Failed to create rule: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Compliance Rules Engine</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configurable regulatory criteria, cross-document constraints, expiry rules, and statutory citations.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Verification Rule</span>
        </button>
      </div>

      {statusMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{statusMsg}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="text-emerald-700 text-[10px] font-bold">Dismiss</button>
        </div>
      )}

      {/* Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 p-12 text-center text-slate-400">Loading compliance rules...</div>
        ) : rules.length === 0 ? (
          <div className="col-span-2 p-12 text-center text-slate-400">No compliance rules found.</div>
        ) : (
          rules.map((rule) => (
            <div
              key={rule.id}
              className={`p-5 rounded-xl border transition-all bg-white shadow-xs flex flex-col justify-between ${
                rule.is_enabled ? 'border-slate-200' : 'border-slate-200 bg-slate-50/60 opacity-60'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {rule.rule_code}
                    </span>
                    <Badge
                      variant={
                        rule.severity === 'high'
                          ? 'danger'
                          : rule.severity === 'medium'
                          ? 'warning'
                          : 'info'
                      }
                      size="sm"
                    >
                      {rule.severity.toUpperCase()}
                    </Badge>
                  </div>
                  <button
                    onClick={() => handleToggle(rule)}
                    className="text-slate-500 hover:text-slate-800 p-1"
                    title={rule.is_enabled ? 'Disable Rule' : 'Enable Rule'}
                  >
                    {rule.is_enabled ? (
                      <ToggleRight className="w-7 h-7 text-emerald-600" />
                    ) : (
                      <ToggleLeft className="w-7 h-7 text-slate-400" />
                    )}
                  </button>
                </div>

                <h3 className="text-sm font-bold text-slate-900">{rule.name}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{rule.description}</p>

                {rule.citation_reference && (
                  <div className="flex items-start space-x-1.5 p-2 bg-slate-50 rounded text-[11px] text-slate-500 border border-slate-100">
                    <BookOpen className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                    <span><strong>Citation:</strong> {rule.citation_reference}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-mono">Category: {rule.category}</span>
                <span className={rule.is_enabled ? 'text-emerald-600 font-semibold' : 'text-slate-400 font-medium'}>
                  {rule.is_enabled ? 'Active Engine Rule' : 'Disabled'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Rule Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Register New Compliance Verification Rule"
      >
        <form onSubmit={handleCreateRule} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Rule Identifier Code *</label>
              <input
                type="text"
                required
                value={newRuleData.rule_code}
                onChange={(e) => setNewRuleData({ ...newRuleData, rule_code: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Severity *</label>
              <select
                value={newRuleData.severity}
                onChange={(e) => setNewRuleData({ ...newRuleData, severity: e.target.value as any })}
                className="w-full p-2 border border-slate-200 rounded-lg bg-white"
              >
                <option value="high">High Severity</option>
                <option value="medium">Medium Severity</option>
                <option value="low">Low Severity</option>
                <option value="info">Informational</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Rule Name *</label>
            <input
              type="text"
              required
              placeholder="e.g., Mandatory Land Ownership Clearance"
              value={newRuleData.name}
              onChange={(e) => setNewRuleData({ ...newRuleData, name: e.target.value })}
              className="w-full p-2 border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Rule Description *</label>
            <textarea
              rows={2}
              required
              placeholder="What discrepancy or statutory violation does this rule detect?"
              value={newRuleData.description}
              onChange={(e) => setNewRuleData({ ...newRuleData, description: e.target.value })}
              className="w-full p-2 border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Regulatory Citation / Reference</label>
            <input
              type="text"
              placeholder="e.g., Illustrative Standard Guidelines Sec. 7(c)"
              value={newRuleData.citation_reference}
              onChange={(e) => setNewRuleData({ ...newRuleData, citation_reference: e.target.value })}
              className="w-full p-2 border border-slate-200 rounded-lg"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            >
              Save &amp; Activate Rule
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
