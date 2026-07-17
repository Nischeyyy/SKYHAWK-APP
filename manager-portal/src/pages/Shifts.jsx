import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import Badge from '../components/Badge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { Calendar, Plus, Trash2, Edit2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const EMPTY = { user_id: '', site_id: '', start: '', end: '', role: 'Security Guard', status: 'scheduled', notes: '' };

export default function Shifts() {
  const [shifts, setShifts] = useState([]);
  const [guards, setGuards] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const [sd, gd, sid] = await Promise.all([api.shifts(), api.guards(), api.sites()]);
    setShifts(sd.shifts || []);
    setGuards(gd.guards || []);
    setSites(sid.sites || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openCreate() { setForm(EMPTY); setEditing(null); setError(''); setModal(true); }
  function openEdit(s) {
    setForm({ user_id: s.user_id || '', site_id: s.site_id || '', start: s.start ? s.start.slice(0,16) : '', end: s.end ? s.end.slice(0,16) : '', role: s.role || 'Security Guard', status: s.status || 'scheduled', notes: s.notes || '' });
    setEditing(s); setError(''); setModal(true);
  }

  async function handleSave(e) {
    e.preventDefault(); setSaving(true); setError('');
    try {
      editing ? await api.updateShift(editing.id, form) : await api.createShift(form);
      setModal(false); await load();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  }

  async function handleDelete(s) {
    if (!confirm('Delete this shift?')) return;
    try { await api.deleteShift(s.id); await load(); } catch (err) { alert(err.message); }
  }

  const guardMap = Object.fromEntries(guards.map(g => [g.id, g]));
  const siteMap  = Object.fromEntries(sites.map(s => [s.id, s]));
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div>
      <PageHeader title="Shifts" subtitle={`${shifts.length} scheduled`}
        action={<button className="btn-primary flex items-center gap-2" onClick={openCreate}><Plus size={16} /> New Shift</button>} />

      {loading ? <div className="text-slate-400 text-sm">Loading…</div> : (
        !shifts.length ? <EmptyState icon={Calendar} title="No shifts scheduled" /> : (
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-700/50 border-b border-surface-700">
                  <tr>{['Guard', 'Site', 'Start', 'End', 'Role', 'Status', ''].map(h => <th key={h} className="table-head">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-surface-700">
                  {shifts.map(s => (
                    <tr key={s.id} className="hover:bg-surface-700/30 transition-colors">
                      <td className="table-cell">
                        <p className="text-white text-sm font-medium">{guardMap[s.user_id]?.full_name || s.user_id?.slice(0,8) || '—'}</p>
                        <p className="text-slate-500 text-xs">{guardMap[s.user_id]?.email}</p>
                      </td>
                      <td className="table-cell text-sm">{siteMap[s.site_id]?.name || '—'}</td>
                      <td className="table-cell text-xs">{s.start ? format(parseISO(s.start), 'MMM d, HH:mm') : '—'}</td>
                      <td className="table-cell text-xs">{s.end ? format(parseISO(s.end), 'MMM d, HH:mm') : '—'}</td>
                      <td className="table-cell text-xs text-slate-400">{s.role}</td>
                      <td className="table-cell"><Badge status={s.status} /></td>
                      <td className="table-cell">
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(s)} className="text-slate-400 hover:text-white p-1 transition-colors"><Edit2 size={14} /></button>
                          <button onClick={() => handleDelete(s)} className="text-slate-400 hover:text-red-400 p-1 transition-colors"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {modal && (
        <Modal title={editing ? 'Edit Shift' : 'New Shift'} onClose={() => setModal(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            {error && <p className="text-red-400 text-sm bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Guard</label>
                <select className="input" value={form.user_id} onChange={f('user_id')} required>
                  <option value="">— Select guard —</option>
                  {guards.map(g => <option key={g.id} value={g.id}>{g.full_name}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="label">Site</label>
                <select className="input" value={form.site_id} onChange={f('site_id')}>
                  <option value="">— Select site —</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div><label className="label">Start</label><input type="datetime-local" className="input" value={form.start} onChange={f('start')} required /></div>
              <div><label className="label">End</label><input type="datetime-local" className="input" value={form.end} onChange={f('end')} required /></div>
              <div><label className="label">Role / Position</label><input className="input" value={form.role} onChange={f('role')} /></div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={form.status} onChange={f('status')}>
                  {['scheduled','active','completed','cancelled'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="col-span-2"><label className="label">Notes</label><textarea className="input resize-none" rows={2} value={form.notes} onChange={f('notes')} /></div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
