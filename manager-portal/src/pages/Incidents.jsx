import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import PageHeader from '../components/PageHeader.jsx';
import Badge from '../components/Badge.jsx';
import Modal from '../components/Modal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { FileText, Eye } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const STATUSES = ['submitted', 'under_review', 'resolved', 'closed'];

export default function Incidents() {
  const [incidents, setIncidents] = useState([]);
  const [guards, setGuards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [viewModal, setViewModal] = useState(null);
  const [statusUpdate, setStatusUpdate] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    const [id, gd] = await Promise.all([api.incidents(filter ? `?status=${filter}` : ''), api.guards()]);
    setIncidents(id.incidents || []);
    setGuards(gd.guards || []);
    setLoading(false);
  }
  useEffect(() => { setLoading(true); load(); }, [filter]);

  function openView(inc) {
    setStatusUpdate(inc.status || 'submitted');
    setViewModal(inc);
  }

  async function handleStatusUpdate() {
    setSaving(true);
    try {
      await api.updateIncident(viewModal.id, { status: statusUpdate });
      setViewModal(null);
      await load();
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  }

  const guardMap = Object.fromEntries(guards.map(g => [g.id, g]));

  return (
    <div>
      <PageHeader title="Incidents" subtitle="Review and manage incident reports" />

      <div className="flex gap-2 mb-5 flex-wrap">
        {['', ...STATUSES].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === s ? 'bg-brand-500 text-black' : 'bg-surface-700 text-slate-300 hover:text-white'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? <div className="text-slate-400 text-sm">Loading…</div> : (
        !incidents.length ? <EmptyState icon={FileText} title="No incidents found" /> : (
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-700/50 border-b border-surface-700">
                  <tr>{['Guard', 'Type', 'Title', 'Reported', 'Status', ''].map(h => <th key={h} className="table-head">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-surface-700">
                  {incidents.map(inc => (
                    <tr key={inc.id} className="hover:bg-surface-700/30 transition-colors">
                      <td className="table-cell">
                        <p className="text-white text-sm font-medium">{guardMap[inc.user_id]?.full_name || '—'}</p>
                      </td>
                      <td className="table-cell text-xs text-slate-400 capitalize">{inc.type?.replace(/_/g, ' ')}</td>
                      <td className="table-cell text-sm">{inc.title || '—'}</td>
                      <td className="table-cell text-xs text-slate-400">{inc.created_at ? format(parseISO(inc.created_at), 'MMM d, HH:mm') : '—'}</td>
                      <td className="table-cell"><Badge status={inc.status} /></td>
                      <td className="table-cell">
                        <button onClick={() => openView(inc)} className="text-slate-400 hover:text-white p-1 transition-colors"><Eye size={15} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {viewModal && (
        <Modal title="Incident Report" onClose={() => setViewModal(null)} size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-surface-700/50 rounded-lg p-3">
                <p className="text-slate-400 text-xs mb-1">Guard</p>
                <p className="text-white font-medium">{guardMap[viewModal.user_id]?.full_name || viewModal.user_id}</p>
              </div>
              <div className="bg-surface-700/50 rounded-lg p-3">
                <p className="text-slate-400 text-xs mb-1">Type</p>
                <p className="text-white font-medium capitalize">{viewModal.type?.replace(/_/g, ' ')}</p>
              </div>
              <div className="bg-surface-700/50 rounded-lg p-3">
                <p className="text-slate-400 text-xs mb-1">Reported</p>
                <p className="text-white">{viewModal.created_at ? format(parseISO(viewModal.created_at), 'MMM d yyyy, HH:mm') : '—'}</p>
              </div>
              <div className="bg-surface-700/50 rounded-lg p-3">
                <p className="text-slate-400 text-xs mb-1">Current Status</p>
                <Badge status={viewModal.status} />
              </div>
            </div>

            {viewModal.title && (
              <div>
                <p className="text-slate-400 text-xs mb-1">Title</p>
                <p className="text-white font-medium">{viewModal.title}</p>
              </div>
            )}

            {viewModal.description && (
              <div>
                <p className="text-slate-400 text-xs mb-1">Description</p>
                <p className="text-slate-300 text-sm leading-relaxed bg-surface-700/50 rounded-lg p-3">{viewModal.description}</p>
              </div>
            )}

            {viewModal.location_description && (
              <div>
                <p className="text-slate-400 text-xs mb-1">Location</p>
                <p className="text-slate-300 text-sm">{viewModal.location_description}</p>
              </div>
            )}

            {viewModal.timeline && viewModal.timeline.length > 0 && (
              <div>
                <p className="text-slate-400 text-xs mb-2">Timeline</p>
                <div className="space-y-2">
                  {viewModal.timeline.map((t, i) => (
                    <div key={i} className="flex gap-3 text-sm">
                      <span className="text-slate-500 text-xs mt-0.5 flex-shrink-0">{t.ts ? format(parseISO(t.ts), 'HH:mm') : ''}</span>
                      <p className="text-slate-300">{t.note || t.status}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-surface-700 pt-4">
              <label className="label">Update Status</label>
              <div className="flex gap-3">
                <select className="input flex-1" value={statusUpdate} onChange={e => setStatusUpdate(e.target.value)}>
                  {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
                <button onClick={handleStatusUpdate} disabled={saving} className="btn-primary">
                  {saving ? 'Saving…' : 'Update'}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
