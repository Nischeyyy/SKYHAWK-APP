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
    const t = setInterval(load, 3000);
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
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 animate-pulse">
            <AlertTriangle size={20} className="text-red-600" />
          </div>
          <div>
            <p className="text-red-900 font-bold text-lg">{active.length} guard{active.length > 1 ? 's need' : ' needs'} immediate attention</p>
            <p className="text-red-700 text-sm">Please review and acknowledge alerts below immediately.</p>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-6">
        {['active', 'history'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${tab === t ? 'bg-gray-900 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {t === 'active' ? `Active Alerts (${active.length})` : 'Resolved History'}
          </button>
        ))}
      </div>

      {loading ? <div className="text-gray-400 text-sm">Loading…</div> : (
        !list.length ? (
          <EmptyState
            icon={AlertTriangle}
            title={tab === 'active' ? 'No active SOS alerts' : 'No alert history'}
            subtitle={tab === 'active' ? 'All guards are safe' : 'Past alerts will appear here'}
          />
        ) : (
          <div className="space-y-4">
            {list.map(alert => (
              <div key={alert.id} className={`card ${alert.status === 'triggered' ? 'border-red-300 bg-red-50/50 shadow-md ring-1 ring-red-500/20' : 'hover:border-gray-300'}`}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                      alert.status === 'triggered' ? 'bg-red-100 text-red-600' : alert.status === 'acknowledged' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                    }`}>
                      <AlertTriangle size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1.5">
                        <p className="font-bold text-gray-900 text-lg">{guardMap[alert.user_id]?.full_name || 'Unknown Guard'}</p>
                        <Badge status={alert.status} />
                      </div>
                      {alert.message && <p className="text-gray-700 text-sm mb-3 bg-white/50 inline-block px-3 py-1.5 rounded-lg border border-gray-100 font-medium">"{alert.message}"</p>}
                      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-500 font-mono">
                        <span>Triggered: <strong className="text-gray-700">{alert.triggered_at ? format(parseISO(alert.triggered_at), 'MMM d, HH:mm:ss') : '—'}</strong></span>
                        {alert.acknowledged_at && <span>Ack'd: <strong className="text-gray-700">{format(parseISO(alert.acknowledged_at), 'HH:mm:ss')}</strong></span>}
                        {alert.resolved_at && <span>Resolved: <strong className="text-gray-700">{format(parseISO(alert.resolved_at), 'HH:mm:ss')}</strong></span>}
                        {alert.lat && alert.lng && (
                          <a href={`https://maps.google.com/?q=${alert.lat},${alert.lng}`} target="_blank" rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline font-sans font-medium flex items-center gap-1 before:content-['•'] before:text-gray-300 before:no-underline">
                            View on map
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {tab === 'active' && (
                    <div className="flex gap-2 flex-shrink-0 w-full sm:w-auto mt-2 sm:mt-0 pt-3 sm:pt-0 border-t border-gray-100 sm:border-0">
                      {alert.status === 'triggered' && (
                        <button onClick={() => ack(alert.id)} disabled={acting === alert.id}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors font-medium border border-blue-200">
                          <Check size={16} /> Acknowledge
                        </button>
                      )}
                      {(alert.status === 'triggered' || alert.status === 'acknowledged') && (
                        <button onClick={() => resolve(alert.id)} disabled={acting === alert.id}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm bg-green-50 text-green-700 hover:bg-green-100 transition-colors font-medium border border-green-200">
                          <CheckCheck size={16} /> Mark Resolved
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
