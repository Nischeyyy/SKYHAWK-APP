import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import PageHeader from '../components/PageHeader.jsx';
import Badge from '../components/Badge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Modal from '../components/Modal.jsx';
import { ArrowLeftRight, Check, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function ShiftSwaps() {
  const [swaps, setSwaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [guards, setGuards] = useState([]);
  const [decisionModal, setDecisionModal] = useState(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    const [sd, gd] = await Promise.all([api.swaps(filter), api.guards()]);
    setSwaps(sd.swaps || []);
    setGuards(gd.guards || []);
    setLoading(false);
  }
  useEffect(() => { setLoading(true); load(); }, [filter]);

  async function decide(action) {
    setSaving(true);
    try {
      await api.swapDecision(decisionModal.id, action, reason);
      setDecisionModal(null);
      setReason('');
      await load();
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  }

  const guardMap = Object.fromEntries(guards.map(g => [g.id, g]));
  const tabs = ['pending', 'approved', 'rejected', ''];

  return (
    <div>
      <PageHeader title="Shift Swaps" subtitle="Review swap requests from guards" />

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {tabs.map(t => (
          <button key={t} onClick={() => setFilter(t)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === t ? 'bg-gray-900 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {t ? t.charAt(0).toUpperCase() + t.slice(1) : 'All'}
          </button>
        ))}
      </div>

      {loading ? <div className="text-gray-400 text-sm">Loading…</div> : (
        !swaps.length ? <EmptyState icon={ArrowLeftRight} title={`No ${filter || ''} swap requests`} /> : (
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>{['Requester', 'Volunteer', 'Shift', 'Requested', 'Status', 'Actions'].map(h => <th key={h} className="table-head">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {swaps.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="table-cell">
                        <p className="text-gray-900 text-sm font-medium">{guardMap[s.requester_id]?.full_name || s.requester_id?.slice(0,8)}</p>
                      </td>
                      <td className="table-cell text-sm text-gray-700">
                        {s.volunteer_id ? guardMap[s.volunteer_id]?.full_name || s.volunteer_id?.slice(0,8) : <span className="text-gray-400 italic">None yet</span>}
                      </td>
                      <td className="table-cell text-xs text-gray-600 font-medium">
                        {s.shift_start ? format(parseISO(s.shift_start), 'MMM d, HH:mm') : '—'}
                      </td>
                      <td className="table-cell text-xs text-gray-500">
                        {s.requested_at ? format(parseISO(s.requested_at), 'MMM d') : '—'}
                      </td>
                      <td className="table-cell"><Badge status={s.status} /></td>
                      <td className="table-cell">
                        {s.status === 'pending' && s.volunteer_id && (
                          <button onClick={() => { setDecisionModal(s); setReason(''); }}
                            className="text-xs bg-gray-900 text-white hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors font-medium">
                            Review
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {decisionModal && (
        <Modal title="Review Swap Request" onClose={() => setDecisionModal(null)}>
          <div className="space-y-4">
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 space-y-3 text-sm">
              <div className="flex justify-between items-center"><span className="text-gray-500 font-medium">Requester</span><span className="text-gray-900 font-bold">{guardMap[decisionModal.requester_id]?.full_name}</span></div>
              <div className="flex justify-between items-center"><span className="text-gray-500 font-medium">Volunteer</span><span className="text-gray-900 font-bold">{guardMap[decisionModal.volunteer_id]?.full_name}</span></div>
              {decisionModal.reason && <div className="flex justify-between items-start pt-2 border-t border-gray-200 mt-2"><span className="text-gray-500 font-medium w-24">Reason</span><span className="text-gray-700 italic text-right flex-1">{decisionModal.reason}</span></div>}
            </div>
            <div>
              <label className="label">Manager note (optional)</label>
              <textarea className="input resize-none" rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="Add a note to be seen by the guards…" />
            </div>
            <div className="flex gap-3 pt-4">
              <button onClick={() => decide('reject')} disabled={saving} className="btn-danger flex-1 flex items-center justify-center gap-2"><X size={16} /> Reject</button>
              <button onClick={() => decide('approve')} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700"><Check size={16} /> Approve</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
