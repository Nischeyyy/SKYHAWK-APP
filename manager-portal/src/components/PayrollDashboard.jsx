import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Clock, DollarSign, AlertTriangle } from 'lucide-react';

const PIE_COLORS = ['#111827', '#4B5563', '#9CA3AF', '#D1D5DB', '#F3F4F6', '#374151'];
const STATUS_COLORS = {
  submitted: '#F59E0B', under_review: '#3B82F6', approved: '#8B5CF6',
  paid: '#10B981', released: '#6B7280', cancelled: '#EF4444',
};
const PAID_VIA_LABELS = {
  direct_deposit: 'Direct Deposit', cheque: 'Cheque',
  cash: 'Cash', interac: 'Interac', '': 'Unset',
};

function calc(e) {
  const hrs   = e.hours_regular ?? e.hours_worked ?? 0;
  const rate  = e.pay_rate ?? e.hourly_rate ?? 0;
  const gross = e.gross ?? e.gross_pay ?? (hrs * rate);
  const ded   = e.total_deductions ?? (e.deductions || []).reduce((s, d) => s + (d.amount || 0), 0);
  const net   = e.net ?? (gross - ded);
  return { hrs, rate, gross, ded, net };
}

export default function PayrollDashboard({ entries, guardMap, anomalyCount }) {
  if (!entries.length) return null;

  // Stats
  const totalGross = entries.reduce((s, e) => s + calc(e).gross, 0);
  const totalNet   = entries.reduce((s, e) => s + calc(e).net, 0);
  const totalHours = entries.reduce((s, e) => s + (e.hours_regular ?? e.hours_worked ?? 0), 0);

  // Gross by guard (top 10)
  const byGuardMap = {};
  entries.forEach(e => {
    const name = guardMap[e.user_id]?.full_name || e.user_name || 'Unknown';
    const short = name.split(' ')[0];
    byGuardMap[short] = (byGuardMap[short] || 0) + calc(e).gross;
  });
  const byGuard = Object.entries(byGuardMap)
    .sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([name, gross]) => ({ name, gross: +gross.toFixed(2) }));

  // Paid-via breakdown
  const byViaMap = {};
  entries.forEach(e => { const k = e.paid_via || ''; byViaMap[k] = (byViaMap[k] || 0) + 1; });
  const byVia = Object.entries(byViaMap).map(([k, v]) => ({ name: PAID_VIA_LABELS[k] || k, value: v }));

  // Status breakdown
  const byStatusMap = {};
  entries.forEach(e => { byStatusMap[e.status] = (byStatusMap[e.status] || 0) + 1; });
  const byStatus = Object.entries(byStatusMap).map(([k, v]) => ({ name: k.replace(/_/g, ' '), value: v, color: STATUS_COLORS[k] || '#9CA3AF' }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg">
        <p className="font-semibold">{label}</p>
        <p>${payload[0].value}</p>
      </div>
    );
  };

  return (
    <div className="mb-6">
      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { icon: DollarSign, label: 'Total Gross',  value: `$${totalGross.toFixed(2)}`, bg: 'bg-green-50',  ic: 'text-green-600' },
          { icon: DollarSign, label: 'Total Net',    value: `$${totalNet.toFixed(2)}`,   bg: 'bg-blue-50',   ic: 'text-blue-600' },
          { icon: Clock,      label: 'Total Hours',  value: `${totalHours.toFixed(1)}h`, bg: 'bg-purple-50', ic: 'text-purple-600' },
          { icon: AlertTriangle, label: 'Anomalies', value: anomalyCount,               bg: anomalyCount > 0 ? 'bg-amber-50' : 'bg-gray-50', ic: anomalyCount > 0 ? 'text-amber-600' : 'text-gray-400' },
        ].map(s => (
          <div key={s.label} className="card p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.bg}`}>
              <s.icon size={17} className={s.ic} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">{s.label}</p>
              <p className="text-gray-900 font-bold text-xl leading-tight">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-3 gap-4">
        {/* Bar: gross by guard */}
        <div className="col-span-2 card p-4">
          <p className="text-sm font-semibold text-gray-700 mb-4">Gross Pay by Guard</p>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={byGuard} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="gross" fill="#111827" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Right panel: pie + status */}
        <div className="card p-4 space-y-5">
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Paid Via</p>
            {byVia.length > 0 ? (
              <ResponsiveContainer width="100%" height={110}>
                <PieChart>
                  <Pie data={byVia} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={42} innerRadius={22}>
                    {byVia.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-xs text-gray-400">No data</p>}
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">By Status</p>
            <div className="space-y-1.5">
              {byStatus.map(s => (
                <div key={s.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-xs text-gray-600 capitalize">{s.name}</span>
                  </div>
                  <span className="text-xs font-bold text-gray-900">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
