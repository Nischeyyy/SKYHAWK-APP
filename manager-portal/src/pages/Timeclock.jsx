import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import PageHeader from '../components/PageHeader.jsx';
import Badge from '../components/Badge.jsx';
import Modal from '../components/Modal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { Clock, Edit2, Search } from 'lucide-react';
import { format, parseISO, differenceInMinutes } from 'date-fns';

export default function Timeclock() {
  const [entries, setEntries] = useState([]);
  const [guards, setGuards] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editModal, setEditModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  async function load() {
    const [td, gd, sid] = await Promise.all([api.timeclock(), api.guards(), api.sites()]);
    setEntries(td.entries || []);
    setGuards(gd.guards || []);
    setSites(sid.sites || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openEdit(entry) {
    setForm({
      clock_in: entry.clock_in ? entry.clock_in.slice(0, 16) : '',
      clock_out: entry.clock_out ? entry.clock_out.slice(0, 16) : '',
      notes: entry.notes || '',
    });
    setEditModal(entry);
  }

  async function handleSave(e) {
    e.preventDefault(); setSaving(true);
    try {
      await api.updateTimeclock(editModal.id, form);
      setEditModal(null); await load();
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  }

  function duration(entry) {
    if (!entry.clock_in) return '—';
    const out = entry.clock_out ? parseISO(entry.clock_out) : new Date();
    const mins = differenceInMinutes(out, parseISO(entry.clock_in));
    const h = Math.floor(mins / 60); const m = mins % 60;
    return `${h}h ${m}m`;
  }

  const guardMap = Object.fromEntries(guards.map(g => [g.id, g]));
  const siteMap = Object.fromEntries(sites.map(s => [s.id, s]));

  const filtered = entries.filter(e => {
    const g = guardMap[e.user_id];
    return !search || `${g?.full_name} ${g?.email}`.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div>
      <PageHeader title="Timeclock" subtitle="Review and correct time entries" />

      <div className="relative mb-5">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-9" placeholder="Search by guard name…" />
      </div>

      {loading ? <div className="text-slate-400 text-sm">Loading…</div> : (
        !filtered.length ? <EmptyState icon={Clock} title="No timeclock entries" /> : (
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-700/50 border-b border-surface-700">
                  <tr>{['Guard', 'Site', 'Clock In', 'Clock Out', 'Duration', 'Status', ''].map(h => <th key={h} className="table-head">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-surface-700">
                  {filtered.map(e => (
                    <tr key={e.id} className={`hover:bg-surface-700/30 transition-colors ${!e.clock_out ? 'bg-green-500/5' : ''}`}>
                      <td className="table-cell">
                        <p className="text-white text-sm font-medium">{guardMap[e.user_id]?.full_name || '—'}</p>
                        {e.manually_adjusted && <span className="text-xs text-orange-400">Adjusted</span>}
                      </td>
                      <td className="table-cell text-sm text-slate-400">{siteMap[e.site_id]?.name || '—'}</td>
                      <td className="table-cell text-xs">{e.clock_in ? format(parseISO(e.clock_in), 'MMM d, HH:mm') : '—'}</td>
                      <td className="table-cell text-xs">{e.clock_out ? format(parseISO(e.clock_out), 'MMM d, HH:mm') : <span className="text-green-400 font-medium">Active</span>}</td>
                      <td className="table-cell text-xs font-mono">{duration(e)}</td>
                      <td className="table-cell"><Badge status={e.clock_out ? 'clocked_out' : 'clocked_in'} /></td>
                      <td className="table-cell">
                        <button onClick={() => openEdit(e)} className="text-slate-400 hover:text-white p-1 transition-colors"><Edit2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {editModal && (
        <Modal title="Edit Time Entry" onClose={() => setEditModal(null)}>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="bg-surface-700/50 rounded-lg p-3 text-sm text-slate-300">
              Guard: <span className="text-white font-medium">{guardMap[editModal.user_id]?.full_name}</span>
            </div>
            <div>
              <label className="label">Clock In</label>
              <input type="datetime-local" className="input" value={form.clock_in} onChange={e => setForm(f => ({...f, clock_in: e.target.value}))} />
            </div>
            <div>
              <label className="label">Clock Out</label>
              <input type="datetime-local" className="input" value={form.clock_out} onChange={e => setForm(f => ({...f, clock_out: e.target.value}))} />
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea className="input resize-none" rows={2} value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setEditModal(null)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
