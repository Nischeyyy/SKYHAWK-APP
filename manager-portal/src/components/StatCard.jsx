import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

export default function StatCard({ label, value, sub, icon: Icon, color = 'brand', onClick, delta, deltaType = 'neutral' }) {
  return (
    <div
      onClick={onClick}
      className={`card flex flex-col justify-between ${onClick ? 'cursor-pointer hover:border-gray-300 transition-colors' : ''}`}
    >
      <div className="flex justify-between items-start mb-2">
        <p className="text-xs font-mono uppercase tracking-widest text-gray-500 truncate">{label}</p>
        {Icon && <Icon size={16} className="text-gray-400 flex-shrink-0" />}
      </div>
      <div>
        <p className="text-3xl font-bold text-gray-900">{value ?? '—'}</p>
        <div className="flex items-center gap-2 mt-2">
          {delta && (
            <span className={`flex items-center text-xs font-medium ${
              deltaType === 'positive' ? 'text-green-600' : deltaType === 'negative' ? 'text-red-600' : 'text-gray-500'
            }`}>
              {deltaType === 'positive' ? <ArrowUpRight size={14} className="mr-0.5" /> : deltaType === 'negative' ? <ArrowDownRight size={14} className="mr-0.5" /> : <Minus size={14} className="mr-0.5" />}
              {delta}
            </span>
          )}
          {sub && <p className="text-xs text-gray-500">{sub}</p>}
        </div>
      </div>
    </div>
  );
}
