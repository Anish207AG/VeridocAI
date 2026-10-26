import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { AuditEvent, AuditVerificationResult } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import {
  ShieldCheck,
  ShieldAlert,
  History,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Lock,
  Info
} from 'lucide-react';

export const AuditTrailPage: React.FC = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedEventType, setSelectedEventType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Verification State
  const [verifying, setVerifying] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<AuditVerificationResult | null>(null);
  const [showVerifyModal, setShowVerifyModal] = useState<boolean>(false);

  const fetchAuditEvents = async () => {
    try {
      setLoading(true);
      const data = await api.getAuditEvents(selectedEventType === 'all' ? undefined : selectedEventType);
      setEvents(data);
    } catch (err) {
      console.error('Failed to load audit events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditEvents();
  }, [selectedEventType]);

  const handleVerifyChain = async () => {
    try {
      setVerifying(true);
      const result = await api.verifyAuditChain();
      setVerificationResult(result);
      setShowVerifyModal(true);
    } catch (err: any) {
      alert(`Verification check failed: ${err.message}`);
    } finally {
      setVerifying(false);
    }
  };

  const filteredEvents = events.filter((e) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      e.event_type.toLowerCase().includes(term) ||
      e.actor.toLowerCase().includes(term) ||
      e.details_json.toLowerCase().includes(term) ||
      e.current_hash.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Immutable Audit Ledger</h1>
          <p className="text-sm text-slate-500 mt-1">
            Cryptographically linked SHA-256 hash-chain recording all uploads, extractions, manual overrides, and rulings.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchAuditEvents}
            className="p-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleVerifyChain}
            disabled={verifying}
            className="flex items-center space-x-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{verifying ? 'Verifying Hashes...' : 'Verify Cryptographic Chain Integrity'}</span>
          </button>
        </div>
      </div>

      {/* Explanatory Callout Banner */}
      <div className="bg-slate-900 text-slate-200 rounded-xl p-5 border border-slate-800 shadow-md">
        <div className="flex items-start space-x-3">
          <Lock className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <h4 className="font-bold text-white text-sm">How Cryptographic Hash-Chain Verification Works</h4>
            <p className="text-slate-300 leading-relaxed">
              Every audit record computes a SHA-256 hash using the previous block's hash, sequence number, ISO timestamp, event payload, and reviewer identity:
              <code className="text-blue-300 bg-slate-800 px-2 py-0.5 rounded font-mono text-[10px] mx-1">
                Hash<sub>N</sub> = SHA256(Hash<sub>N-1</sub> || Seq || Time || Event || Actor || Data)
              </code>
            </p>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              <strong>Local Security Note:</strong> Any unauthorized row modification, deletion, or back-dating alters the computed hash and breaks the cryptographic link for all subsequent blocks, immediately triggering a tampering alert during chain verification.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search audit trail by actor, event type, or details..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <select
            value={selectedEventType}
            onChange={(e) => setSelectedEventType(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white"
          >
            <option value="all">All Event Types</option>
            <option value="application_created">application_created</option>
            <option value="document_uploaded">document_uploaded</option>
            <option value="ocr_extracted">ocr_extracted</option>
            <option value="field_corrected">field_corrected</option>
            <option value="rule_executed">rule_executed</option>
            <option value="finding_resolved">finding_resolved</option>
            <option value="report_generated">report_generated</option>
            <option value="demo_scenario_loaded">demo_scenario_loaded</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 font-sans">
              <tr>
                <th className="px-5 py-3">Seq #</th>
                <th className="px-5 py-3">Timestamp (UTC)</th>
                <th className="px-5 py-3">Event Type</th>
                <th className="px-5 py-3">Actor</th>
                <th className="px-5 py-3">Payload Details</th>
                <th className="px-5 py-3">Block SHA-256 Digest</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400 font-sans">
                    Loading audit blocks...
                  </td>
                </tr>
              ) : filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400 font-sans">
                    No audit records found.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-3 font-bold text-blue-700">#{evt.sequence_number}</td>
                    <td className="px-5 py-3 text-slate-500 text-[11px]">
                      {new Date(evt.timestamp).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 font-sans font-semibold text-slate-900">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] text-slate-800">
                        {evt.event_type}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-sans font-medium text-slate-700">{evt.actor}</td>
                    <td className="px-5 py-3 max-w-sm truncate text-[11px] text-slate-500" title={evt.details_json}>
                      {evt.details_json}
                    </td>
                    <td className="px-5 py-3 text-[10px] text-slate-400" title={`Current: ${evt.current_hash}\nPrev: ${evt.prev_hash}`}>
                      {evt.current_hash.slice(0, 16)}...
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Verification Result Modal */}
      <Modal
        isOpen={showVerifyModal}
        onClose={() => setShowVerifyModal(false)}
        title="Cryptographic Hash Chain Integrity Verification"
      >
        <div className="space-y-4 text-xs">
          {verificationResult?.is_valid ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
              <div className="flex items-center space-x-2 text-emerald-800 font-bold text-sm">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>Hash Chain Fully Verified — Zero Tampering</span>
              </div>
              <p className="text-emerald-700 leading-relaxed">
                All <strong>{verificationResult.total_events} audit blocks</strong> were individually recalculated and mathematically verified. The hash linkage from block #{verificationResult.first_verified_sequence ?? 1} to block #{verificationResult.last_verified_sequence ?? 1} is intact and unbroken.
              </p>
            </div>
          ) : (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
              <div className="flex items-center space-x-2 text-rose-800 font-bold text-sm">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <span>Cryptographic Discontinuity Detected!</span>
              </div>
              <p className="text-rose-700 leading-relaxed">
                Tampering or missing record identified at sequence block <strong>#{verificationResult?.tampered_sequence}</strong>. {verificationResult?.details}
              </p>
            </div>
          )}

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-mono text-[11px] text-slate-600 space-y-1">
            <div>Verified At: {verificationResult?.checked_at}</div>
            <div>Total Blocks Inspected: {verificationResult?.total_events}</div>
            <div>Integrity Status: {verificationResult?.is_valid ? 'VALID_UNBROKEN' : 'CORRUPTED_CHAIN'}</div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
            <button
              onClick={() => setShowVerifyModal(false)}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-900"
            >
              Close Diagnostics
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
