import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import { usePresentacion } from '../context/PresentacionContext';
import PageHeader from '../components/PageHeader';
import StatChip from '../components/StatChip';
import Pagination from '../components/Pagination';
import { formatDateTime } from '../utils/format';
import { toastSuccess, toastError } from '../utils/alerts';
import { Plus, Pencil, CheckCircle, X, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import RegistroScopeFilter from '../components/RegistroScopeFilter';

const AREAS = ['Operaciones', 'Almacén', 'Transporte', 'Atención al cliente', 'Administración', 'Otro'];
const FUENTES = ['Sistema web', 'Llamada telefónica', 'Correo electrónico', 'WhatsApp', 'Documento físico', 'Otro'];
const ESTADOS = [
  { value: '', label: 'Todos los estados' },
  { value: 'abierta', label: 'Abierta' },
  { value: 'en_revision', label: 'En revisión' },
  { value: 'resuelta', label: 'Resuelta' },
  { value: 'cerrada', label: 'Cerrada' },
];

const emptyCreateForm = {
  id_envio: '',
  tipo: 'observacion',
  severidad: 'media',
  area: '',
  fuente_principal: '',
  titulo: '',
  descripcion: '',
};

const estadoBadgeClass = {
  abierta: 'bg-red-100 text-red-800',
  en_revision: 'bg-amber-100 text-amber-800',
  resuelta: 'bg-green-100 text-green-800',
  cerrada: 'bg-slate-100 text-slate-600',
};

const IncidenciasPage = () => {
  const { presentacionActiva } = usePresentacion();
  const [data, setData] = useState({ data: [], total: 0, page: 1 });
  const [page, setPage] = useState(1);
  const [estadoFilter, setEstadoFilter] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');
  const [alcance, setAlcance] = useState('todos');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [envios, setEnvios] = useState([]);
  const [form, setForm] = useState(emptyCreateForm);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10, alcance };
      if (estadoFilter) params.estado = estadoFilter;
      if (tipoFilter) params.tipo = tipoFilter;
      const { data: res } = await api.get('/incidencias', { params });
      setData(res.data);
    } catch {
      toastError('Error', 'No se pudieron cargar las incidencias');
    } finally {
      setLoading(false);
    }
  }, [page, estadoFilter, tipoFilter, alcance, presentacionActiva]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.get('/envios', { params: { limit: 100 } }).then((r) => setEnvios(r.data.data?.data || []));
  }, [presentacionActiva]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/incidencias', form);
      toastSuccess('Incidencia registrada');
      setShowForm(false);
      setForm(emptyCreateForm);
      load();
    } catch (err) {
      toastError('Error', err.response?.data?.message || 'No se pudo registrar incidencia');
    }
  };

  const openEdit = (inc) => {
    setEditForm({
      id_incidencia: inc.id_incidencia,
      codigo_incidencia: inc.codigo_incidencia,
      id_envio: inc.id_envio,
      tipo: inc.tipo,
      severidad: inc.severidad,
      area: inc.area || '',
      fuente_principal: inc.fuente_principal || '',
      titulo: inc.titulo,
      descripcion: inc.descripcion,
      estado_incidencia: inc.estado_incidencia,
      resolucion: inc.resolucion || '',
    });
  };

  const openResolve = (inc) => {
    setEditForm({
      id_incidencia: inc.id_incidencia,
      codigo_incidencia: inc.codigo_incidencia,
      id_envio: inc.id_envio,
      tipo: inc.tipo,
      severidad: inc.severidad,
      area: inc.area || '',
      fuente_principal: inc.fuente_principal || '',
      titulo: inc.titulo,
      descripcion: inc.descripcion,
      estado_incidencia: 'resuelta',
      resolucion: '',
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (['resuelta', 'cerrada'].includes(editForm.estado_incidencia) && !editForm.resolucion?.trim()) {
      toastError('Resolución requerida', 'Indique cómo se resolvió la incidencia');
      return;
    }
    setSaving(true);
    try {
      const { id_incidencia, codigo_incidencia, ...payload } = editForm;
      await api.put(`/incidencias/${id_incidencia}`, payload);
      toastSuccess('Incidencia actualizada');
      setEditForm(null);
      load();
    } catch (err) {
      toastError('Error', err.response?.data?.message || 'No se pudo actualizar incidencia');
    } finally {
      setSaving(false);
    }
  };

  const isEditable = (estado) => !['cerrada'].includes(estado);

  return (
    <div className="page-shell">
      <PageHeader
        title="Gestión de incidencias"
        subtitle="Registro operativo — ficha dimensión 4 (PIOIC): información completa"
        compact
        action={
          <button type="button" className="btn-primary" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4" /> Nueva incidencia
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <StatChip label="Total incidencias" value={data.total ?? 0} />
        <StatChip label="En esta página" value={data.data?.length ?? 0} accent="salazar" />
        <StatChip label="Filtro estado" value={ESTADOS.find((s) => s.value === estadoFilter)?.label || 'Todos'} accent="amber" />
        <StatChip label="Filtro tipo" value={tipoFilter || 'Todos'} accent="slate" />
      </div>

      <div className="card-compact flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
        <select
          className="input-field w-auto min-w-[160px]"
          value={estadoFilter}
          onChange={(e) => {
            setEstadoFilter(e.target.value);
            setPage(1);
          }}
        >
          {ESTADOS.map((s) => (
            <option key={s.value || 'all'} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select
          className="input-field w-auto min-w-[140px]"
          value={tipoFilter}
          onChange={(e) => {
            setTipoFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Todos los tipos</option>
          <option value="error">Error</option>
          <option value="retraso">Retraso</option>
          <option value="dano">Daño</option>
          <option value="perdida">Pérdida</option>
          <option value="observacion">Observación</option>
          <option value="otro">Otro</option>
        </select>
        </div>
        <RegistroScopeFilter value={alcance} onChange={(v) => { setAlcance(v); setPage(1); }} />
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-3">
          <select
            className="input-field"
            value={form.id_envio}
            onChange={(e) => setForm((f) => ({ ...f, id_envio: e.target.value }))}
            required
          >
            <option value="">Envío relacionado *</option>
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
          <div className="grid gap-4 sm:grid-cols-2">
            <select
              className="input-field"
              value={form.area}
              onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
              required
            >
              <option value="">Área</option>
              {AREAS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <select
              className="input-field"
              value={form.fuente_principal}
              onChange={(e) => setForm((f) => ({ ...f, fuente_principal: e.target.value }))}
              required
            >
              <option value="">Fuente principal de información</option>
              {FUENTES.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
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
            placeholder="Observación / descripción detallada"
            value={form.descripcion}
            onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
            required
          />
          <p className="text-xs text-slate-500">
            Información completa (PIOIC): requiere tipo, área, fuente, título y descripción.
          </p>
          <button type="submit" className="btn-primary">
            Registrar
          </button>
        </form>
      )}

      {editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={handleUpdate} className="card max-h-[90vh] w-full max-w-lg overflow-y-auto space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Gestionar incidencia</h3>
                <p className="font-mono text-sm text-salazar-700">{editForm.codigo_incidencia}</p>
              </div>
              <button type="button" onClick={() => setEditForm(null)} aria-label="Cerrar">
                <X className="h-5 w-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <select
                className="input-field"
                value={editForm.tipo}
                onChange={(e) => setEditForm((f) => ({ ...f, tipo: e.target.value }))}
              >
                <option value="error">Error</option>
                <option value="retraso">Retraso</option>
                <option value="dano">Daño</option>
                <option value="perdida">Pérdida</option>
                <option value="observacion">Observación</option>
                <option value="otro">Otro</option>
              </select>
              <select
                className="input-field"
                value={editForm.severidad}
                onChange={(e) => setEditForm((f) => ({ ...f, severidad: e.target.value }))}
              >
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
                <option value="critica">Crítica</option>
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <select
                className="input-field"
                value={editForm.area}
                onChange={(e) => setEditForm((f) => ({ ...f, area: e.target.value }))}
                required
              >
                <option value="">Área</option>
                {AREAS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              <select
                className="input-field"
                value={editForm.fuente_principal}
                onChange={(e) => setEditForm((f) => ({ ...f, fuente_principal: e.target.value }))}
                required
              >
                <option value="">Fuente principal</option>
                {FUENTES.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <input
              className="input-field"
              placeholder="Título"
              value={editForm.titulo}
              onChange={(e) => setEditForm((f) => ({ ...f, titulo: e.target.value }))}
              required
            />
            <textarea
              className="input-field"
              rows={2}
              placeholder="Descripción"
              value={editForm.descripcion}
              onChange={(e) => setEditForm((f) => ({ ...f, descripcion: e.target.value }))}
              required
            />
            <select
              className="input-field"
              value={editForm.estado_incidencia}
              onChange={(e) => setEditForm((f) => ({ ...f, estado_incidencia: e.target.value }))}
            >
              <option value="abierta">Abierta</option>
              <option value="en_revision">En revisión</option>
              <option value="resuelta">Resuelta</option>
              <option value="cerrada">Cerrada</option>
            </select>
            {['resuelta', 'cerrada'].includes(editForm.estado_incidencia) && (
              <textarea
                className="input-field"
                rows={3}
                placeholder="Detalle de la resolución *"
                value={editForm.resolucion}
                onChange={(e) => setEditForm((f) => ({ ...f, resolucion: e.target.value }))}
                required
              />
            )}
            <div className="flex gap-3">
              <button type="submit" className="btn-primary flex-1" disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setEditForm(null)}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="table-panel">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-salazar-200 border-t-salazar-800" />
          </div>
        ) : (
        <div className="table-panel-body">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Código</th>
              <th className="px-4 py-3 text-left">Envío</th>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-left">Área</th>
              <th className="px-4 py-3 text-left">Info completa</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-left">Fecha</th>
              <th className="px-4 py-3 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {data.data?.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                  No hay incidencias{estadoFilter ? ' con ese estado' : ''}.
                </td>
              </tr>
            ) : (
              data.data?.map((inc) => (
                <tr key={inc.id_incidencia} className="border-t border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-salazar-800">{inc.codigo_incidencia || '—'}</td>
                  <td className="px-4 py-3 font-mono text-slate-600">
                    {inc.envio?.codigo_envio ? (
                      <Link
                        to={`/seguimiento/${inc.id_envio}`}
                        className="inline-flex items-center gap-1 text-salazar-700 hover:underline"
                      >
                        {inc.envio.codigo_envio}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 capitalize">{inc.tipo}</td>
                  <td className="px-4 py-3">{inc.area || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${inc.informacion_completa ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {inc.informacion_completa ? 'Sí' : 'No'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge capitalize ${estadoBadgeClass[inc.estado_incidencia] || ''}`}>
                      {inc.estado_incidencia?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">{formatDateTime(inc.fecha_reporte)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {isEditable(inc.estado_incidencia) && (
                        <>
                          <button
                            type="button"
                            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-salazar-800"
                            title="Editar"
                            onClick={() => openEdit(inc)}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          {['abierta', 'en_revision'].includes(inc.estado_incidencia) && (
                            <button
                              type="button"
                              className="rounded p-1 text-green-600 hover:bg-green-50"
                              title="Resolver"
                              onClick={() => openResolve(inc)}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                        </>
                      )}
                      {!isEditable(inc.estado_incidencia) && (
                        <span className="text-xs text-slate-400">Cerrada</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
        )}
        {!loading && (
          <div className="border-t border-slate-100 px-3 py-2 sm:px-4">
            <Pagination page={page} total={data.total} limit={10} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
};

export default IncidenciasPage;
