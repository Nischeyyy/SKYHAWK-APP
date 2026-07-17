import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import PageHeader from '../components/PageHeader.jsx';
import Badge from '../components/Badge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { ShieldCheck, AlertTriangle, Search } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';

function licenceStatus(expiry) {
  if (!expiry) return 'unknown';
  const days = differenceInDays(parseISO(expiry), new Date());
  if (days < 0) return 'expired';
  if (days <= 30) return 'expiring_soon';
  return 'valid';
}

export default function Compliance() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    // Compliance endpoint may return guards with compliance info, or we build from guards list
    Promise.all([api.guards()])
      .then(([gd]) => {
        const guards = gd.guards || [];
        setRecords(guards.map(g => ({
          ...g,
          licence_status: licenceStatus(g.licence_expiry),
        })));
        setLoading(false);
      })
      .catch(() => {
        // Fallback: try compliance endpoint
        api.compliance()
          .then(d => { setRecords(d.records || d.guards || []); setLoading(false); })
          .catch(() => setLoading(false));
      });
  }, []);

  const statusCount = records.reduce((acc, r) => {
    acc[r.licence_status] = (acc[r.licence_status] || 0) + 1;
    return acc;
  }, {});

  const filtered = records.filter(r => {
    const matchSearch = !search || `${r.full_name} ${r.email} ${r.licence_number}`.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || r.licence_status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div>
      <PageHeader title="Compliance" subtitle="Licence and certification status" />

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { key: 'valid', label: 'Valid', color: 'text-green-400 bg-green-500/10' },
          { key: 'expiring_soon', label: 'Expiring Soon', color: 'text-orange-400 bg-orange-500/10' },
          { key: 'expired', label: 'Expired', color: 'text-red-400 bg-red-500/10' },
          { key: 'unknown', label: 'No Licence', color: 'text-slate-400 bg-slate-500/10' },
        ].map(({ key, label, color }) => (
          <button key={key} onClick={() => setFilter(filter === key ? 'all' : key)}
            className={`card text-left transition-all ${filter === key ? 'ring-2 ring-brand-500' : 'hover:border-surface-600'}`}>
            <p className={`text-2xl font-bold ${color.split(' ')[0]}`}>{statusCount[key] || 0}</p>
            <p className="text-xs text-slate-400 mt-1">{label}</p>
          </button>
        ))}
      </div>

      <div className="relative mb-5">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-9" placeholder="Search guards…" />
      </div>

      {(statusCount.expired > 0 || statusCount.expiring_soon > 0) && (
        <div className="mb-5 bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-orange-400 flex-shrink-0" />
          <p className="text-orange-300 text-sm">
            <strong>{(statusCount.expired || 0) + (statusCount.expiring_soon || 0)}</strong> guards have expired or expiring licences requiring attention.
          </p>
        </div>
      )}

      {loading ? <div className="text-slate-400 text-sm">Loading…</div> : (
        !filtered.length ? <EmptyState icon={ShieldCheck} title="No records found" /> : (
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-700/50 border-b border-surface-700">
                  <tr>{['Guard', 'Licence #', 'Expiry', 'Days Until Expiry', 'Status', 'Certifications'].map(h => <th key={h} className="table-head">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-surface-700">
                  {filtered.map(r => {
                    const days = r.licence_expiry ? differenceInDays(parseISO(r.licence_expiry), new Date()) : null;
                    return (
                      <tr key={r.id} className="hover:bg-surface-700/30 transition-colors">
                        <td className="table-cell">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-semibold text-xs flex-shrink-0">
                              {(r.full_name || '?')[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="text-white text-sm font-medium">{r.full_name}</p>
                              <p className="text-slate-400 text-xs">{r.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="table-cell font-mono text-xs">{r.licence_number || '—'}</td>
                        <td className="table-cell text-xs">{r.licence_expiry ? format(parseISO(r.licence_expiry), 'MMM d, yyyy') : '—'}</td>
                        <td className="table-cell text-xs">
                          {days === null ? '—' : (
                            <span className={days < 0 ? 'text-red-400' : days <= 30 ? 'text-orange-400' : 'text-green-400'}>
                              {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`}
                            </span>
                          )}
                        </td>
                        <td className="table-cell"><Badge status={r.licence_status} /></td>
                        <td className="table-cell">
                          <div className="flex flex-wrap gap-1">
                            {(r.certifications || []).map((c, i) => (
                              <span key={i} className="badge bg-blue-500/15 text-blue-400">{c}</span>
                            ))}
                            {!(r.certifications?.length) && <span className="text-slate-500 text-xs">—</span>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
}
