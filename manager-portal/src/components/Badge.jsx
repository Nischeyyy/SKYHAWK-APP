const COLORS = {
  active:       'text-green-600',
  inactive:     'text-gray-500',
  submitted:    'text-yellow-700',
  open:         'text-blue-600',
  approved:     'text-green-600',
  rejected:     'text-red-600',
  pending:      'text-yellow-700',
  resolved:     'text-green-600',
  acknowledged: 'text-blue-600',
  triggered:    'text-red-600 animate-pulse',
  under_review: 'text-purple-600',
  paid:         'text-green-600',
  clocked_in:   'text-green-600',
  clocked_out:  'text-gray-500',
  admin:        'text-gray-900 font-semibold',
  employee:     'text-blue-600',
  expiring_soon:'text-orange-600',
  expired:      'text-red-600',
  valid:        'text-green-600',
  cancelled:    'text-gray-400',
};

export default function Badge({ status }) {
  const label = status?.replace(/_/g, ' ') || 'unknown';
  const cls = COLORS[status] || 'text-gray-500';
  return (
    <span className={`badge ${cls}`}>
      {label}
    </span>
  );
}
