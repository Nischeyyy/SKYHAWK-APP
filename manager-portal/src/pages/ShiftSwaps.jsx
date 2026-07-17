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
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === t ? 'bg-brand-500 text-black' : 'bg-surface-700 text-slate-300 hover:text-white'}`}>
            {t || 'All'}
          </button>
        ))}
      </div>

      {loading ? <div className="text-slate-400 text-sm">Loading…</div> : (
        !swaps.length ? <EmptyState icon={ArrowLeftRight} title={`No ${filter || ''} swap requests`} /> : (
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-700/50 border-b border-surface-700">
                  <tr>{['Requester', 'Volunteer', 'Shift', 'Requested', 'Status', 'Actions'].map(h => <th key={h} className="table-head">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-surface-700">
                  {swaps.map(s => (
                    <tr key={s.id} className="hover:bg-surface-700/30 transition-colors">
                      <td className="table-cell">
                        <p className="text-white text-sm font-medium">{guardMap[s.requester_id]?.full_name || s.requester_id?.slice(0,8)}</p>
                      </td>
                      <td className="table-cell text-sm text-slate-300">
                        {s.volunteer_id ? guardMap[s.volunteer_id]?.full_name || s.volunteer_id?.slice(0,8) : <span className="text-slate-500">None yet</span>}
                      </td>
                      <td className="table-cell text-xs">
                        {s.shift_start ? format(parseISO(s.shift_start), 'MMM d, HH:mm') : '—'}
                      </td>
                      <td className="table-cell text-xs text-slate-400">
                        {s.requested_at ? format(parseISO(s.requested_at), 'MMM d') : '—'}
                      </td>
                      <td className="table-cell"><Badge status={s.status} /></td>
                      <td className="table-cell">
                        {s.status === 'pending' && s.volunteer_id && (
                          <button onClick={() => { setDecisionModal(s); setReason(''); }}
                            className="text-xs bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 px-2 py-1 rounded-lg transition-colors">
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
            <div className="bg-surface-700/50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-400">Requester</span><span className="text-white font-medium">{guardMap[decisionModal.requester_id]?.full_name}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Volunteer</span><span className="text-white font-medium">{guardMap[decisionModal.volunteer_id]?.full_name}</span></div>
              {decisionModal.reason && <div className="flex justify-between"><span className="text-slate-400">Reason</span><span className="text-white">{decisionModal.reason}</span></div>}
            </div>
            <div>
              <label className="label">Manager note (optional)</label>
              <textarea className="input resize-none" rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="Add a note…" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => decide('reject')} disabled={saving} className="btn-danger flex-1 flex items-center justify-center gap-2"><X size={16} /> Reject</button>
              <button onClick={() => decide('approve')} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2"><Check size={16} /> Approve</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
