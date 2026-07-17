import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import PageHeader from '../components/PageHeader.jsx';
import Badge from '../components/Badge.jsx';
import Modal from '../components/Modal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { DollarSign, Plus, Edit2, Calculator, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const PAID_VIA_OPTIONS = [
  { value: '', label: '— Select method —' },
  { value: 'direct_deposit', label: 'Direct Deposit' },
  { value: 'cheque',         label: 'Cheque' },
  { value: 'cash',           label: 'Cash' },
  { value: 'interac',        label: 'Interac e-Transfer' },
];

const EMPTY = {
  user_id: '', period_start: '', period_end: '', pay_date: '',
  hours_regular: '', hours_overtime: '0', pay_rate: '',
  status: 'submitted', notes: '', deductions: [], paid_via: '',
};

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
    setForm({
      user_id: e.user_id || '',
      period_start: e.period_start?.slice(0,10) || '',
      period_end: e.period_end?.slice(0,10) || '',
      pay_date: e.pay_date?.slice(0,10) || '',
      hours_regular: e.hours_regular ?? e.hours_worked ?? '',
      hours_overtime: e.hours_overtime ?? '0',
      pay_rate: e.pay_rate ?? e.hourly_rate ?? '',
      status: e.status || 'submitted',
      notes: e.notes || '',
      deductions: e.deductions || [],
      paid_via: e.paid_via || '',
    });
    setEditing(e); setError(''); setModal('entry');
  }

  async function handleSave(e) {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const body = {
        ...form,
        hours_regular: Number(form.hours_regular),
        hours_overtime: Number(form.hours_overtime) || 0,
        pay_rate: Number(form.pay_rate),
        deductions: form.deductions.map(d => ({ label: d.label, amount: Number(d.amount) || 0 })),
      };
      editing ? await api.updatePayroll(editing.id, body) : await api.createPayroll(body);
      setModal(null); await load();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  }

  // Deduction helpers
  function addDeduction() {
    setForm(p => ({ ...p, deductions: [...p.deductions, { label: '', amount: '' }] }));
  }
  function updateDeduction(i, field, val) {
    setForm(p => {
      const d = [...p.deductions];
      d[i] = { ...d[i], [field]: val };
      return { ...p, deductions: d };
    });
  }
  function removeDeduction(i) {
    setForm(p => ({ ...p, deductions: p.deductions.filter((_, idx) => idx !== i) }));
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

  const totalGross = entries.reduce((sum, e) => sum + (e.gross ?? e.gross_pay ?? (e.hours_regular || e.hours_worked || 0) * (e.pay_rate || e.hourly_rate || 0)), 0);

  return (
    <div>
      <PageHeader title="Payroll" subtitle={`${entries.length} entries · ${totalGross.toFixed(2)} gross`}
        action={
          <div className="flex gap-2">
            <button className="btn-secondary flex items-center gap-2" onClick={() => { setCalcForm({ period_start: '', period_end: '', hourly_rate: '' }); setError(''); setCalcModal(true); }}>
              <Calculator size={16} /> Calculate
            </button>
            <button className="btn-primary flex items-center gap-2" onClick={openCreate}><Plus size={16} /> Add Entry</button>
          </div>
        }
      />

      <div className="flex gap-2 mb-6 flex-wrap">
        {['', 'submitted', 'under_review', 'approved', 'paid'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filterStatus === s ? 'bg-gray-900 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {s ? s.replace('_', ' ').charAt(0).toUpperCase() + s.replace('_', ' ').slice(1) : 'All'}
          </button>
        ))}
      </div>

      {loading ? <div className="text-gray-400 text-sm">Loading…</div> : (
        !entries.length ? <EmptyState icon={DollarSign} title="No payroll entries" /> : (
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>{['Guard', 'Period', 'Hours', 'Rate', 'Gross', 'Deductions', 'Net Pay', 'Paid Via', 'Status', ''].map(h => <th key={h} className="table-head">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {entries.map(e => {
                    const hrs = e.hours_regular ?? e.hours_worked ?? 0;
                    const rate = e.pay_rate ?? e.hourly_rate ?? 0;
                    const gross = e.gross ?? e.gross_pay ?? (hrs * rate);
                    const totalDed = e.total_deductions ?? (e.deductions || []).reduce((s, d) => s + (d.amount || 0), 0);
                    const net = e.net ?? (gross - totalDed);
                    const paidViaLabel = PAID_VIA_OPTIONS.find(o => o.value === e.paid_via)?.label || '—';
                    return (
                      <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="table-cell">
                          <p className="text-gray-900 text-sm font-medium">{guardMap[e.user_id]?.full_name || '—'}</p>
                        </td>
                        <td className="table-cell text-xs text-gray-600">
                          {e.period_start ? format(parseISO(e.period_start), 'MMM d') : '—'} – {e.period_end ? format(parseISO(e.period_end), 'MMM d') : '—'}
                        </td>
                        <td className="table-cell text-sm font-mono">{hrs?.toFixed(1) ?? '—'}h</td>
                        <td className="table-cell text-sm font-mono">${rate?.toFixed(2) ?? '—'}</td>
                        <td className="table-cell text-sm text-gray-700 font-mono">${gross?.toFixed(2) ?? '—'}</td>
                        <td className="table-cell text-sm font-mono text-red-600">{totalDed > 0 ? `−${totalDed.toFixed(2)}` : <span className="text-gray-300">—</span>}</td>
                        <td className="table-cell text-sm font-bold text-gray-900">${net?.toFixed(2) ?? '—'}</td>
                        <td className="table-cell text-xs text-gray-500">{paidViaLabel}</td>
                        <td className="table-cell"><Badge status={e.status} /></td>
                        <td className="table-cell text-right">
                          <button onClick={() => openEdit(e)} className="text-gray-400 hover:text-gray-900 p-1.5 rounded transition-colors"><Edit2 size={16} /></button>
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
        <Modal title={editing ? 'Edit Payroll Entry' : 'Add Payroll Entry'} onClose={() => setModal(null)} size="lg">
          <form onSubmit={handleSave} className="space-y-5">
            {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

            {/* Guard */}
            <div>
              <label className="label">Guard</label>
              <select className="input" value={form.user_id} onChange={f('user_id')} required>
                <option value="">— Select guard —</option>
                {guards.map(g => <option key={g.id} value={g.id}>{g.full_name}</option>)}
              </select>
            </div>

            {/* Period */}
            <div className="grid grid-cols-3 gap-3">
              <div><label className="label">Period Start</label><input type="date" className="input" value={form.period_start} onChange={f('period_start')} required /></div>
              <div><label className="label">Period End</label><input type="date" className="input" value={form.period_end} onChange={f('period_end')} required /></div>
              <div><label className="label">Pay Date</label><input type="date" className="input" value={form.pay_date} onChange={f('pay_date')} /></div>
            </div>

            {/* Hours & Rate */}
            <div className="grid grid-cols-3 gap-3">
              <div><label className="label">Hours Worked</label><input type="number" step="0.1" min="0" className="input" value={form.hours_regular} onChange={f('hours_regular')} required /></div>
              <div><label className="label">Overtime Hours</label><input type="number" step="0.1" min="0" className="input" value={form.hours_overtime} onChange={f('hours_overtime')} /></div>
              <div><label className="label">Hourly Rate ($)</label><input type="number" step="0.01" min="0" className="input" value={form.pay_rate} onChange={f('pay_rate')} required /></div>
            </div>

            {/* Deductions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Deductions</label>
                <button type="button" onClick={addDeduction}
                  className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg px-2.5 py-1.5 transition-colors">
                  <Plus size={12} /> Add deduction
                </button>
              </div>
              {form.deductions.length === 0 && (
                <p className="text-xs text-gray-400 py-1">No deductions — click "Add deduction" to include one.</p>
              )}
              <div className="space-y-2">
                {form.deductions.map((d, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      type="text" placeholder="Label (e.g. CPP, EI, Uniform)"
                      className="input flex-1 text-sm" value={d.label}
                      onChange={e => updateDeduction(i, 'label', e.target.value)} required />
                    <div className="relative w-32 flex-shrink-0">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input
                        type="number" step="0.01" min="0" placeholder="0.00"
                        className="input pl-6 text-sm" value={d.amount}
                        onChange={e => updateDeduction(i, 'amount', e.target.value)} required />
                    </div>
                    <button type="button" onClick={() => removeDeduction(i)}
                      className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Paid via & Status */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Paid Via</label>
                <select className="input" value={form.paid_via} onChange={f('paid_via')}>
                  {PAID_VIA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={form.status} onChange={f('status')}>
                  {['submitted','under_review','approved','paid','cancelled'].map(s => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div><label className="label">Notes</label><textarea className="input resize-none" rows={2} value={form.notes} onChange={f('notes')} /></div>

            {/* Pay summary */}
            {form.hours_regular && form.pay_rate && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                {(() => {
                  const gross = Number(form.hours_regular) * Number(form.pay_rate)
                    + (Number(form.hours_overtime) || 0) * Number(form.pay_rate) * 1.5;
                  const totalDed = form.deductions.reduce((s, d) => s + (Number(d.amount) || 0), 0);
                  const net = gross - totalDed;
                  return (
                    <div className="divide-y divide-gray-200">
                      <div className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Gross Pay</span>
                        <span className="text-gray-700 font-semibold">${gross.toFixed(2)}</span>
                      </div>
                      {totalDed > 0 && (
                        <div className="flex items-center justify-between px-4 py-2.5">
                          <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Total Deductions</span>
                          <span className="text-red-600 font-semibold">−${totalDed.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between px-4 py-3 bg-gray-900">
                        <span className="text-gray-300 text-xs font-bold uppercase tracking-wider">Net Pay</span>
                        <span className="text-white font-bold text-xl">${net.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Entry'}</button>
            </div>
          </form>
        </Modal>
      )}

      {calcModal && (
        <Modal title="Calculate Payroll" onClose={() => setCalcModal(false)}>
          <form onSubmit={handleCalculate} className="space-y-4">
            {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <p className="text-gray-600 text-sm leading-relaxed mb-2">Auto-calculate payroll for all guards from their timeclock entries for a given period.</p>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Period Start</label><input type="date" className="input" value={calcForm.period_start} onChange={fc('period_start')} required /></div>
              <div><label className="label">Period End</label><input type="date" className="input" value={calcForm.period_end} onChange={fc('period_end')} required /></div>
              <div className="col-span-2"><label className="label">Default Hourly Rate ($)</label><input type="number" step="0.01" className="input" value={calcForm.hourly_rate} onChange={fc('hourly_rate')} /></div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-2">
              <button type="button" className="btn-secondary" onClick={() => setCalcModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary bg-blue-600 hover:bg-blue-700" disabled={saving}>{saving ? 'Calculating…' : 'Calculate Run'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
