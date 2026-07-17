export default function StatCard({ label, value, sub, icon: Icon, color = 'brand', onClick }) {
  const colors = {
    brand: 'bg-brand-500/10 text-brand-400',
    red:   'bg-red-500/10 text-red-400',
    green: 'bg-green-500/10 text-green-400',
    blue:  'bg-blue-500/10 text-blue-400',
    purple:'bg-purple-500/10 text-purple-400',
  };
  return (
    <div
      onClick={onClick}
      className={`card flex items-center gap-4 ${onClick ? 'cursor-pointer hover:border-brand-500/50 transition-colors' : ''}`}
    >
      {Icon && (
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
          <Icon size={22} />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-2xl font-bold text-white">{value ?? '—'}</p>
        <p className="text-sm text-slate-400 truncate">{label}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
