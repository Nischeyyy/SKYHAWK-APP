import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAutoRefresh } from '../hooks/useAutoRefresh.js';
import StatCard from '../components/StatCard.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Badge from '../components/Badge.jsx';
import { Users, Calendar, Clock, FileText, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const d = await api.dashboard();
      setData(d);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useAutoRefresh(load, 30_000);

  if (loading) return <div className="text-gray-500 text-sm">Loading dashboard…</div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Overview"
        subtitle={`Today — ${format(new Date(), 'EEEE, d MMMM yyyy')}`}
      />

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard label="Total Guards" value={data.total_guards} onClick={() => navigate('/guards')} />
        <StatCard label="Shifts Today" value={data.shifts_today} onClick={() => navigate('/shifts')} />
        <StatCard label="Clocked In" value={data.active_clocked} onClick={() => navigate('/timeclock')} />
        <StatCard label="Open Incidents" value={data.open_incidents} onClick={() => navigate('/incidents')} />
        <StatCard label="Pending Payroll" value={data.pending_payroll} onClick={() => navigate('/payroll')} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Live clocked-in guards */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <h2 className="font-semibold text-gray-900">Currently Clocked In</h2>
            </div>
            <span className="text-xs text-gray-500">{data.active_entries?.length || 0} guards active</span>
          </div>
          {!data.active_entries?.length ? (
            <p className="text-gray-500 text-sm py-6 text-center">No guards currently on duty</p>
          ) : (
            <div className="space-y-3">
              {data.active_entries.slice(0, 8).map(entry => (
                <div key={entry.id} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-semibold text-sm flex-shrink-0">
                    {(entry.user?.full_name || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{entry.user?.full_name || entry.user_id}</p>
                    <p className="text-xs text-gray-500 truncate">{entry.site?.name || 'Unknown site'}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-400">Since</p>
                    <p className="text-sm font-medium text-gray-900">{entry.clock_in ? format(new Date(entry.clock_in), 'HH:mm') : '—'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent incidents */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-gray-900">Recent Incidents</h2>
            <button onClick={() => navigate('/incidents')} className="text-xs text-gray-500 hover:text-gray-900 font-medium uppercase tracking-wider">
              View All
            </button>
          </div>
          {!data.recent_incidents?.length ? (
            <p className="text-gray-500 text-sm py-6 text-center">No recent incidents</p>
          ) : (
            <div className="space-y-3">
              {data.recent_incidents.map(inc => (
                <div key={inc.id} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FileText size={16} className="text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{inc.title || inc.type}</p>
                    <p className="text-xs text-gray-500">{inc.created_at ? format(new Date(inc.created_at), 'MMM d, HH:mm') : '—'}</p>
                  </div>
                  <Badge status={inc.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
