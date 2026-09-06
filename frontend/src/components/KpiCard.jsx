import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown } from 'lucide-react';

const themes = {
  salazar: {
    bar: 'bg-salazar-800',
    icon: 'bg-salazar-100 text-salazar-800 ring-salazar-200',
    value: 'text-salazar-900',
    wash: 'from-salazar-50/90 via-white to-white',
  },
  green: {
    bar: 'bg-emerald-600',
    icon: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
    value: 'text-emerald-900',
    wash: 'from-emerald-50/80 via-white to-white',
  },
  amber: {
    bar: 'bg-amber-500',
    icon: 'bg-amber-100 text-amber-700 ring-amber-200',
    value: 'text-amber-900',
    wash: 'from-amber-50/80 via-white to-white',
  },
  red: {
    bar: 'bg-red-500',
    icon: 'bg-red-100 text-red-700 ring-red-200',
    value: 'text-red-900',
    wash: 'from-red-50/80 via-white to-white',
  },
  blue: {
    bar: 'bg-blue-600',
    icon: 'bg-blue-100 text-blue-700 ring-blue-200',
    value: 'text-blue-900',
    wash: 'from-blue-50/80 via-white to-white',
  },
};

const KpiCard = ({ title, value, subtitle, hint, icon: Icon, color = 'salazar', to, trend }) => {
  const t = themes[color] || themes.salazar;

  const inner = (
    <>
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${t.wash}`}
        aria-hidden
      />
      <div className={`absolute left-0 top-0 h-full w-1 ${t.bar}`} aria-hidden />

      <div className="relative flex min-h-[88px] items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
          <p className={`mt-1 text-2xl font-bold tabular-nums sm:text-3xl ${t.value}`}>
            {value ?? '—'}
          </p>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          {hint && (
            <p className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-white/80 px-2 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-100">
              {trend === 'up' && <TrendingUp className="h-3 w-3 text-emerald-600" />}
              {trend === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
              {hint}
            </p>
          )}
        </div>
        {Icon && (
          <div className={`shrink-0 rounded-2xl p-3 ring-1 ${t.icon}`}>
            <Icon className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2} />
          </div>
        )}
      </div>
    </>
  );

  const className =
    'relative overflow-hidden rounded-xl border border-slate-100/80 bg-white p-4 shadow-card transition hover:shadow-lg hover:border-salazar-200/60';

  if (to) {
    return (
      <Link to={to} className={`${className} block`}>
        {inner}
      </Link>
    );
  }

  return <div className={className}>{inner}</div>;
};

export default KpiCard;
