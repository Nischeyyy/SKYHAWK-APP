import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import PageHeader from '../components/PageHeader.jsx';
import Badge from '../components/Badge.jsx';
import Modal from '../components/Modal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { DollarSign, Plus, Edit2, Calculator } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const EMPTY = { user_id: '', period_start: '', period_end: '', hours_worked: '', hourly_rate: '', status: 'submitted', notes: '' };

export default function Payroll() {
  const [entries, setEntries] = useState([]);
  const [guards, setGuards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [calcModal, setCalcModal] = useState(false);
  const [calcForm, setCalcForm] = useState({ period_start: '', period_end: '', hourly_rate: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  async function load() {
    const [pd, gd] = await Promise.all([api.payroll(filterStatus ? `?status=${filterStatus}` : ''), api.guards()]);
    setEntries(pd.entries || []);
    setGuards(gd.guards || []);
    setLoading(false);
  }
  useEffect(() => { setLoading(true); load(); }, [filterStatus]);

  function openCreate() { setForm(EMPTY); setEditing(null); setError(''); setModal('entry'); }
  function openEdit(e) {
    setForm({ user_id: e.user_id || '', period_start: e.period_start?.slice(0,10) || '', period_end: e.period_end?.slice(0,10) || '', hours_worked: e.hours_worked || '', hourly_rate: e.hourly_rate || '', status: e.status || 'submitted', notes: e.notes || '' });
    setEditing(e); setError(''); setModal('entry');
  }

  async function handleSave(e) {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const body = { ...form, hours_worked: Number(form.hours_worked), hourly_rate: Number(form.hourly_rate) };
      editing ? await api.updatePayroll(editing.id, body) : await api.createPayroll(body);
      setModal(null); await load();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  }

  async function handleCalculate(e) {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const res = await api.calculatePayroll({ ...calcForm, hourly_rate: calcForm.hourly_rate ? Number(calcForm.hourly_rate) : undefined });
      alert(`Payroll calculated: ${res.processed || 0} entries created.`);
      setCalcModal(false); await load();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  }

  const guardMap = Object.fromEntries(guards.map(g => [g.id, g]));
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const fc = (k) => (e) => setCalcForm(p => ({ ...p, [k]: e.target.value }));

  const totalGross = entries.reduce((sum, e) => sum + (e.gross_pay || (e.hours_worked || 0) * (e.hourly_rate || 0)), 0);

  return (
    <div>
      <PageHeader title="Payroll" subtitle={`${entries.length} entries · $${totalGross.toFixed(2)} gross`}
        action={
          <div className="flex gap-2">
            <button className="btn-secondary flex items-center gap-2" onClick={() => { setCalcForm({ period_start: '', period_end: '', hourly_rate: '' }); setError(''); setCalcModal(true); }}>
              <Calculator size={16} /> Calculate
            </button>
            <button className="btn-primary flex items-center gap-2" onClick={openCreate}><Plus size={16} /> Add Entry</button>
          </div>
        }
      />

      <div className="flex gap-2 mb-5 flex-wrap">
        {['', 'submitted', 'under_review', 'approved', 'paid'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterStatus === s ? 'bg-brand-500 text-black' : 'bg-surface-700 text-slate-300 hover:text-white'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? <div className="text-slate-400 text-sm">Loading…</div> : (
        !entries.length ? <EmptyState icon={DollarSign} title="No payroll entries" /> : (
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-700/50 border-b border-surface-700">
                  <tr>{['Guard', 'Period', 'Hours', 'Rate', 'Gross Pay', 'Status', ''].map(h => <th key={h} className="table-head">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-surface-700">
                  {entries.map(e => {
                    const gross = e.gross_pay ?? (e.hours_worked * e.hourly_rate);
                    return (
                      <tr key={e.id} className="hover:bg-surface-700/30 transition-colors">
                        <td className="table-cell">
                          <p className="text-white text-sm font-medium">{guardMap[e.user_id]?.full_name || '—'}</p>
                        </td>
                        <td className="table-cell text-xs text-slate-400">
                          {e.period_start ? format(parseISO(e.period_start), 'MMM d') : '—'} – {e.period_end ? format(parseISO(e.period_end), 'MMM d') : '—'}
                        </td>
                        <td className="table-cell text-sm font-mono">{e.hours_worked?.toFixed(1) ?? '—'}h</td>
                        <td className="table-cell text-sm font-mono">${e.hourly_rate?.toFixed(2) ?? '—'}</td>
                        <td className="table-cell text-sm font-semibold text-brand-400">${gross?.toFixed(2) ?? '—'}</td>
                        <td className="table-cell"><Badge status={e.status} /></td>
                        <td className="table-cell">
                          <button onClick={() => openEdit(e)} className="text-slate-400 hover:text-white p-1 transition-colors"><Edit2 size={14} /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {modal === 'entry' && (
        <Modal title={editing ? 'Edit Payroll Entry' : 'Add Payroll Entry'} onClose={() => setModal(null)}>
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
              <div><label className="label">Period Start</label><input type="date" className="input" value={form.period_start} onChange={f('period_start')} required /></div>
              <div><label className="label">Period End</label><input type="date" className="input" value={form.period_end} onChange={f('period_end')} required /></div>
              <div><label className="label">Hours Worked</label><input type="number" step="0.1" min="0" className="input" value={form.hours_worked} onChange={f('hours_worked')} required /></div>
              <div><label className="label">Hourly Rate ($)</label><input type="number" step="0.01" min="0" className="input" value={form.hourly_rate} onChange={f('hourly_rate')} required /></div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={form.status} onChange={f('status')}>
                  {['submitted','under_review','approved','paid','cancelled'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="col-span-2"><label className="label">Notes</label><textarea className="input resize-none" rows={2} value={form.notes} onChange={f('notes')} /></div>
            </div>
            {form.hours_worked && form.hourly_rate && (
              <div className="bg-brand-500/10 border border-brand-500/30 rounded-lg px-4 py-3 text-sm">
                <span className="text-slate-400">Gross Pay: </span>
                <span className="text-brand-400 font-bold text-lg">${(Number(form.hours_worked) * Number(form.hourly_rate)).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        </Modal>
      )}

      {calcModal && (
        <Modal title="Calculate Payroll" onClose={() => setCalcModal(false)}>
          <form onSubmit={handleCalculate} className="space-y-4">
            {error && <p className="text-red-400 text-sm bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}
            <p className="text-slate-400 text-sm">Auto-calculate payroll for all guards from their timeclock entries for a given period.</p>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Period Start</label><input type="date" className="input" value={calcForm.period_start} onChange={fc('period_start')} required /></div>
              <div><label className="label">Period End</label><input type="date" className="input" value={calcForm.period_end} onChange={fc('period_end')} required /></div>
              <div className="col-span-2"><label className="label">Default Hourly Rate ($)</label><input type="number" step="0.01" className="input" value={calcForm.hourly_rate} onChange={fc('hourly_rate')} /></div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setCalcModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Calculating…' : 'Calculate'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
