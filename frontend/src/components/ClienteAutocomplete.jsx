import { useEffect, useState } from 'react';
import { Search, Loader2, UserCheck, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { labelCliente } from '../utils/cliente';

const SEARCH_LIMIT = 12;
const DEBOUNCE_MS = 400;

/** Mínimo de caracteres: 3 para texto, 2 si parece DNI numérico */
const minCharsForQuery = (q) => (/^\d+$/.test(q) ? 2 : 3);

const ClienteAutocomplete = ({ selected, onSelect, onClear, disabled = false }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    if (disabled || selected) return undefined;
    const q = query.trim();
    const min = minCharsForQuery(q);
    if (q.length < min) {
      setResults([]);
      setTruncated(false);
      return undefined;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/catalogos/clientes', {
          params: { search: q, limit: SEARCH_LIMIT },
        });
        const payload = data.data;
        const list = Array.isArray(payload) ? payload : payload?.data || [];
        setResults(list);
        setTruncated(Array.isArray(payload) ? list.length >= SEARCH_LIMIT : payload?.total > list.length);
      } catch {
        setResults([]);
        setTruncated(false);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, selected, disabled]);

  const min = minCharsForQuery(query.trim());

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2 text-sm text-emerald-900">
          <UserCheck className="h-4 w-4 shrink-0" />
          <div className="min-w-0">
            <span className="block truncate font-medium">{labelCliente(selected)}</span>
            {selected.dni && <span className="font-mono text-xs text-emerald-700">DNI {selected.dni}</span>}
          </div>
        </div>
        {!disabled && (
          <button
            type="button"
            className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
            onClick={onClear}
          >
            Cambiar
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="input-field pl-9"
          placeholder="DNI o nombre (mín. 2 dígitos / 3 letras)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          disabled={disabled}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
        )}
      </div>

      {query.trim().length > 0 && query.trim().length < min && (
        <p className="flex items-center gap-1 text-xs text-slate-500">
          <AlertCircle className="h-3.5 w-3.5" />
          Escriba al menos {min} caracteres para buscar entre miles de clientes.
        </p>
      )}

      {query.trim().length >= min && (
        <ul className="max-h-52 overflow-y-auto rounded-lg border border-slate-100 bg-white shadow-sm">
          {results.length === 0 && !loading && (
            <li className="px-3 py-3 text-sm text-slate-500">No se encontraron clientes con ese criterio.</li>
          )}
          {results.map((c) => (
            <li key={c.id_cliente}>
              <button
                type="button"
                className="flex w-full flex-col border-b border-slate-50 px-3 py-2.5 text-left text-sm last:border-0 hover:bg-salazar-50"
                onClick={() => {
                  onSelect(c);
                  setQuery('');
                  setResults([]);
                }}
              >
                <span className="font-medium text-slate-800">{c.nombre_completo || c.razon_social}</span>
                {c.dni && <span className="font-mono text-xs text-slate-500">DNI {c.dni}</span>}
              </button>
            </li>
          ))}
          {truncated && results.length > 0 && (
            <li className="bg-slate-50 px-3 py-2 text-center text-[11px] text-slate-500">
              Mostrando {results.length} coincidencias — refine DNI o nombre para acotar.
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

export default ClienteAutocomplete;
