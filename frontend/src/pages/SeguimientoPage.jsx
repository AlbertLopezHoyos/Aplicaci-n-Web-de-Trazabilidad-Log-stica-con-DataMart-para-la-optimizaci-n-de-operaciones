import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { usePresentacion } from '../context/PresentacionContext';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import { labelCliente } from '../utils/cliente';
import Timeline from '../components/Timeline';
import { toastSuccess, toastError, confirmAction } from '../utils/alerts';
import { Upload, MapPin, Search, Trash2, Loader2, Download } from 'lucide-react';
import RegistroScopeFilter from '../components/RegistroScopeFilter';
import { descargarComprobanteEnvio } from '../utils/comprobanteEnvioPdf';
import { formatCurrency } from '../utils/format';

const SeguimientoPage = () => {
  const { id: paramId } = useParams();
  const { presentacionActiva } = usePresentacion();
  const navigate = useNavigate();
  const [recentEnvios, setRecentEnvios] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedId, setSelectedId] = useState(paramId || '');
  const [envio, setEnvio] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [loadingEnvio, setLoadingEnvio] = useState(false);
  const [estados, setEstados] = useState([]);
  const [evidencias, setEvidencias] = useState([]);
  const [estadoForm, setEstadoForm] = useState({ id_estado: '', ubicacion: '', comentario: '' });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [alcance, setAlcance] = useState('todos');

  useEffect(() => {
    api.get('/envios', { params: { limit: 10, page: 1, alcance } }).then((r) => setRecentEnvios(r.data.data?.data || []));
    api.get('/catalogos/estados').then((r) => setEstados(r.data.data));
  }, [presentacionActiva, alcance]);

  useEffect(() => {
    setSelectedId(paramId || '');
  }, [paramId]);

  const loadEnvio = useCallback(async (id) => {
    if (!id) {
      setEnvio(null);
      setEvidencias([]);
      setLoadError(false);
      return;
    }
    setLoadingEnvio(true);
    setLoadError(false);
    try {
      const [envRes, evRes] = await Promise.all([
        api.get(`/envios/${id}`),
        api.get(`/evidencias/envio/${id}`),
      ]);
      setEnvio(envRes.data.data);
      setEvidencias(evRes.data.data || []);
    } catch {
      setEnvio(null);
      setLoadError(true);
    } finally {
      setLoadingEnvio(false);
    }
  }, []);

  useEffect(() => {
    loadEnvio(selectedId);
  }, [selectedId, presentacionActiva, loadEnvio]);

  useEffect(() => {
    const q = searchInput.trim();
    if (!q) {
      setSearchResults([]);
      return undefined;
    }
    const timer = setTimeout(() => {
      setSearching(true);
      api
        .get('/envios', { params: { search: q, limit: 15, alcance } })
        .then((r) => setSearchResults(r.data.data?.data || []))
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput, presentacionActiva, alcance]);

  const selectEnvio = (id) => {
    setSelectedId(String(id));
    setSearchInput('');
    setSearchResults([]);
    navigate(`/seguimiento/${id}`, { replace: true });
  };

  const handleEstado = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/envios/${selectedId}/estado`, estadoForm);
      toastSuccess('Estado actualizado');
      await loadEnvio(selectedId);
      setEstadoForm({ id_estado: '', ubicacion: '', comentario: '' });
    } catch (err) {
      toastError('Error', err.response?.data?.message);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !selectedId) return;
    if (file.size > 5 * 1024 * 1024) {
      toastError('Archivo muy grande', 'Máximo 5 MB');
      return;
    }
    const fd = new FormData();
    fd.append('archivo', file);
    fd.append('id_envio', selectedId);
    setUploading(true);
    try {
      await api.post('/evidencias/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toastSuccess('Evidencia subida');
      const { data } = await api.get(`/evidencias/envio/${selectedId}`);
      setEvidencias(data.data);
      setFile(null);
    } catch {
      toastError('Error al subir archivo');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteEvidencia = async (id) => {
    if (!(await confirmAction('¿Eliminar evidencia?', 'Se quitará el archivo del envío'))) return;
    try {
      await api.delete(`/evidencias/${id}`);
      toastSuccess('Evidencia eliminada');
      const { data } = await api.get(`/evidencias/envio/${selectedId}`);
      setEvidencias(data.data);
    } catch {
      toastError('No se pudo eliminar');
    }
  };

  const resultList = searchInput.trim() ? searchResults : recentEnvios;

  return (
    <div className="page-shell">
      <PageHeader
        title="Seguimiento logístico"
        subtitle="Actualización de estados y línea de tiempo del envío"
        compact
        action={<RegistroScopeFilter value={alcance} onChange={setAlcance} />}
      />

      <div className="grid gap-3 xl:grid-cols-12">
        <div className="card-compact space-y-3 xl:col-span-4">
          <label className="block text-sm font-medium">Buscar envío</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input-field pl-10"
              placeholder={presentacionActiva ? 'Código, alias, origen o destino...' : 'Código, cliente, origen o destino...'}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
            )}
          </div>
          <div>
            <p className="mb-2 text-xs text-slate-500">
              {searchInput.trim() ? 'Resultados de búsqueda' : 'Envíos recientes'}
            </p>
            <ul className="max-h-[calc(100vh-20rem)] min-h-[200px] overflow-y-auto rounded-lg border border-slate-100">
            {resultList.length === 0 && (
              <li className="px-4 py-3 text-sm text-slate-500">No se encontraron envíos.</li>
            )}
            {resultList.map((e) => (
              <li key={e.id_envio}>
                <button
                  type="button"
                  onClick={() => selectEnvio(e.id_envio)}
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition hover:bg-salazar-50 ${
                    String(selectedId) === String(e.id_envio) ? 'bg-salazar-50 font-medium text-salazar-900' : ''
                  }`}
                >
                  <span className="font-mono">{e.codigo_envio}</span>
                  <span className="truncate pl-2 text-xs text-slate-500">{labelCliente(e.cliente)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        </div>

        <div className="xl:col-span-8">
      {loadingEnvio && (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-salazar-200 border-t-salazar-800" />
        </div>
      )}

      {loadError && !loadingEnvio && (
        <div className="card-compact border-amber-200 bg-amber-50 text-sm text-amber-800">
          No se encontró el envío seleccionado.{' '}
          <Link to="/seguimiento" className="font-medium underline" onClick={() => setSelectedId('')}>
            Volver al listado
          </Link>
        </div>
      )}

      {!envio && !loadingEnvio && !loadError && (
        <div className="card flex min-h-[360px] flex-col items-center justify-center text-center text-slate-500 lg:min-h-[calc(100vh-14rem)]">
          <MapPin className="mb-3 h-10 w-10 text-salazar-200" />
          <p className="font-medium text-salazar-900">Seleccione un envío</p>
          <p className="mt-1 max-w-sm text-sm">Use el buscador o el listado lateral para ver detalle, timeline y evidencias.</p>
        </div>
      )}

      {envio && !loadingEnvio && (
        <div className="grid gap-3 lg:grid-cols-5">
          <div className="space-y-3 lg:col-span-3">
            <div className="card">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-lg font-bold text-salazar-800">{envio.codigo_envio}</p>
                  <p className="text-sm text-slate-500">Envía: {labelCliente(envio.cliente)}</p>
                  {envio.nombre_destinatario && (
                    <p className="text-sm text-slate-600">
                      Recibe: {envio.nombre_destinatario}
                      {envio.dni_destinatario ? ` · DNI ${envio.dni_destinatario}` : ''}
                      {envio.telefono_destinatario ? ` · ${envio.telefono_destinatario}` : ''}
                    </p>
                  )}
                  <p className="mt-2 flex items-center gap-1 text-sm text-slate-600">
                    <MapPin className="h-4 w-4" />
                    {envio.origen} → {envio.destino}
                  </p>
                  {envio.total_envio != null && (
                    <p className="mt-2 text-base font-semibold text-salazar-900">
                      Total: {formatCurrency(envio.total_envio)}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge estado={envio.estadoActual} />
                  <button
                    type="button"
                    className="btn-secondary text-xs"
                    disabled={downloadingPdf}
                    onClick={async () => {
                      setDownloadingPdf(true);
                      try {
                        await descargarComprobanteEnvio(envio);
                      } catch {
                        toastError('Error', 'No se pudo generar el PDF');
                      } finally {
                        setDownloadingPdf(false);
                      }
                    }}
                  >
                    <Download className="h-3.5 w-3.5" />
                    {downloadingPdf ? 'Generando...' : 'Comprobante PDF'}
                  </button>
                </div>
              </div>
            </div>

            <div className="card min-h-[280px] lg:min-h-[calc(100vh-22rem)]">
              <h3 className="panel-title">Línea de tiempo</h3>
              <Timeline items={envio.historial || []} />
            </div>
          </div>

          <div className="space-y-3 lg:col-span-2">
            <form onSubmit={handleEstado} className="card space-y-3">
              <h3 className="font-semibold text-salazar-900">Actualizar estado</h3>
              <select
                className="input-field"
                value={estadoForm.id_estado}
                onChange={(e) => setEstadoForm((f) => ({ ...f, id_estado: e.target.value }))}
                required
              >
                <option value="">Nuevo estado</option>
                {estados.map((s) => (
                  <option key={s.id_estado} value={s.id_estado}>
                    {s.nombre}
                  </option>
                ))}
              </select>
              <input
                className="input-field"
                placeholder="Ubicación actual"
                value={estadoForm.ubicacion}
                onChange={(e) => setEstadoForm((f) => ({ ...f, ubicacion: e.target.value }))}
              />
              <textarea
                className="input-field"
                rows={2}
                placeholder="Comentario"
                value={estadoForm.comentario}
                onChange={(e) => setEstadoForm((f) => ({ ...f, comentario: e.target.value }))}
              />
              <button type="submit" className="btn-primary w-full">
                Registrar cambio
              </button>
            </form>

            <form onSubmit={handleUpload} className="card space-y-3">
              <h3 className="flex items-center gap-2 font-semibold text-salazar-900">
                <Upload className="h-4 w-4" /> Evidencias
              </h3>
              <input
                type="file"
                accept="image/*,.pdf,.doc,.docx"
                className="text-sm"
                onChange={(e) => setFile(e.target.files[0])}
              />
              <p className="text-xs text-slate-500">Imágenes, PDF o Word · máx. 5 MB</p>
              <button type="submit" className="btn-secondary w-full" disabled={!file || uploading}>
                {uploading ? 'Subiendo...' : 'Subir evidencia'}
              </button>
              <ul className="max-h-40 space-y-2 overflow-y-auto text-xs">
                {evidencias.map((ev) => (
                  <li key={ev.id_evidencia} className="flex items-center justify-between gap-2">
                    <a
                      href={ev.ruta_archivo}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-salazar-600 hover:underline"
                    >
                      {ev.nombre_archivo}
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDeleteEvidencia(ev.id_evidencia)}
                      className="shrink-0 text-slate-400 hover:text-red-600"
                      title="Eliminar"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </form>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
};

export default SeguimientoPage;
