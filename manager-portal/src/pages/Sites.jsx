import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { MapPin, Plus, Edit2, Trash2, Building } from 'lucide-react';

const EMPTY = { name: '', address: '', city: '', lat: '', lng: '', radius_m: 200, client_name: '', notes: '' };

export default function Sites() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const d = await api.sites();
    setSites(d.sites || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openCreate() { setForm(EMPTY); setEditing(null); setError(''); setModal('open'); }
  function openEdit(s) {
    setForm({ name: s.name || '', address: s.address || '', city: s.city || '', lat: s.lat || '', lng: s.lng || '', radius_m: s.radius_m || 200, client_name: s.client_name || '', notes: s.notes || '' });
    setEditing(s); setError(''); setModal('open');
  }

  async function handleSave(e) {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const body = { ...form, lat: form.lat ? Number(form.lat) : undefined, lng: form.lng ? Number(form.lng) : undefined, radius_m: Number(form.radius_m) };
      editing ? await api.updateSite(editing.id, body) : await api.createSite(body);
      setModal(null); await load();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  }

  async function handleDelete(s) {
    if (!confirm(`Delete site "${s.name}"?`)) return;
    try { await api.deleteSite(s.id); await load(); } catch (err) { alert(err.message); }
  }

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div>
      <PageHeader title="Sites" subtitle={`${sites.length} client site${sites.length !== 1 ? 's' : ''}`}
        action={<button className="btn-primary flex items-center gap-2" onClick={openCreate}><Plus size={16} /> Add Site</button>} />

      {loading ? <div className="text-gray-400 text-sm">Loading…</div> : (
        !sites.length ? <EmptyState icon={MapPin} title="No sites yet" subtitle="Add your first client site to get started" /> : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {sites.map(s => (
              <div key={s.id} className="card flex flex-col justify-between group hover:border-gray-300 transition-colors cursor-pointer">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 text-gray-400">
                        <Building size={20} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 leading-tight">{s.name}</p>
                        {s.client_name && <p className="text-xs text-gray-500 mt-0.5">{s.client_name}</p>}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(s)} className="text-gray-400 hover:text-gray-900 p-1.5 rounded transition-colors"><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(s)} className="text-gray-400 hover:text-red-500 p-1.5 rounded transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1.5">
                    {s.address && (
                      <div className="flex items-start gap-2">
                         <MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                         <p>{s.address}{s.city ? `, ${s.city}` : ''}</p>
                      </div>
                    )}
                    {(s.lat && s.lng) && <p className="font-mono text-xs text-gray-500 pl-6">{Number(s.lat).toFixed(5)}, {Number(s.lng).toFixed(5)} · {s.radius_m}m radius</p>}
                  </div>
                </div>
                {s.notes && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-500 italic line-clamp-2">{s.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {modal && (
        <Modal title={editing ? `Edit — ${editing.name}` : 'Add Site'} onClose={() => setModal(null)}>
          <form onSubmit={handleSave} className="space-y-4">
            {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><label className="label">Site Name</label><input className="input" value={form.name} onChange={f('name')} required /></div>
              <div className="col-span-2"><label className="label">Client Name</label><input className="input" value={form.client_name} onChange={f('client_name')} /></div>
              <div className="col-span-2"><label className="label">Address</label><input className="input" value={form.address} onChange={f('address')} /></div>
              <div><label className="label">City</label><input className="input" value={form.city} onChange={f('city')} /></div>
              <div><label className="label">Geofence Radius (m)</label><input type="number" className="input" value={form.radius_m} onChange={f('radius_m')} min={50} /></div>
              <div><label className="label">Latitude</label><input type="number" step="any" className="input" value={form.lat} onChange={f('lat')} /></div>
              <div><label className="label">Longitude</label><input type="number" step="any" className="input" value={form.lng} onChange={f('lng')} /></div>
              <div className="col-span-2"><label className="label">Notes</label><textarea className="input resize-none" rows={2} value={form.notes} onChange={f('notes')} /></div>
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
