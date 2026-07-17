import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import Badge from '../components/Badge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { Briefcase, Plus, Trash2, Users } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const EMPTY = { site_id: '', start: '', end: '', role: 'Security Guard', pay_rate: '', slots: 1, notes: '' };

export default function OpenShifts() {
  const [shifts, setShifts] = useState([]);
  const [sites, setSites] = useState([]);
  const [guards, setGuards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const [sd, sid, gd] = await Promise.all([api.openShifts(), api.sites(), api.guards()]);
    setShifts(sd.open_shifts || []);
    setSites(sid.sites || []);
    setGuards(gd.guards || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function handleSave(e) {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await api.createOpenShift({ ...form, pay_rate: form.pay_rate ? Number(form.pay_rate) : undefined, slots: Number(form.slots) });
      setModal(false); await load();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm('Remove this open shift?')) return;
    try { await api.deleteOpenShift(id); await load(); } catch (err) { alert(err.message); }
  }

  const siteMap = Object.fromEntries(sites.map(s => [s.id, s]));
  const guardMap = Object.fromEntries(guards.map(g => [g.id, g]));
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div>
      <PageHeader title="Open Shifts" subtitle="Marketplace for available shifts"
        action={<button className="btn-primary flex items-center gap-2" onClick={() => { setForm(EMPTY); setError(''); setModal(true); }}><Plus size={16} /> Post Shift</button>} />

      {loading ? <div className="text-slate-400 text-sm">Loading…</div> : (
        !shifts.length ? <EmptyState icon={Briefcase} title="No open shifts posted" subtitle="Post a shift for guards to claim" /> : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {shifts.map(s => (
              <div key={s.id} className="card space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-white">{siteMap[s.site_id]?.name || 'Unknown site'}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{s.role}</p>
                  </div>
                  <button onClick={() => handleDelete(s.id)} className="text-slate-400 hover:text-red-400 p-1 transition-colors"><Trash2 size={15} /></button>
                </div>
                <div className="text-sm space-y-1 text-slate-400">
                  <p>{s.start ? format(parseISO(s.start), 'MMM d, HH:mm') : '—'} → {s.end ? format(parseISO(s.end), 'HH:mm') : '—'}</p>
                  {s.pay_rate && <p className="text-brand-400 font-medium">${s.pay_rate}/hr</p>}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Users size={14} className="text-slate-400" />
                  <span className="text-slate-400">{s.claimed_by?.length || 0} / {s.slots || 1} claimed</span>
                </div>
                {s.claimed_by?.length > 0 && (
                  <div className="space-y-1">
                    {s.claimed_by.map(uid => (
                      <div key={uid} className="text-xs bg-green-500/10 text-green-400 rounded px-2 py-1">{guardMap[uid]?.full_name || uid}</div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {modal && (
        <Modal title="Post Open Shift" onClose={() => setModal(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            {error && <p className="text-red-400 text-sm bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Site</label>
                <select className="input" value={form.site_id} onChange={f('site_id')} required>
                  <option value="">— Select site —</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div><label className="label">Start</label><input type="datetime-local" className="input" value={form.start} onChange={f('start')} required /></div>
              <div><label className="label">End</label><input type="datetime-local" className="input" value={form.end} onChange={f('end')} required /></div>
              <div><label className="label">Role</label><input className="input" value={form.role} onChange={f('role')} /></div>
              <div><label className="label">Pay Rate ($/hr)</label><input type="number" step="0.01" className="input" value={form.pay_rate} onChange={f('pay_rate')} /></div>
              <div><label className="label">Slots</label><input type="number" min={1} className="input" value={form.slots} onChange={f('slots')} /></div>
              <div className="col-span-2"><label className="label">Notes</label><textarea className="input resize-none" rows={2} value={form.notes} onChange={f('notes')} /></div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Posting…' : 'Post Shift'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
