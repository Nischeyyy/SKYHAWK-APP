import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import Badge from '../components/Badge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { Users, Plus, Search, Edit2 } from 'lucide-react';
import { format } from 'date-fns';

const EMPTY_FORM = {
  full_name: '', email: '', password: '', phone: '', employee_number: '',
  licence_number: '', licence_expiry: '', employment_status: 'active',
  certifications: [], role: 'employee',
};

export default function Guards() {
  const [guards, setGuards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // null | 'create' | 'edit'
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const data = await api.guards();
    setGuards(data.guards || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditing(null);
    setError('');
    setModal('create');
  }

  function openEdit(g) {
    setForm({
      full_name: g.full_name || '', email: g.email || '', password: '',
      phone: g.phone || '', employee_number: g.employee_number || '',
      licence_number: g.licence_number || '', licence_expiry: g.licence_expiry || '',
      employment_status: g.employment_status || 'active',
      certifications: g.certifications || [], role: g.role || 'employee',
    });
    setEditing(g);
    setError('');
    setModal('edit');
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (modal === 'create') {
        await api.createGuard(form);
      } else {
        const update = { ...form };
        if (!update.password) delete update.password;
        await api.updateGuard(editing.id, update);
      }
      setModal(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const filtered = guards.filter(g =>
    `${g.full_name} ${g.email} ${g.employee_number}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="Guards"
        subtitle={`${guards.length} employee${guards.length !== 1 ? 's' : ''}`}
        action={<button className="btn-primary flex items-center gap-2" onClick={openCreate}><Plus size={16} /> Add Guard</button>}
      />

      {/* Search */}
      <div className="relative mb-5">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-9" placeholder="Search by name, email, or employee #…" />
      </div>

      {loading ? <div className="text-slate-400 text-sm">Loading…</div> : (
        !filtered.length ? <EmptyState icon={Users} title="No guards found" /> : (
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-700/50 border-b border-surface-700">
                  <tr>
                    {['Guard', 'Employee #', 'Role', 'Licence', 'Status', 'Joined', ''].map(h => (
                      <th key={h} className="table-head">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-700">
                  {filtered.map(g => (
                    <tr key={g.id} className="hover:bg-surface-700/30 transition-colors">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-semibold text-sm flex-shrink-0">
                            {(g.full_name || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-white font-medium text-sm">{g.full_name}</p>
                            <p className="text-slate-400 text-xs">{g.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell font-mono text-xs">{g.employee_number || '—'}</td>
                      <td className="table-cell"><Badge status={g.role} /></td>
                      <td className="table-cell text-xs">
                        {g.licence_number ? (
                          <div>
                            <p>{g.licence_number}</p>
                            {g.licence_expiry && <p className="text-slate-500">{g.licence_expiry}</p>}
                          </div>
                        ) : '—'}
                      </td>
                      <td className="table-cell"><Badge status={g.employment_status || 'active'} /></td>
                      <td className="table-cell text-xs">{g.created_at ? format(new Date(g.created_at), 'MMM d, yyyy') : '—'}</td>
                      <td className="table-cell">
                        <button onClick={() => openEdit(g)} className="text-slate-400 hover:text-white transition-colors p-1">
                          <Edit2 size={15} />
                        </button>
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
        <Modal title={modal === 'create' ? 'Add Guard' : `Edit — ${editing?.full_name}`} onClose={() => setModal(null)}>
          <form onSubmit={handleSave} className="space-y-4">
            {error && <p className="text-red-400 text-sm bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Full Name</label>
                <input className="input" value={form.full_name} onChange={e => setForm(f => ({...f, full_name: e.target.value}))} required />
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} required={modal === 'create'} />
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input" value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} />
              </div>
              <div>
                <label className="label">{modal === 'create' ? 'Password' : 'New Password (leave blank to keep)'}</label>
                <input type="password" className="input" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} required={modal === 'create'} />
              </div>
              <div>
                <label className="label">Employee #</label>
                <input className="input" value={form.employee_number} onChange={e => setForm(f => ({...f, employee_number: e.target.value}))} />
              </div>
              <div>
                <label className="label">Licence Number</label>
                <input className="input" value={form.licence_number} onChange={e => setForm(f => ({...f, licence_number: e.target.value}))} />
              </div>
              <div>
                <label className="label">Licence Expiry</label>
                <input type="date" className="input" value={form.licence_expiry} onChange={e => setForm(f => ({...f, licence_expiry: e.target.value}))} />
              </div>
              <div>
                <label className="label">Role</label>
                <select className="input" value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value}))}>
                  <option value="employee">Employee</option>
                  <option value="admin">Admin / Manager</option>
                </select>
              </div>
              <div>
                <label className="label">Employment Status</label>
                <select className="input" value={form.employment_status} onChange={e => setForm(f => ({...f, employment_status: e.target.value}))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                  <option value="terminated">Terminated</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
