import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client.js';
import { useAutoRefresh } from '../hooks/useAutoRefresh.js';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import Badge from '../components/Badge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { Users, Plus, Search, Edit2, Eye, FileText, CheckCircle, Clock, AlertCircle, ExternalLink, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';

const EMPTY_FORM = {
  full_name: '', email: '', password: '', phone: '', employee_number: '',
  licence_number: '', licence_expiry: '', employment_status: 'active',
  certifications: [], role: 'employee',
};

const DOC_TYPE_LABELS = {
  security_licence: 'Security Licence',
  drivers_licence: "Driver's Licence",
  passport: 'Passport',
  void_cheque: 'Void Cheque',
  sin_card: 'SIN Card',
  other: 'Other',
};

function OnboardingStep({ label, done }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {done
        ? <CheckCircle size={15} className="text-green-500 flex-shrink-0" />
        : <Clock size={15} className="text-gray-300 flex-shrink-0" />}
      <span className={done ? 'text-gray-700' : 'text-gray-400'}>{label}</span>
    </div>
  );
}

function DocumentCard({ doc }) {
  const label = DOC_TYPE_LABELS[doc.document_type] || doc.document_type || 'Document';
  const url = doc.attachment_url;
  const isImage = url && /\.(jpg|jpeg|png|webp|gif)$/i.test(url);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      {isImage ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="block group relative">
          <img
            src={url}
            alt={label}
            className="w-full h-36 object-cover group-hover:opacity-90 transition-opacity"
            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
          />
          <div className="hidden w-full h-36 bg-gray-50 items-center justify-center">
            <FileText size={32} className="text-gray-300" />
          </div>
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <ExternalLink size={20} className="text-white drop-shadow" />
          </div>
        </a>
      ) : (
        <div className="w-full h-36 bg-gray-50 flex items-center justify-center">
          <FileText size={32} className="text-gray-300" />
        </div>
      )}
      <div className="px-3 py-2.5 flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-gray-900">{label}</p>
          {doc.uploaded_at && (
            <p className="text-xs text-gray-400 mt-0.5">
              {format(new Date(doc.uploaded_at), 'MMM d, yyyy')}
            </p>
          )}
        </div>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-gray-900 transition-colors flex-shrink-0"
            title="Open document"
          >
            <ExternalLink size={15} />
          </a>
        )}
      </div>
    </div>
  );
}

export default function Guards() {
  const [guards, setGuards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // null | 'create' | 'edit' | 'view'
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null); // full guard detail {guard, documents, onboarding, ...}
  const [viewLoading, setViewLoading] = useState(false);
  const [viewTab, setViewTab] = useState('documents');
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const data = await api.guards();
    setGuards(data.guards || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);
  useAutoRefresh(load, 60_000); // guards change infrequently

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

  async function openView(g) {
    setViewing(null);
    setViewTab('documents');
    setModal('view');
    setViewLoading(true);
    try {
      const detail = await api.guard(g.id);
      setViewing(detail);
    } catch (e) {
      console.error(e);
    } finally {
      setViewLoading(false);
    }
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

  const ob = viewing?.onboarding;
  const obSteps = ob ? [
    { label: 'Personal info', done: ob.personal_info },
    { label: 'Documents uploaded', done: ob.documents_uploaded },
    { label: 'SIN provided', done: ob.sin_provided },
    { label: 'Direct deposit', done: ob.direct_deposit },
    { label: 'Emergency contact', done: ob.emergency_contact },
    { label: 'Agreements signed', done: ob.agreements_signed },
  ] : [];
  const obComplete = obSteps.every(s => s.done);

  return (
    <div>
      <PageHeader
        title="Guards"
        subtitle={`${guards.length} employee${guards.length !== 1 ? 's' : ''}`}
        action={<button className="btn-primary flex items-center gap-2" onClick={openCreate}><Plus size={16} /> Add Guard</button>}
      />

      {/* Search */}
      <div className="relative mb-5 w-80">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-9 rounded-full bg-white shadow-sm" placeholder="Search by name, email, or employee #…" />
      </div>

      {loading ? <div className="text-gray-400 text-sm">Loading…</div> : (
        !filtered.length ? <EmptyState icon={Users} title="No guards found" /> : (
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Guard', 'Employee #', 'Role', 'Licence', 'Onboarding', 'Status', 'Joined', ''].map(h => (
                      <th key={h} className="table-head">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(g => (
                    <tr key={g.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 font-semibold text-sm flex-shrink-0">
                            {(g.full_name || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-gray-900 font-medium text-sm">{g.full_name}</p>
                            <p className="text-gray-500 text-xs">{g.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell font-mono text-xs text-gray-600">{g.employee_number || '—'}</td>
                      <td className="table-cell"><Badge status={g.role} /></td>
                      <td className="table-cell text-xs text-gray-600">
                        {g.licence_number ? (
                          <div>
                            <p className="font-medium text-gray-900">{g.licence_number}</p>
                            {g.licence_expiry && <p className="text-gray-500">{g.licence_expiry}</p>}
                          </div>
                        ) : '—'}
                      </td>
                      <td className="table-cell">
                        {g.onboarding_complete
                          ? <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5"><CheckCircle size={11} /> Complete</span>
                          : <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5"><Clock size={11} /> Pending</span>
                        }
                      </td>
                      <td className="table-cell"><Badge status={g.employment_status || 'active'} /></td>
                      <td className="table-cell text-xs text-gray-500">{g.created_at ? format(new Date(g.created_at), 'MMM d, yyyy') : '—'}</td>
                      <td className="table-cell text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openView(g)} className="text-gray-400 hover:text-gray-900 transition-colors p-1" title="View profile & documents">
                            <Eye size={16} />
                          </button>
                          <button onClick={() => openEdit(g)} className="text-gray-400 hover:text-gray-900 transition-colors p-1" title="Edit guard">
                            <Edit2 size={16} />
                          </button>
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

      {/* Guard Detail / Documents Modal */}
      {modal === 'view' && (
        <Modal title={viewing ? `${viewing.guard?.full_name || 'Guard'} — Profile` : 'Loading…'} onClose={() => setModal(null)} size="xl">
          {viewLoading ? (
            <div className="text-gray-400 text-sm py-8 text-center">Loading…</div>
          ) : viewing ? (
            <div>
              {/* Guard summary row */}
              <div className="flex items-center gap-4 mb-6 pb-5 border-b border-gray-100">
                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 font-bold text-xl flex-shrink-0">
                  {(viewing.guard?.full_name || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 font-semibold text-base">{viewing.guard?.full_name}</p>
                  <p className="text-gray-500 text-sm">{viewing.guard?.email}</p>
                  <p className="text-gray-400 text-xs mt-0.5 font-mono">{viewing.guard?.employee_number}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge status={viewing.guard?.employment_status || 'active'} />
                  {viewing.guard?.onboarding_complete
                    ? <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5"><CheckCircle size={10} /> Onboarding complete</span>
                    : <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5"><AlertCircle size={10} /> Onboarding incomplete</span>
                  }
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mb-5 border-b border-gray-100">
                {[
                  { id: 'documents', label: 'Documents', count: viewing.documents?.length },
                  { id: 'onboarding', label: 'Onboarding' },
                  { id: 'shifts', label: 'Recent Shifts', count: viewing.recent_shifts?.length },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setViewTab(tab.id)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 -mb-px ${
                      viewTab === tab.id
                        ? 'border-gray-900 text-gray-900'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.label}
                    {tab.count !== undefined && (
                      <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-1.5 py-0.5 leading-none">{tab.count}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Documents tab */}
              {viewTab === 'documents' && (
                <div>
                  {!viewing.documents?.length ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <FileText size={36} className="text-gray-200 mb-3" />
                      <p className="text-gray-500 font-medium">No documents uploaded</p>
                      <p className="text-gray-400 text-sm mt-1">Guard has not completed the document upload step yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {viewing.documents.map((doc, i) => (
                        <DocumentCard key={doc.id || i} doc={doc} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Onboarding tab */}
              {viewTab === 'onboarding' && (
                <div>
                  <div className={`rounded-xl px-4 py-3 mb-5 flex items-center gap-2 text-sm font-medium ${
                    obComplete
                      ? 'bg-green-50 border border-green-200 text-green-700'
                      : 'bg-amber-50 border border-amber-200 text-amber-700'
                  }`}>
                    <ShieldCheck size={16} />
                    {obComplete ? 'All onboarding steps completed' : 'Onboarding in progress'}
                  </div>
                  {ob ? (
                    <div className="space-y-3">
                      {obSteps.map(step => <OnboardingStep key={step.label} {...step} />)}
                      {ob.updated_at && (
                        <p className="text-xs text-gray-400 pt-2 border-t border-gray-100">
                          Last updated {format(new Date(ob.updated_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm">No onboarding record found.</p>
                  )}
                </div>
              )}

              {/* Recent shifts tab */}
              {viewTab === 'shifts' && (
                <div>
                  {!viewing.recent_shifts?.length ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <Clock size={32} className="text-gray-200 mb-2" />
                      <p className="text-gray-400 text-sm">No shifts assigned yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {viewing.recent_shifts.map((s, i) => (
                        <div key={s.id || i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-100 bg-gray-50/50">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{s.site?.name || 'Unknown site'}</p>
                            <p className="text-xs text-gray-500">{s.role || ''}</p>
                          </div>
                          <div className="text-right text-xs text-gray-500 flex-shrink-0">
                            {s.start && <p>{format(new Date(s.start), 'MMM d, yyyy')}</p>}
                            {s.start && s.end && (
                              <p>{format(new Date(s.start), 'h:mm a')} – {format(new Date(s.end), 'h:mm a')}</p>
                            )}
                          </div>
                          <Badge status={s.status || 'scheduled'} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-400 text-sm py-8 text-center">Could not load guard details.</div>
          )}
        </Modal>
      )}

      {/* Create / Edit modal */}
      {(modal === 'create' || modal === 'edit') && (
        <Modal title={modal === 'create' ? 'Add Guard' : `Edit — ${editing?.full_name}`} onClose={() => setModal(null)}>
          <form onSubmit={handleSave} className="space-y-4">
            {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2 border border-red-200">{error}</p>}
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
