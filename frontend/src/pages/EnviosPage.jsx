import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Eye, Pencil, Trash2 } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { usePresentacion } from '../context/PresentacionContext';
import PageHeader from '../components/PageHeader';
import StatChip from '../components/StatChip';
import StatusBadge from '../components/StatusBadge';
import { labelCliente } from '../utils/cliente';
import Pagination from '../components/Pagination';
import { formatDate } from '../utils/format';
import RegistroScopeFilter from '../components/RegistroScopeFilter';
import { confirmAction, toastSuccess, toastError } from '../utils/alerts';

const EnviosPage = () => {
  const { isAdmin } = useAuth();
  const { presentacionActiva } = usePresentacion();
  const [envios, setEnvios] = useState({ data: [], total: 0, page: 1, limit: 10 });
  const [estados, setEstados] = useState([]);
  const [filters, setFilters] = useState({ search: '', estado: '', fechaDesde: '', fechaHasta: '', page: 1, alcance: 'todos' });
  const [searchInput, setSearchInput] = useState('');
  const [fechaDesdeInput, setFechaDesdeInput] = useState('');
  const [fechaHastaInput, setFechaHastaInput] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/envios', { params: { ...filters, limit: 10 } });
      setEnvios(data.data);
    } catch {
      toastError('Error', 'No se pudieron cargar los envíos');
    } finally {
      setLoading(false);
    }
  }, [filters, presentacionActiva]);

  useEffect(() => {
    api.get('/catalogos/estados').then((r) => setEstados(r.data.data));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSearch = (e) => {
    e.preventDefault();
    setFilters((f) => ({
      ...f,
      search: searchInput.trim(),
      fechaDesde: fechaDesdeInput,
      fechaHasta: fechaHastaInput,
      page: 1,
    }));
  };

  const clearFilters = () => {
    setSearchInput('');
    setFechaDesdeInput('');
    setFechaHastaInput('');
    setFilters({ search: '', estado: '', fechaDesde: '', fechaHasta: '', page: 1, alcance: filters.alcance });
  };

  const hasActiveFilters = filters.search || filters.estado || filters.fechaDesde || filters.fechaHasta;

  const handleDelete = async (id) => {
    if (!(await confirmAction('¿Eliminar envío?', 'Se marcará como inactivo'))) return;
    try {
      await api.delete(`/envios/${id}`);
      toastSuccess('Envío eliminado');
      load();
    } catch {
      toastError('Error al eliminar');
    }
  };

  return (
    <div className="page-shell">
      <PageHeader
        title="Gestión de envíos"
        subtitle="CRUD, filtros, búsqueda y paginación"
        compact
        action={
          <Link to="/envios/nuevo" className="btn-primary">
            <Plus className="h-4 w-4" /> Nuevo envío
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <StatChip label="Total registros" value={envios.total ?? 0} />
        <StatChip label="Página actual" value={`${envios.page ?? 1} / ${Math.max(1, Math.ceil((envios.total || 0) / (envios.limit || 10)))}`} accent="slate" />
        <StatChip label="Mostrando" value={envios.data?.length ?? 0} accent="salazar" />
        <StatChip label="Estado filtro" value={filters.estado ? estados.find((s) => String(s.id_estado) === filters.estado)?.nombre || '—' : 'Todos'} accent="amber" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <RegistroScopeFilter
          value={filters.alcance}
          onChange={(alcance) => setFilters((f) => ({ ...f, alcance, page: 1 }))}
        />
      </div>

      <div className="card-compact">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input-field pl-10"
              placeholder={presentacionActiva ? 'Buscar código, origen, destino, alias...' : 'Buscar código, origen, destino, cliente...'}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <select
            className="input-field w-auto min-w-[160px]"
            value={filters.estado}
            onChange={(e) => setFilters((f) => ({ ...f, estado: e.target.value, page: 1 }))}
          >
            <option value="">Todos los estados</option>
            {estados.map((s) => (
              <option key={s.id_estado} value={s.id_estado}>
                {s.nombre}
              </option>
            ))}
          </select>
          <input
            type="date"
            className="input-field w-auto"
            value={fechaDesdeInput}
            onChange={(e) => setFechaDesdeInput(e.target.value)}
            title="Desde"
          />
          <input
            type="date"
            className="input-field w-auto"
            value={fechaHastaInput}
            onChange={(e) => setFechaHastaInput(e.target.value)}
            title="Hasta"
          />
          <button type="submit" className="btn-primary">
            Buscar
          </button>
          {hasActiveFilters && (
            <button type="button" className="btn-secondary" onClick={clearFilters}>
              Limpiar
            </button>
          )}
        </form>
      </div>

      <div className="table-panel">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-salazar-200 border-t-salazar-800" />
          </div>
        ) : (
          <>
            <div className="table-panel-body">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Código</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Ruta</th>
                    <th className="px-4 py-3">Carga</th>
                    <th className="px-4 py-3">Tiempo reg.</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {envios.data?.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                        No hay envíos registrados.{' '}
                        <Link to="/envios/nuevo" className="text-salazar-700 underline">
                          Crear el primero
                        </Link>
                      </td>
                    </tr>
                  )}
                  {envios.data?.map((e) => (
                    <tr key={e.id_envio} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono font-medium text-salazar-800">{e.codigo_envio}</td>
                      <td className="px-4 py-3">{labelCliente(e.cliente)}</td>
                      <td className="px-4 py-3 text-xs">
                        {e.origen} → {e.destino}
                      </td>
                      <td className="px-4 py-3">
                        {e.tipo_carga}
                        <span className="block text-xs text-slate-400">{e.peso_kg} kg · {e.numero_paquetes ?? 1} paq.</span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {e.tiempo_registro_min != null ? `${e.tiempo_registro_min} min` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge estado={e.estadoActual} />
                      </td>
                      <td className="px-4 py-3">{formatDate(e.fecha_registro)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Link
                            to={`/seguimiento/${e.id_envio}`}
                            className="rounded p-2 text-slate-500 hover:bg-salazar-50 hover:text-salazar-800"
                            title="Seguimiento"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <Link
                            to={`/envios/${e.id_envio}/editar`}
                            className="rounded p-2 text-slate-500 hover:bg-slate-100"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDelete(e.id_envio)}
                              className="rounded p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-slate-100 px-3 py-2 sm:px-4">
              <Pagination
                page={envios.page}
                total={envios.total}
                limit={envios.limit}
                onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EnviosPage;
