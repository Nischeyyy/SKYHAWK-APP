import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { Megaphone, Plus, Trash2 } from 'lucide-react';
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

  async function handleDelete(id) {
    if (!confirm('Delete this announcement?')) return;
    try { await api.deleteAnnouncement(id); await load(); } catch (err) { alert(err.message); }
  }

  const siteMap = Object.fromEntries(sites.map(s => [s.id, s]));
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const priorityBg = { urgent: 'border-red-500/40 bg-red-500/5', high: 'border-orange-500/40 bg-orange-500/5', normal: '' };

  return (
    <div>
      <PageHeader title="Announcements" subtitle="Broadcast messages to guards"
        action={<button className="btn-primary flex items-center gap-2" onClick={() => { setForm(EMPTY); setError(''); setModal(true); }}><Plus size={16} /> New Announcement</button>} />

      {loading ? <div className="text-slate-400 text-sm">Loading…</div> : (
        !announcements.length ? <EmptyState icon={Megaphone} title="No announcements yet" subtitle="Post a message to all guards" /> : (
          <div className="space-y-3">
            {announcements.map(ann => (
              <div key={ann.id} className={`card ${priorityBg[ann.priority] || ''}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-white">{ann.title}</h3>
                      {ann.priority && ann.priority !== 'normal' && (
                        <span className={`badge ${ann.priority === 'urgent' ? 'bg-red-500/15 text-red-400' : 'bg-orange-500/15 text-orange-400'}`}>
                          {ann.priority}
                        </span>
                      )}
                      {ann.site_id && <span className="badge bg-blue-500/15 text-blue-400">{siteMap[ann.site_id]?.name || 'Site-specific'}</span>}
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed">{ann.body}</p>
                    <p className="text-slate-500 text-xs mt-2">
                      By {ann.posted_by} · {ann.created_at ? format(parseISO(ann.created_at), 'MMM d yyyy, HH:mm') : '—'}
                    </p>
                  </div>
                  <button onClick={() => handleDelete(ann.id)} className="text-slate-400 hover:text-red-400 p-1 transition-colors flex-shrink-0">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {modal && (
        <Modal title="New Announcement" onClose={() => setModal(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            {error && <p className="text-red-400 text-sm bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}
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
                  <option value="">All guards</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Posting…' : 'Post Announcement'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
