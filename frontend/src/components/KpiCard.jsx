const KpiCard = ({ title, value, subtitle, icon: Icon, color = 'salazar' }) => {
  const colors = {
    salazar: 'bg-salazar-50 text-salazar-800',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
    blue: 'bg-blue-50 text-blue-700',
  };

  return (
    <div className="card flex items-start justify-between transition hover:shadow-lg">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="mt-2 text-3xl font-bold text-salazar-900">{value}</p>
        {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
      </div>
      {Icon && (
        <div className={`rounded-xl p-3 ${colors[color] || colors.salazar}`}>
          <Icon className="h-6 w-6" />
        </div>
      )}
    </div>
  );
};

export default KpiCard;
