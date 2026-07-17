const COLORS = {
  active:       'bg-green-100 text-green-700',
  inactive:     'bg-gray-100 text-gray-600',
  submitted:    'bg-yellow-100 text-yellow-700',
  open:         'bg-blue-100 text-blue-700',
  approved:     'bg-green-100 text-green-700',
  rejected:     'bg-red-100 text-red-700',
  pending:      'bg-yellow-100 text-yellow-700',
  resolved:     'bg-green-100 text-green-700',
  acknowledged: 'bg-blue-100 text-blue-700',
  triggered:    'bg-red-100 text-red-700 animate-pulse',
  under_review: 'bg-purple-100 text-purple-700',
  paid:         'bg-green-100 text-green-700',
  clocked_in:   'bg-green-100 text-green-700',
  clocked_out:  'bg-gray-100 text-gray-600',
  admin:        'bg-gray-900 text-white',
  employee:     'bg-blue-100 text-blue-700',
  expiring_soon:'bg-orange-100 text-orange-700',
  expired:      'bg-red-100 text-red-700',
  valid:        'bg-green-100 text-green-700',
};

export default function Badge({ status }) {
  const label = status?.replace(/_/g, ' ') || 'unknown';
  const cls = COLORS[status] || 'bg-gray-100 text-gray-600';
  return (
    <span className={`badge ${cls}`}>
      {label}
    </span>
  );
}
