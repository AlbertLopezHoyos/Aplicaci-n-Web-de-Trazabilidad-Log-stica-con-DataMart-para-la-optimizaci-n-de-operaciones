import { useEffect, useState } from 'react';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import { formatDateTime } from '../utils/format';
import { toastSuccess, toastError } from '../utils/alerts';
import { Plus } from 'lucide-react';

const IncidenciasPage = () => {
  const [data, setData] = useState({ data: [], total: 0, page: 1 });
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [envios, setEnvios] = useState([]);
  const [form, setForm] = useState({
    id_envio: '',
    tipo: 'observacion',
    severidad: 'media',
    titulo: '',
    descripcion: '',
  });

  const load = () => {
    api.get('/incidencias', { params: { page, limit: 10 } }).then((r) => setData(r.data.data));
  };

  useEffect(() => {
    load();
    api.get('/envios', { params: { limit: 100 } }).then((r) => setEnvios(r.data.data?.data || []));
  }, [page]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/incidencias', form);
      toastSuccess('Incidencia registrada');
      setShowForm(false);
      setForm({ id_envio: '', tipo: 'observacion', severidad: 'media', titulo: '', descripcion: '' });
      load();
    } catch {
      toastError('Error al registrar incidencia');
    }
  };

  const severidadClass = {
    baja: 'bg-slate-100 text-slate-600',
    media: 'bg-amber-100 text-amber-800',
    alta: 'bg-orange-100 text-orange-800',
    critica: 'bg-red-100 text-red-800',
  };

  return (
    <div>
      <PageHeader
        title="Gestión de incidencias"
        subtitle="Errores, retrasos y observaciones operativas"
        action={
          <button type="button" className="btn-primary" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4" /> Nueva incidencia
          </button>
        }
      />

      {showForm && (
        <form onSubmit={handleSubmit} className="card mb-6 space-y-4">
          <select
            className="input-field"
            value={form.id_envio}
            onChange={(e) => setForm((f) => ({ ...f, id_envio: e.target.value }))}
            required
          >
            <option value="">Envío relacionado</option>
            {envios.map((e) => (
              <option key={e.id_envio} value={e.id_envio}>
                {e.codigo_envio}
              </option>
            ))}
          </select>
          <div className="grid gap-4 sm:grid-cols-2">
            <select className="input-field" value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}>
              <option value="error">Error</option>
              <option value="retraso">Retraso</option>
              <option value="dano">Daño</option>
              <option value="perdida">Pérdida</option>
              <option value="observacion">Observación</option>
              <option value="otro">Otro</option>
            </select>
            <select className="input-field" value={form.severidad} onChange={(e) => setForm((f) => ({ ...f, severidad: e.target.value }))}>
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
              <option value="critica">Crítica</option>
            </select>
          </div>
          <input
            className="input-field"
            placeholder="Título"
            value={form.titulo}
            onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
            required
          />
          <textarea
            className="input-field"
            rows={3}
            placeholder="Descripción detallada"
            value={form.descripcion}
            onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
            required
          />
          <button type="submit" className="btn-primary">
            Registrar
          </button>
        </form>
      )}

      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Envío</th>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-left">Título</th>
              <th className="px-4 py-3 text-left">Severidad</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-left">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {data.data?.map((inc) => (
              <tr key={inc.id_incidencia} className="border-t border-slate-50 hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-salazar-800">{inc.envio?.codigo_envio}</td>
                <td className="px-4 py-3 capitalize">{inc.tipo}</td>
                <td className="px-4 py-3">{inc.titulo}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${severidadClass[inc.severidad]}`}>{inc.severidad}</span>
                </td>
                <td className="px-4 py-3 capitalize">{inc.estado_incidencia?.replace('_', ' ')}</td>
                <td className="px-4 py-3">{formatDateTime(inc.fecha_reporte)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-4">
          <Pagination page={page} total={data.total} limit={10} onPageChange={setPage} />
        </div>
      </div>
    </div>
  );
};

export default IncidenciasPage;
