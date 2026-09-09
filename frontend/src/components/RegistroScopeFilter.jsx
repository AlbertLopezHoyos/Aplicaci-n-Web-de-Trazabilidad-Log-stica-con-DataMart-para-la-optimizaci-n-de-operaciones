/** Toggle Todos los registros / Solo mis registros */
const RegistroScopeFilter = ({ value, onChange, className = '' }) => (
  <div className={`inline-flex rounded-lg border border-slate-200 p-0.5 text-xs ${className}`}>
    <button
      type="button"
      onClick={() => onChange('todos')}
      className={`rounded-md px-3 py-1.5 font-medium transition ${
        value === 'todos' ? 'bg-salazar-800 text-white' : 'text-slate-600 hover:bg-slate-50'
      }`}
    >
      Todos los registros
    </button>
    <button
      type="button"
      onClick={() => onChange('mios')}
      className={`rounded-md px-3 py-1.5 font-medium transition ${
        value === 'mios' ? 'bg-salazar-800 text-white' : 'text-slate-600 hover:bg-slate-50'
      }`}
    >
      Solo mis registros
    </button>
  </div>
);

export default RegistroScopeFilter;
