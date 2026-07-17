const COLORS = {
  active:       'bg-green-500/15 text-green-400',
  inactive:     'bg-slate-500/15 text-slate-400',
  submitted:    'bg-yellow-500/15 text-yellow-400',
  open:         'bg-blue-500/15 text-blue-400',
  approved:     'bg-green-500/15 text-green-400',
  rejected:     'bg-red-500/15 text-red-400',
  pending:      'bg-yellow-500/15 text-yellow-400',
  resolved:     'bg-green-500/15 text-green-400',
  acknowledged: 'bg-blue-500/15 text-blue-400',
  triggered:    'bg-red-500/15 text-red-400 animate-pulse',
  under_review: 'bg-purple-500/15 text-purple-400',
  paid:         'bg-green-500/15 text-green-400',
  clocked_in:   'bg-green-500/15 text-green-400',
  clocked_out:  'bg-slate-500/15 text-slate-400',
  admin:        'bg-brand-500/15 text-brand-400',
  employee:     'bg-blue-500/15 text-blue-400',
  expiring_soon:'bg-orange-500/15 text-orange-400',
  expired:      'bg-red-500/15 text-red-400',
  valid:        'bg-green-500/15 text-green-400',
};

export default function Badge({ status }) {
  const label = status?.replace(/_/g, ' ') || 'unknown';
  const cls = COLORS[status] || 'bg-slate-500/15 text-slate-400';
  return (
    <span className={`badge ${cls}`}>
      {label}
    </span>
  );
}
