export default function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {Icon && <Icon size={40} className="text-gray-400 mb-4" />}
      <p className="text-gray-600 font-medium">{title}</p>
      {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
    </div>
  );
}
