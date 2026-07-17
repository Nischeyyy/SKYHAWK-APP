import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { Megaphone, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const EMPTY = { title: '', body: '', priority: 'normal', site_id: '' };

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null); // announcement object to delete
  const [deleting, setDeleting] = useState(false);

  async function load() {
    const [ad, sd] = await Promise.all([api.announcements(), api.sites()]);
    setAnnouncements(ad.announcements || []);
    setSites(sd.sites || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function handleSave(e) {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await api.createAnnouncement({ ...form, site_id: form.site_id || undefined });
      setModal(false); await load();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  }

  async function confirmAndDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.deleteAnnouncement(confirmDelete.id);
      setConfirmDelete(null);
      await load();
    } catch (err) { alert(err.message); } finally { setDeleting(false); }
  }

  const siteMap = Object.fromEntries(sites.map(s => [s.id, s]));
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const priorityBg = { urgent: 'border-red-200 bg-red-50', high: 'border-orange-200 bg-orange-50', normal: 'border-gray-200 bg-white' };

  return (
    <div>
      <PageHeader title="Announcements" subtitle="Broadcast messages to guards"
        action={<button className="btn-primary flex items-center gap-2" onClick={() => { setForm(EMPTY); setError(''); setModal(true); }}><Plus size={16} /> New Announcement</button>} />

      {loading ? <div className="text-gray-400 text-sm">Loading…</div> : (
        !announcements.length ? <EmptyState icon={Megaphone} title="No announcements yet" subtitle="Post a message to all guards" /> : (
          <div className="space-y-4">
            {announcements.map(ann => (
              <div key={ann.id} className={`card ${priorityBg[ann.priority] || priorityBg.normal} shadow-sm transition-all hover:shadow-md`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="font-bold text-gray-900 text-lg">{ann.title}</h3>
                      {ann.priority && ann.priority !== 'normal' && (
                        <span className={`badge ${ann.priority === 'urgent' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-orange-100 text-orange-700 border border-orange-200'}`}>
                          {ann.priority.toUpperCase()}
                        </span>
                      )}
                      {ann.site_id && <span className="badge bg-blue-100 text-blue-700 border border-blue-200">{siteMap[ann.site_id]?.name || 'Site-specific'}</span>}
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed mb-4">{ann.body}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                      <span>By {ann.posted_by}</span>
                      <span>·</span>
                      <span>{ann.created_at ? format(parseISO(ann.created_at), 'MMM d yyyy, HH:mm') : '—'}</span>
                    </div>
                  </div>
                  <button onClick={() => setConfirmDelete(ann)} className="text-gray-400 hover:text-red-500 p-2 rounded hover:bg-gray-100 transition-colors flex-shrink-0" title="Delete announcement">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {confirmDelete && (
        <Modal title="Delete Announcement" onClose={() => !deleting && setConfirmDelete(null)}>
          <div className="space-y-5">
            <div className="flex gap-4 items-start">
              <div className="w-11 h-11 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={22} className="text-red-600" />
              </div>
              <div>
                <p className="text-gray-900 font-semibold text-sm mb-1">
                  Are you sure you want to delete this announcement?
                </p>
                <p className="text-gray-500 text-sm leading-relaxed">
                  <span className="font-medium text-gray-700">"{confirmDelete.title}"</span> will be permanently removed and guards will no longer see it.
                  <span className="block mt-1 font-semibold text-red-600">This cannot be undone.</span>
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAndDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {deleting ? 'Deleting…' : 'Yes, delete permanently'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {modal && (
        <Modal title="New Announcement" onClose={() => setModal(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <div>
              <label className="label">Title</label>
              <input className="input" value={form.title} onChange={f('title')} required placeholder="e.g. Holiday schedule update" />
            </div>
            <div>
              <label className="label">Message</label>
              <textarea className="input resize-none" rows={4} value={form.body} onChange={f('body')} required placeholder="Write your message here…" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Priority</label>
                <select className="input" value={form.priority} onChange={f('priority')}>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="label">Target Site (optional)</label>
                <select className="input" value={form.site_id} onChange={f('site_id')}>
                  <option value="">All guards (Global)</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-2">
              <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Posting…' : 'Post Announcement'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
