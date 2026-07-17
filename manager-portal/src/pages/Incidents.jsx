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
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === s ? 'bg-gray-900 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {s ? s.replace(/_/g, ' ').charAt(0).toUpperCase() + s.replace(/_/g, ' ').slice(1) : 'All'}
          </button>
        ))}
      </div>

      {loading ? <div className="text-gray-400 text-sm">Loading…</div> : (
        !incidents.length ? <EmptyState icon={FileText} title="No incidents found" /> : (
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>{['Guard', 'Type', 'Title', 'Reported', 'Status', ''].map(h => <th key={h} className="table-head">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {incidents.map(inc => (
                    <tr key={inc.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="table-cell">
                        <p className="text-gray-900 text-sm font-medium">{guardMap[inc.user_id]?.full_name || '—'}</p>
                      </td>
                      <td className="table-cell text-xs text-gray-500 capitalize">{inc.type?.replace(/_/g, ' ')}</td>
                      <td className="table-cell text-sm font-medium text-gray-700">{inc.title || '—'}</td>
                      <td className="table-cell text-xs text-gray-500">{inc.created_at ? format(parseISO(inc.created_at), 'MMM d, HH:mm') : '—'}</td>
                      <td className="table-cell"><Badge status={inc.status} /></td>
                      <td className="table-cell text-right">
                        <button onClick={() => openView(inc)} className="text-gray-400 hover:text-gray-900 p-1.5 rounded transition-colors"><Eye size={16} /></button>
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
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                <p className="text-gray-500 text-xs mb-1 uppercase tracking-wider font-semibold">Guard</p>
                <p className="text-gray-900 font-bold">{guardMap[viewModal.user_id]?.full_name || viewModal.user_id}</p>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                <p className="text-gray-500 text-xs mb-1 uppercase tracking-wider font-semibold">Type</p>
                <p className="text-gray-900 font-bold capitalize">{viewModal.type?.replace(/_/g, ' ')}</p>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                <p className="text-gray-500 text-xs mb-1 uppercase tracking-wider font-semibold">Reported</p>
                <p className="text-gray-900 font-medium">{viewModal.created_at ? format(parseISO(viewModal.created_at), 'MMM d yyyy, HH:mm') : '—'}</p>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                <p className="text-gray-500 text-xs mb-1 uppercase tracking-wider font-semibold">Current Status</p>
                <div className="mt-1"><Badge status={viewModal.status} /></div>
              </div>
            </div>

            {viewModal.title && (
              <div>
                <p className="text-gray-500 text-xs mb-1 uppercase tracking-wider font-semibold">Title</p>
                <p className="text-gray-900 font-bold text-lg">{viewModal.title}</p>
              </div>
            )}

            {viewModal.description && (
              <div>
                <p className="text-gray-500 text-xs mb-2 uppercase tracking-wider font-semibold">Description</p>
                <p className="text-gray-700 text-sm leading-relaxed bg-gray-50 border border-gray-100 rounded-xl p-4 whitespace-pre-wrap">{viewModal.description}</p>
              </div>
            )}

            {viewModal.location_description && (
              <div>
                <p className="text-gray-500 text-xs mb-1 uppercase tracking-wider font-semibold">Location Details</p>
                <p className="text-gray-700 text-sm font-medium">{viewModal.location_description}</p>
              </div>
            )}

            {viewModal.timeline && viewModal.timeline.length > 0 && (
              <div>
                <p className="text-gray-500 text-xs mb-3 uppercase tracking-wider font-semibold">Timeline</p>
                <div className="space-y-3">
                  {viewModal.timeline.map((t, i) => (
                    <div key={i} className="flex gap-4 text-sm relative">
                      {i !== viewModal.timeline.length - 1 && <div className="absolute left-[3.5px] top-5 bottom-[-12px] w-px bg-gray-200" />}
                      <div className="w-2 h-2 rounded-full bg-gray-400 flex-shrink-0 mt-1.5 relative z-10" />
                      <div className="flex-1">
                        <span className="text-gray-400 text-xs font-mono mb-0.5 block">{t.ts ? format(parseISO(t.ts), 'HH:mm') : ''}</span>
                        <p className="text-gray-900 font-medium">{t.note || t.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-gray-200 pt-6 mt-6">
              <label className="label mb-2">Update Incident Status</label>
              <div className="flex gap-3">
                <select className="input flex-1" value={statusUpdate} onChange={e => setStatusUpdate(e.target.value)}>
                  {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ').charAt(0).toUpperCase() + s.replace(/_/g, ' ').slice(1)}</option>)}
                </select>
                <button onClick={handleStatusUpdate} disabled={saving} className="btn-primary min-w-[120px]">
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
