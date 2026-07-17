import { X, FileText, CheckSquare, BarChart2, AlertTriangle, RefreshCw, Calendar, MessageSquare } from 'lucide-react';

export const FEATURE_DEFS = [
  {
    id: 'paystub',
    icon: FileText,
    title: 'Pay Stub Generation',
    desc: 'Download a PDF pay stub per entry directly from the table. Email delivery requires SendGrid to be configured.',
    color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200',
  },
  {
    id: 'bulk',
    icon: CheckSquare,
    title: 'Bulk Status Actions',
    desc: 'Select multiple rows and approve, mark paid, or export them all at once.',
    color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200',
  },
  {
    id: 'dashboard',
    icon: BarChart2,
    title: 'Payroll Summary Dashboard',
    desc: 'Charts panel showing gross by guard, paid-via breakdown, and status distribution.',
    color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200',
  },
  {
    id: 'anomaly',
    icon: AlertTriangle,
    title: 'Anomaly Flags',
    desc: 'Highlights rows with zero hours, $0 rate, or gross amounts far outside the guard\'s average.',
    color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200',
  },
  {
    id: 'recurring',
    icon: RefreshCw,
    title: 'Recurring Schedules',
    desc: 'Set a weekly or biweekly pay cadence per guard so entries auto-generate on schedule.',
    color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200',
  },
  {
    id: 'overlap',
    icon: Calendar,
    title: 'Period Overlap Detection',
    desc: 'Warns when two payroll entries for the same guard cover overlapping date ranges.',
    color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200',
  },
  {
    id: 'comments',
    icon: MessageSquare,
    title: 'Approval Workflow & Comments',
    desc: 'Leave timestamped notes when changing status, creating a full audit trail per entry.',
    color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200',
  },
];

export const DEFAULT_FEATURES = Object.fromEntries(FEATURE_DEFS.map(f => [f.id, false]));

export function loadFeatures() {
  try {
    const stored = localStorage.getItem('payroll_features');
    return stored ? { ...DEFAULT_FEATURES, ...JSON.parse(stored) } : DEFAULT_FEATURES;
  } catch { return DEFAULT_FEATURES; }
}

export function saveFeatures(f) {
  localStorage.setItem('payroll_features', JSON.stringify(f));
}

export default function PayrollFeaturePanel({ features, onToggle, onClose }) {
  const enabledCount = Object.values(features).filter(Boolean).length;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-[420px] bg-white h-full shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">Payroll Features</h2>
            <p className="text-xs text-gray-400 mt-0.5">{enabledCount} of {FEATURE_DEFS.length} features active</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Feature list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {FEATURE_DEFS.map(f => {
            const Icon = f.icon;
            const on = features[f.id];
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onToggle(f.id)}
                className={`w-full text-left flex items-start gap-4 p-4 rounded-xl border-2 transition-all ${
                  on ? 'border-gray-900 bg-gray-50 shadow-sm' : `border-gray-100 hover:${f.border} bg-white`
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${on ? 'bg-gray-900' : f.bg}`}>
                  <Icon size={18} className={on ? 'text-white' : f.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-gray-900 text-sm">{f.title}</span>
                    {/* Toggle pill */}
                    <div className={`w-11 h-6 rounded-full flex-shrink-0 relative transition-colors ${on ? 'bg-gray-900' : 'bg-gray-200'}`}>
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${on ? 'left-6' : 'left-1'}`} />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">{f.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 text-center">
          <p className="text-xs text-gray-400">Settings persist across sessions automatically.</p>
        </div>
      </div>
    </div>
  );
}
