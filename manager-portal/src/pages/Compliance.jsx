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
          { key: 'valid', label: 'Valid', color: 'text-green-700 bg-green-50 border-green-200 ring-green-500' },
          { key: 'expiring_soon', label: 'Expiring Soon', color: 'text-orange-700 bg-orange-50 border-orange-200 ring-orange-500' },
          { key: 'expired', label: 'Expired', color: 'text-red-700 bg-red-50 border-red-200 ring-red-500' },
          { key: 'unknown', label: 'No Licence', color: 'text-gray-700 bg-gray-50 border-gray-200 ring-gray-900' },
        ].map(({ key, label, color }) => (
          <button key={key} onClick={() => setFilter(filter === key ? 'all' : key)}
            className={`card text-left transition-all border ${filter === key ? `ring-2 ${color.split(' ')[2]}` : 'hover:shadow-md'}`}>
            <div className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg font-mono text-xl font-bold mb-2 ${color.split(' ')[0]} ${color.split(' ')[1]}`}>
              {statusCount[key] || 0}
            </div>
            <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">{label}</p>
          </button>
        ))}
      </div>

      <div className="relative mb-5 w-80">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-9 rounded-full shadow-sm" placeholder="Search guards…" />
      </div>

      {(statusCount.expired > 0 || statusCount.expiring_soon > 0) && (
        <div className="mb-6 bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
             <AlertTriangle size={20} className="text-orange-600" />
          </div>
          <div>
            <p className="text-orange-900 text-sm font-medium">
              <strong>{(statusCount.expired || 0) + (statusCount.expiring_soon || 0)}</strong> guards have expired or expiring licences requiring attention.
            </p>
          </div>
        </div>
      )}

      {loading ? <div className="text-gray-400 text-sm">Loading…</div> : (
        !filtered.length ? <EmptyState icon={ShieldCheck} title="No records found" /> : (
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>{['Guard', 'Licence #', 'Expiry', 'Days Until Expiry', 'Status', 'Certifications'].map(h => <th key={h} className="table-head">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(r => {
                    const days = r.licence_expiry ? differenceInDays(parseISO(r.licence_expiry), new Date()) : null;
                    return (
                      <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="table-cell">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-semibold text-sm flex-shrink-0 border border-gray-200">
                              {(r.full_name || '?')[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="text-gray-900 text-sm font-medium">{r.full_name}</p>
                              <p className="text-gray-500 text-xs">{r.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="table-cell font-mono text-xs text-gray-600 font-medium">{r.licence_number || '—'}</td>
                        <td className="table-cell text-xs text-gray-600">{r.licence_expiry ? format(parseISO(r.licence_expiry), 'MMM d, yyyy') : '—'}</td>
                        <td className="table-cell text-xs font-medium">
                          {days === null ? '—' : (
                            <span className={days < 0 ? 'text-red-600' : days <= 30 ? 'text-orange-600' : 'text-green-600'}>
                              {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`}
                            </span>
                          )}
                        </td>
                        <td className="table-cell"><Badge status={r.licence_status} /></td>
                        <td className="table-cell">
                          <div className="flex flex-wrap gap-2">
                            {(r.certifications || []).map((c, i) => (
                              <span key={i} className="badge bg-blue-50 text-blue-700 border border-blue-200">{c}</span>
                            ))}
                            {!(r.certifications?.length) && <span className="text-gray-400 text-xs italic">None</span>}
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
