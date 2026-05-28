import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Eye, Pencil, Trash2 } from 'lucide-react';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';
import { formatDate } from '../utils/format';
import { confirmAction, toastSuccess, toastError } from '../utils/alerts';

const EnviosPage = () => {
  const [envios, setEnvios] = useState({ data: [], total: 0, page: 1, limit: 10 });
  const [estados, setEstados] = useState([]);
  const [filters, setFilters] = useState({ search: '', estado: '', page: 1 });

  const load = async () => {
    try {
      const { data } = await api.get('/envios', { params: { ...filters, limit: 10 } });
      setEnvios(data.data);
    } catch {
      toastError('Error', 'No se pudieron cargar los envíos');
    }
  };

  useEffect(() => {
    api.get('/catalogos/estados').then((r) => setEstados(r.data.data));
  }, []);

  useEffect(() => {
    load();
  }, [filters.page, filters.estado]);

  const handleSearch = (e) => {
    e.preventDefault();
    setFilters((f) => ({ ...f, page: 1 }));
    load();
  };

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
    <div>
      <PageHeader
        title="Gestión de envíos"
        subtitle="CRUD, filtros, búsqueda y paginación"
        action={
          <Link to="/envios/nuevo" className="btn-primary">
            <Plus className="h-4 w-4" /> Nuevo envío
          </Link>
        }
      />

      <div className="card mb-6">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input-field pl-10"
              placeholder="Buscar código, origen, destino, cliente..."
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
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
          <button type="submit" className="btn-primary">
            Buscar
          </button>
        </form>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Ruta</th>
                <th className="px-4 py-3">Carga</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {envios.data?.map((e) => (
                <tr key={e.id_envio} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-mono font-medium text-salazar-800">{e.codigo_envio}</td>
                  <td className="px-4 py-3">{e.cliente?.razon_social}</td>
                  <td className="px-4 py-3 text-xs">
                    {e.origen} → {e.destino}
                  </td>
                  <td className="px-4 py-3">
                    {e.tipo_carga}
                    <span className="block text-xs text-slate-400">{e.peso_kg} kg</span>
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
                      <button
                        type="button"
                        onClick={() => handleDelete(e.id_envio)}
                        className="rounded p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4">
          <Pagination
            page={envios.page}
            total={envios.total}
            limit={envios.limit}
            onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))}
          />
        </div>
      </div>
    </div>
  );
};

export default EnviosPage;
