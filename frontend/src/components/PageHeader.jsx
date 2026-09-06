const PageHeader = ({ title, subtitle, action, compact = false }) => (
  <div
    className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${
      compact ? 'mb-3' : 'mb-4'
    }`}
  >
    <div className="min-w-0">
      <h2 className="truncate text-xl font-bold text-salazar-900 sm:text-2xl">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">{subtitle}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

export default PageHeader;
