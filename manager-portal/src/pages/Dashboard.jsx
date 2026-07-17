import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import StatCard from '../components/StatCard.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Badge from '../components/Badge.jsx';
import { Users, Calendar, Clock, FileText, DollarSign, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.dashboard().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-slate-400 text-sm">Loading dashboard…</div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={`Today — ${format(new Date(), 'EEEE, d MMMM yyyy')}`}
      />

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard label="Total Guards" value={data.total_guards} icon={Users} color="blue" onClick={() => navigate('/manager/guards')} />
        <StatCard label="Shifts Today" value={data.shifts_today} icon={Calendar} color="brand" onClick={() => navigate('/manager/shifts')} />
        <StatCard label="Clocked In" value={data.active_clocked} icon={Clock} color="green" onClick={() => navigate('/manager/timeclock')} />
        <StatCard label="Open Incidents" value={data.open_incidents} icon={FileText} color="purple" onClick={() => navigate('/manager/incidents')} />
        <StatCard label="Pending Payroll" value={data.pending_payroll} icon={DollarSign} color="brand" onClick={() => navigate('/manager/payroll')} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Live clocked-in guards */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <h2 className="font-semibold text-white">Currently Clocked In</h2>
            <span className="ml-auto text-xs text-slate-400">{data.active_entries?.length || 0} guards</span>
          </div>
          {!data.active_entries?.length ? (
            <p className="text-slate-500 text-sm py-6 text-center">No guards currently on duty</p>
          ) : (
            <div className="space-y-2">
              {data.active_entries.slice(0, 8).map(entry => (
                <div key={entry.id} className="flex items-center gap-3 bg-surface-700/50 rounded-lg px-3 py-2.5">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-semibold text-sm flex-shrink-0">
                    {(entry.user?.full_name || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{entry.user?.full_name || entry.user_id}</p>
                    <p className="text-xs text-slate-400 truncate">{entry.site?.name || 'Unknown site'}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-slate-400">Since</p>
                    <p className="text-xs text-white">{entry.clock_in ? format(new Date(entry.clock_in), 'HH:mm') : '—'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent incidents */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Recent Incidents</h2>
            <button onClick={() => navigate('/manager/incidents')} className="text-xs text-brand-400 hover:text-brand-300">
              View all →
            </button>
          </div>
          {!data.recent_incidents?.length ? (
            <p className="text-slate-500 text-sm py-6 text-center">No recent incidents</p>
          ) : (
            <div className="space-y-2">
              {data.recent_incidents.map(inc => (
                <div key={inc.id} className="flex items-start gap-3 bg-surface-700/50 rounded-lg px-3 py-2.5">
                  <FileText size={16} className="text-slate-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{inc.title || inc.type}</p>
                    <p className="text-xs text-slate-400">{inc.created_at ? format(new Date(inc.created_at), 'MMM d, HH:mm') : '—'}</p>
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
