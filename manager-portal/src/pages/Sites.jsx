import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { MapPin, Plus, Edit2, Trash2 } from 'lucide-react';

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

      {loading ? <div className="text-slate-400 text-sm">Loading…</div> : (
        !sites.length ? <EmptyState icon={MapPin} title="No sites yet" subtitle="Add your first client site to get started" /> : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {sites.map(s => (
              <div key={s.id} className="card space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <MapPin size={18} className="text-brand-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-white">{s.name}</p>
                      {s.client_name && <p className="text-xs text-slate-400">{s.client_name}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(s)} className="text-slate-400 hover:text-white p-1 transition-colors"><Edit2 size={14} /></button>
                    <button onClick={() => handleDelete(s)} className="text-slate-400 hover:text-red-400 p-1 transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="text-sm text-slate-400 space-y-1">
                  {s.address && <p>{s.address}{s.city ? `, ${s.city}` : ''}</p>}
                  {(s.lat && s.lng) && <p className="font-mono text-xs">{Number(s.lat).toFixed(5)}, {Number(s.lng).toFixed(5)} · {s.radius_m}m radius</p>}
                  {s.notes && <p className="text-xs text-slate-500 italic">{s.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {modal && (
        <Modal title={editing ? `Edit — ${editing.name}` : 'Add Site'} onClose={() => setModal(null)}>
          <form onSubmit={handleSave} className="space-y-4">
            {error && <p className="text-red-400 text-sm bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}
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
