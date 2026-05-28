import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import Timeline from '../components/Timeline';
import { toastSuccess, toastError } from '../utils/alerts';
import { Upload, MapPin } from 'lucide-react';

const SeguimientoPage = () => {
  const { id: paramId } = useParams();
  const [envios, setEnvios] = useState([]);
  const [selectedId, setSelectedId] = useState(paramId || '');
  const [envio, setEnvio] = useState(null);
  const [estados, setEstados] = useState([]);
  const [evidencias, setEvidencias] = useState([]);
  const [estadoForm, setEstadoForm] = useState({ id_estado: '', ubicacion: '', comentario: '' });
  const [file, setFile] = useState(null);

  useEffect(() => {
    api.get('/envios', { params: { limit: 100 } }).then((r) => setEnvios(r.data.data?.data || []));
    api.get('/catalogos/estados').then((r) => setEstados(r.data.data));
  }, []);

  useEffect(() => {
    if (paramId) setSelectedId(paramId);
  }, [paramId]);

  useEffect(() => {
    if (!selectedId) return;
    api.get(`/envios/${selectedId}`).then((r) => setEnvio(r.data.data));
    api.get(`/evidencias/envio/${selectedId}`).then((r) => setEvidencias(r.data.data));
  }, [selectedId]);

  const handleEstado = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/envios/${selectedId}/estado`, estadoForm);
      toastSuccess('Estado actualizado');
      const { data } = await api.get(`/envios/${selectedId}`);
      setEnvio(data.data);
      setEstadoForm({ id_estado: '', ubicacion: '', comentario: '' });
    } catch (err) {
      toastError('Error', err.response?.data?.message);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !selectedId) return;
    const fd = new FormData();
    fd.append('archivo', file);
    fd.append('id_envio', selectedId);
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
    }
  };

  return (
    <div>
      <PageHeader
        title="Seguimiento logístico"
        subtitle="Actualización de estados y línea de tiempo del envío"
      />

      <div className="card mb-6">
        <label className="mb-2 block text-sm font-medium">Seleccionar envío</label>
        <select
          className="input-field max-w-xl"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          <option value="">— Elegir código de envío —</option>
          {envios.map((e) => (
            <option key={e.id_envio} value={e.id_envio}>
              {e.codigo_envio} — {e.cliente?.razon_social}
            </option>
          ))}
        </select>
      </div>

      {envio && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="card">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-lg font-bold text-salazar-800">{envio.codigo_envio}</p>
                  <p className="text-sm text-slate-500">{envio.cliente?.razon_social}</p>
                  <p className="mt-2 flex items-center gap-1 text-sm text-slate-600">
                    <MapPin className="h-4 w-4" />
                    {envio.origen} → {envio.destino}
                  </p>
                </div>
                <StatusBadge estado={envio.estadoActual} />
              </div>
            </div>

            <div className="card">
              <h3 className="mb-4 font-semibold text-salazar-900">Línea de tiempo</h3>
              <Timeline items={envio.historial || []} />
            </div>
          </div>

          <div className="space-y-6">
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
                accept="image/*,.pdf"
                className="text-sm"
                onChange={(e) => setFile(e.target.files[0])}
              />
              <button type="submit" className="btn-secondary w-full" disabled={!file}>
                Subir evidencia
              </button>
              <ul className="max-h-40 space-y-2 overflow-y-auto text-xs">
                {evidencias.map((ev) => (
                  <li key={ev.id_evidencia}>
                    <a
                      href={ev.ruta_archivo}
                      target="_blank"
                      rel="noreferrer"
                      className="text-salazar-600 hover:underline"
                    >
                      {ev.nombre_archivo}
                    </a>
                  </li>
                ))}
              </ul>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeguimientoPage;
