const StatChip = ({ label, value, accent = 'salazar' }) => {
  const accents = {
    salazar: 'border-salazar-200 bg-salazar-50 text-salazar-800',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    red: 'border-red-200 bg-red-50 text-red-800',
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
  };

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${
        accents[accent] || accents.salazar
      }`}
    >
      <span className="text-xs font-medium opacity-80">{label}</span>
      <span className="text-sm font-bold tabular-nums">{value ?? '—'}</span>
    </div>
  );
};

export default StatChip;
