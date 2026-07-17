import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import PageHeader from '../components/PageHeader.jsx';
import Badge from '../components/Badge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { AlertTriangle, Check, CheckCheck } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function SosAlerts() {
  const [active, setActive] = useState([]);
  const [history, setHistory] = useState([]);
  const [guards, setGuards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('active');
  const [acting, setActing] = useState(null);

  async function load() {
    const [a, h, gd] = await Promise.all([api.sosActive(), api.sosHistory(), api.guards()]);
    setActive(a.alerts || []);
    setHistory(h.alerts || []);
    setGuards(gd.guards || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  // Auto-refresh every 20s when viewing active
  useEffect(() => {
    if (tab !== 'active') return;
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [tab]);

  async function ack(id) {
    setActing(id);
    try { await api.sosAck(id); await load(); } catch (err) { alert(err.message); } finally { setActing(null); }
  }

  async function resolve(id) {
    setActing(id);
    try { await api.sosResolve(id); await load(); } catch (err) { alert(err.message); } finally { setActing(null); }
  }

  const guardMap = Object.fromEntries(guards.map(g => [g.id, g]));
  const list = tab === 'active' ? active : history;

  return (
    <div>
      <PageHeader title="SOS Alerts" subtitle={active.length > 0 ? `⚠ ${active.length} active alert${active.length > 1 ? 's' : ''}` : 'No active alerts'} />

      {active.length > 0 && (
        <div className="mb-5 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={20} className="text-red-400 flex-shrink-0 animate-pulse" />
          <p className="text-red-300 font-medium">{active.length} guard{active.length > 1 ? 's need' : ' needs'} immediate attention</p>
        </div>
      )}

      <div className="flex gap-2 mb-5">
        {['active', 'history'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-brand-500 text-black' : 'bg-surface-700 text-slate-300 hover:text-white'}`}>
            {t === 'active' ? `Active (${active.length})` : 'History'}
          </button>
        ))}
      </div>

      {loading ? <div className="text-slate-400 text-sm">Loading…</div> : (
        !list.length ? (
          <EmptyState
            icon={AlertTriangle}
            title={tab === 'active' ? 'No active SOS alerts' : 'No alert history'}
            subtitle={tab === 'active' ? 'All guards are safe' : 'Past alerts will appear here'}
          />
        ) : (
          <div className="space-y-3">
            {list.map(alert => (
              <div key={alert.id} className={`card ${alert.status === 'triggered' ? 'border-red-500/50 bg-red-500/5' : ''}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      alert.status === 'triggered' ? 'bg-red-500/20' : alert.status === 'acknowledged' ? 'bg-blue-500/20' : 'bg-green-500/20'
                    }`}>
                      <AlertTriangle size={18} className={
                        alert.status === 'triggered' ? 'text-red-400' : alert.status === 'acknowledged' ? 'text-blue-400' : 'text-green-400'
                      } />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-white">{guardMap[alert.user_id]?.full_name || 'Unknown Guard'}</p>
                        <Badge status={alert.status} />
                      </div>
                      {alert.message && <p className="text-slate-300 text-sm mb-2">{alert.message}</p>}
                      <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                        <span>Triggered: {alert.triggered_at ? format(parseISO(alert.triggered_at), 'MMM d, HH:mm:ss') : '—'}</span>
                        {alert.lat && alert.lng && (
                          <a href={`https://maps.google.com/?q=${alert.lat},${alert.lng}`} target="_blank" rel="noopener noreferrer"
                            className="text-brand-400 hover:text-brand-300 underline">
                            View on map
                          </a>
                        )}
                        {alert.acknowledged_at && <span>Acknowledged: {format(parseISO(alert.acknowledged_at), 'HH:mm:ss')}</span>}
                        {alert.resolved_at && <span>Resolved: {format(parseISO(alert.resolved_at), 'HH:mm:ss')}</span>}
                      </div>
                    </div>
                  </div>

                  {tab === 'active' && (
                    <div className="flex gap-2 flex-shrink-0">
                      {alert.status === 'triggered' && (
                        <button onClick={() => ack(alert.id)} disabled={acting === alert.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors">
                          <Check size={14} /> Acknowledge
                        </button>
                      )}
                      {(alert.status === 'triggered' || alert.status === 'acknowledged') && (
                        <button onClick={() => resolve(alert.id)} disabled={acting === alert.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors">
                          <CheckCheck size={14} /> Resolve
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
