import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import ClienteAutocomplete from '../components/ClienteAutocomplete';
import StatChip from '../components/StatChip';
import { toastSuccess, toastError } from '../utils/alerts';
import {
  Clock,
  UserPlus,
  Loader2,
  Download,
  FileCheck,
  MapPin,
  Package,
  DollarSign,
  ArrowRight,
} from 'lucide-react';
import { labelCliente } from '../utils/cliente';
import { calcularTotalEnvio } from '../utils/envio';
import { descargarComprobanteEnvio } from '../utils/comprobanteEnvioPdf';
import { formatCurrency } from '../utils/format';

const emptyNuevoCliente = { nombre_completo: '', dni: '', telefono: '' };

const validarEnvio = (form) => {
  const errores = [];
  if (!form.origen?.trim()) errores.push({ campo: 'origen', msg: 'Origen requerido' });
  if (!form.destino?.trim()) errores.push({ campo: 'destino', msg: 'Destino requerido' });
  if (!form.tipo_carga?.trim()) errores.push({ campo: 'tipo_carga', msg: 'Tipo de carga requerido' });
  if (form.peso_kg !== '' && parseFloat(form.peso_kg) < 0) errores.push({ campo: 'peso_kg', msg: 'Peso no puede ser negativo' });
  if (form.numero_paquetes && parseInt(form.numero_paquetes, 10) < 1) {
    errores.push({ campo: 'numero_paquetes', msg: 'Número de paquetes inválido' });
  }
  if (form.total_envio === '' || form.total_envio == null) {
    errores.push({ campo: 'total_envio', msg: 'Ingrese el total del envío' });
  } else if (parseFloat(form.total_envio) < 0) {
    errores.push({ campo: 'total_envio', msg: 'El total no puede ser negativo' });
  }
  return errores;
};

const EnvioFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const horaInicioRef = useRef(new Date().toISOString());

  const [clienteMode, setClienteMode] = useState('buscar');
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [nuevoCliente, setNuevoCliente] = useState(emptyNuevoCliente);
  const [clienteDuplicado, setClienteDuplicado] = useState(null);
  const [checkingDni, setCheckingDni] = useState(false);

  const [loadingForm, setLoadingForm] = useState(isEdit);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [envioCreado, setEnvioCreado] = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [form, setForm] = useState({
    origen: '',
    destino: '',
    fecha_registro: new Date().toISOString().split('T')[0],
    fecha_estimada_entrega: '',
    tipo_carga: '',
    peso_kg: '',
    numero_paquetes: '1',
    total_envio: '',
    observaciones: '',
    prioridad: 'normal',
  });

  const selectCliente = useCallback((cliente) => {
    setSelectedCliente(cliente);
    setClienteDuplicado(null);
  }, []);

  const switchToBuscar = useCallback(() => {
    setClienteMode('buscar');
    setNuevoCliente(emptyNuevoCliente);
    setClienteDuplicado(null);
  }, []);

  useEffect(() => {
    if (!isEdit) horaInicioRef.current = new Date().toISOString();
    if (isEdit) {
      setLoadingForm(true);
      setLoadError(false);
      api
        .get(`/envios/${id}`)
        .then((r) => {
          const e = r.data.data;
          setForm({
            origen: e.origen,
            destino: e.destino,
            fecha_registro: e.fecha_registro,
            fecha_estimada_entrega: e.fecha_estimada_entrega || '',
            tipo_carga: e.tipo_carga,
            peso_kg: e.peso_kg,
            numero_paquetes: e.numero_paquetes ?? 1,
            total_envio: e.total_envio ?? '',
            observaciones: e.observaciones || '',
            prioridad: e.prioridad || 'normal',
          });
          if (e.cliente) {
            selectCliente({
              ...e.cliente,
              nombre_completo: e.cliente.nombre_completo || e.cliente.razon_social,
            });
            setClienteMode('buscar');
          }
        })
        .catch(() => setLoadError(true))
        .finally(() => setLoadingForm(false));
    }
  }, [id, isEdit, selectCliente]);

  const aplicarTotalSugerido = () => {
    const total = calcularTotalEnvio(form.peso_kg, form.numero_paquetes);
    setForm((f) => ({ ...f, total_envio: String(total) }));
  };

  const pasoClienteOk = Boolean(selectedCliente) || (clienteMode === 'nuevo' && nuevoCliente.nombre_completo && nuevoCliente.dni.length === 8);
  const pasoEnvioOk = form.origen && form.destino && form.tipo_carga;

  const resumen = useMemo(
    () => ({
      ruta: form.origen && form.destino ? `${form.origen} → ${form.destino}` : '—',
      carga: form.tipo_carga || '—',
      total: form.total_envio !== '' ? formatCurrency(form.total_envio) : '—',
    }),
    [form]
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleNuevoClienteChange = (e) => {
    const { name, value } = e.target;
    const next = name === 'dni' ? value.replace(/\D/g, '').slice(0, 8) : value;
    setNuevoCliente((f) => ({ ...f, [name]: next }));
    if (name === 'dni') setClienteDuplicado(null);
  };

  const verificarDniDuplicado = async () => {
    const dni = nuevoCliente.dni.replace(/\D/g, '');
    if (!/^\d{8}$/.test(dni)) return;
    setCheckingDni(true);
    try {
      const { data } = await api.get('/catalogos/clientes/check-dni', { params: { dni } });
      if (data.data?.exists && data.data.cliente) {
        setClienteDuplicado(data.data.cliente);
      } else {
        setClienteDuplicado(null);
      }
    } catch {
      /* demo */
    } finally {
      setCheckingDni(false);
    }
  };

  const validarCliente = () => {
    if (clienteMode === 'buscar') {
      if (!selectedCliente) {
        toastError('Cliente requerido', 'Busque y seleccione un cliente por DNI o nombre');
        return null;
      }
      return selectedCliente.id_cliente;
    }
    if (!nuevoCliente.nombre_completo?.trim()) {
      toastError('Datos del cliente', 'Ingrese el nombre completo');
      return null;
    }
    const dni = nuevoCliente.dni.replace(/\D/g, '');
    if (!/^\d{8}$/.test(dni)) {
      toastError('DNI requerido', 'El DNI debe tener exactamente 8 dígitos');
      return null;
    }
    if (clienteDuplicado) {
      toastError('Cliente ya registrado', 'Ese DNI ya está en la base de datos. Use el buscador.');
      return null;
    }
    return {
      nuevo: true,
      payload: {
        nombre_completo: nuevoCliente.nombre_completo.trim(),
        dni,
        telefono: nuevoCliente.telefono.trim() || null,
      },
    };
  };

  const registrarErroresCliente = async (errores) => {
    for (const err of errores) {
      try {
        await api.post('/observacion/errores-registro', {
          tipo_error: 'validacion_frontend',
          campo_afectado: err.campo,
          descripcion: err.msg,
        });
      } catch {
        /* demo */
      }
    }
  };

  const resolverIdCliente = async () => {
    const validacion = validarCliente();
    if (validacion === null) return null;
    if (typeof validacion === 'number') return validacion;
    if (validacion.nuevo) {
      try {
        const { data } = await api.post('/catalogos/clientes', validacion.payload);
        const c = data.data;
        selectCliente(c);
        return c.id_cliente;
      } catch (err) {
        const msg = err.response?.data?.message || 'No se pudo registrar el cliente';
        if (err.response?.status === 409) {
          toastError('Cliente ya registrado', msg);
          switchToBuscar();
          try {
            const { data } = await api.get('/catalogos/clientes/check-dni', {
              params: { dni: validacion.payload.dni },
            });
            if (data.data?.cliente) setClienteDuplicado(data.data.cliente);
          } catch {
            /* ignore */
          }
        } else {
          toastError('Error', msg);
        }
        return null;
      }
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errores = validarEnvio(form);
    if (errores.length) {
      await registrarErroresCliente(errores);
      toastError('Datos inválidos', errores.map((x) => x.msg).join('. '));
      return;
    }

    setSaving(true);
    try {
      let idCliente = selectedCliente?.id_cliente;
      if (!isEdit) {
        const resolved = await resolverIdCliente();
        if (!resolved) {
          setSaving(false);
          return;
        }
        idCliente = resolved;
      } else if (!idCliente) {
        toastError('Cliente requerido', 'Seleccione un cliente');
        setSaving(false);
        return;
      }

      const payload = {
        ...form,
        id_cliente: idCliente,
        prioridad: form.prioridad || 'normal',
        peso_kg: parseFloat(form.peso_kg) || 0,
        numero_paquetes: parseInt(form.numero_paquetes, 10) || 1,
        total_envio: parseFloat(form.total_envio) || 0,
        ...(isEdit ? {} : { hora_inicio_registro: horaInicioRef.current }),
      };

      if (isEdit) {
        await api.put(`/envios/${id}`, payload);
        toastSuccess('Envío actualizado');
        navigate('/envios');
      } else {
        const { data } = await api.post('/envios', payload);
        const envio = data.data;
        toastSuccess('Envío registrado', envio?.tiempo_registro_min != null ? `Tiempo: ${envio.tiempo_registro_min} min` : '');
        setEnvioCreado({ ...envio, cliente: envio.cliente || selectedCliente });
      }
    } catch (err) {
      toastError('Error', err.response?.data?.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDescargarComprobante = async (envio) => {
    setDownloadingPdf(true);
    try {
      await descargarComprobanteEnvio(envio);
    } catch {
      toastError('Error', 'No se pudo generar el comprobante PDF');
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (envioCreado) {
    return (
      <div className="page-shell">
        <PageHeader title="Envío registrado" subtitle="Comprobante listo para descargar" compact />

        <div className="grid gap-3 lg:grid-cols-12">
          <div className="card border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-white lg:col-span-8">
            <div className="flex flex-wrap items-start gap-4">
              <div className="rounded-2xl bg-emerald-100 p-4">
                <FileCheck className="h-10 w-10 text-emerald-700" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Registro exitoso</p>
                <p className="font-mono text-2xl font-bold text-salazar-900">{envioCreado.codigo_envio}</p>
                <p className="mt-1 text-sm text-slate-600">{labelCliente(envioCreado.cliente)}</p>
                <p className="mt-3 text-sm text-slate-500">
                  {envioCreado.origen} → {envioCreado.destino}
                </p>
                {envioCreado.tiempo_registro_min != null && (
                  <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                    <Clock className="h-3.5 w-3.5" />
                    Tiempo de registro: {envioCreado.tiempo_registro_min} min
                  </p>
                )}
              </div>
              <div className="rounded-xl bg-salazar-800 px-6 py-4 text-center text-white">
                <p className="text-xs uppercase tracking-wide opacity-80">Total del envío</p>
                <p className="text-2xl font-bold">{formatCurrency(envioCreado.total_envio)}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                className="btn-primary"
                disabled={downloadingPdf}
                onClick={() => handleDescargarComprobante(envioCreado)}
              >
                <Download className="h-4 w-4" />
                {downloadingPdf ? 'Generando PDF...' : 'Descargar comprobante PDF'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => navigate(`/seguimiento/${envioCreado.id_envio}`)}>
                Ver seguimiento
              </button>
              <button type="button" className="btn-secondary" onClick={() => navigate('/envios')}>
                Ir al listado
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setEnvioCreado(null);
                  setSelectedCliente(null);
                  setForm({
                    origen: '',
                    destino: '',
                    fecha_registro: new Date().toISOString().split('T')[0],
                    fecha_estimada_entrega: '',
                    tipo_carga: '',
                    peso_kg: '',
                    numero_paquetes: '1',
                    total_envio: '',
                    observaciones: '',
                    prioridad: 'normal',
                  });
                  horaInicioRef.current = new Date().toISOString();
                }}
              >
                Registrar otro envío
              </button>
            </div>
          </div>

          <div className="card lg:col-span-4">
            <h3 className="panel-title">Próximos pasos</h3>
            <ul className="space-y-2 text-sm">
              {[
                'Descargue el comprobante PDF para el cliente',
                'Actualice estados en Seguimiento logístico',
                'Adjunte evidencias de entrega cuando corresponda',
              ].map((txt) => (
                <li key={txt} className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-slate-600">
                  <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-salazar-600" />
                  {txt}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <PageHeader
        title={isEdit ? 'Editar envío' : 'Registrar envío'}
        subtitle={
          isEdit
            ? 'Modifique los datos logísticos del envío'
            : 'Identifique al cliente y complete los datos operativos del envío'
        }
        compact
        action={
          <button type="button" className="btn-secondary" onClick={() => navigate('/envios')} disabled={saving}>
            Volver al listado
          </button>
        }
      />

      {!isEdit && (
        <div className="card-compact flex flex-wrap items-center gap-3 border-salazar-200 bg-salazar-50/80 text-sm text-salazar-800">
          <Clock className="h-4 w-4 shrink-0" />
          <span className="flex-1">
            Cronómetro activo desde {new Date(horaInicioRef.current).toLocaleTimeString('es-PE')}. Al guardar se
            registran hora inicio, fin y tiempo empleado (TPRE).
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
        <StatChip label="Paso 1 · Cliente" value={pasoClienteOk ? 'Listo' : 'Pendiente'} accent={pasoClienteOk ? 'green' : 'amber'} />
        <StatChip label="Paso 2 · Envío" value={pasoEnvioOk ? 'Listo' : 'Pendiente'} accent={pasoEnvioOk ? 'green' : 'slate'} />
        <StatChip label="Total" value={form.total_envio !== '' ? formatCurrency(form.total_envio) : 'Pendiente'} accent="salazar" />
      </div>

      {loadingForm && (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-salazar-200 border-t-salazar-800" />
        </div>
      )}

      {loadError && (
        <div className="card-compact border-red-200 bg-red-50 text-sm text-red-800">
          No se pudo cargar el envío.{' '}
          <Link to="/envios" className="font-medium underline">
            Volver al listado
          </Link>
        </div>
      )}

      {!loadingForm && !loadError && (
        <form onSubmit={handleSubmit} className="grid gap-3 xl:grid-cols-12">
          {/* Panel cliente */}
          <div className="space-y-3 xl:col-span-4 xl:sticky xl:top-20 xl:self-start">
            <div className="card space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="panel-title mb-0 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-salazar-800 text-xs font-bold text-white">1</span>
                  Cliente
                </h3>
                {!isEdit && (
                  <div className="flex gap-1 rounded-lg border border-slate-200 p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={switchToBuscar}
                      className={`rounded-md px-2 py-1 font-medium transition ${
                        clienteMode === 'buscar' ? 'bg-salazar-800 text-white' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Buscar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setClienteMode('nuevo');
                        setSelectedCliente(null);
                        setClienteDuplicado(null);
                      }}
                      className={`flex items-center gap-1 rounded-md px-2 py-1 font-medium transition ${
                        clienteMode === 'nuevo' ? 'bg-salazar-800 text-white' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <UserPlus className="h-3 w-3" /> Nuevo
                    </button>
                  </div>
                )}
              </div>

              {clienteMode === 'buscar' && (
                <>
                  <ClienteAutocomplete
                    selected={selectedCliente}
                    onSelect={selectCliente}
                    onClear={() => setSelectedCliente(null)}
                    disabled={isEdit}
                  />
                  {!isEdit && !selectedCliente && (
                    <p className="text-xs text-slate-500">
                      Búsqueda optimizada para miles de clientes: use DNI completo o nombre parcial.
                    </p>
                  )}
                </>
              )}

              {clienteMode === 'nuevo' && !isEdit && !selectedCliente && (
                <>
                  {clienteDuplicado && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
                      <p className="font-medium">Cliente ya registrado</p>
                      <p className="mt-1">{labelCliente(clienteDuplicado)}</p>
                      <button
                        type="button"
                        className="btn-secondary mt-2 text-xs"
                        onClick={() => {
                          selectCliente(clienteDuplicado);
                          switchToBuscar();
                        }}
                      >
                        Usar este cliente
                      </button>
                    </div>
                  )}
                  <div className="grid gap-2">
                    <input
                      name="nombre_completo"
                      className="input-field"
                      placeholder="Nombre completo *"
                      value={nuevoCliente.nombre_completo}
                      onChange={handleNuevoClienteChange}
                    />
                    <div className="relative">
                      <input
                        name="dni"
                        className="input-field"
                        placeholder="DNI (8 dígitos) *"
                        value={nuevoCliente.dni}
                        onChange={handleNuevoClienteChange}
                        onBlur={verificarDniDuplicado}
                        maxLength={8}
                      />
                      {checkingDni && (
                        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
                      )}
                    </div>
                    <input
                      name="telefono"
                      className="input-field"
                      placeholder="Teléfono (opcional)"
                      value={nuevoCliente.telefono}
                      onChange={handleNuevoClienteChange}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Resumen sticky */}
            <div className="card space-y-3 border-salazar-100 bg-gradient-to-br from-slate-50 to-white">
              <h3 className="panel-title mb-0">Resumen</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Cliente</span>
                  <span className="truncate text-right font-medium text-slate-800">
                    {selectedCliente ? labelCliente(selectedCliente) : clienteMode === 'nuevo' && nuevoCliente.nombre_completo ? nuevoCliente.nombre_completo : '—'}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="flex items-center gap-1 text-slate-500"><MapPin className="h-3.5 w-3.5" /> Ruta</span>
                  <span className="truncate text-right font-medium">{resumen.ruta}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="flex items-center gap-1 text-slate-500"><Package className="h-3.5 w-3.5" /> Carga</span>
                  <span className="font-medium">{resumen.carga}</span>
                </div>
              </div>
              <div className="rounded-xl bg-salazar-800 px-4 py-3 text-center text-white">
                <p className="flex items-center justify-center gap-1 text-xs uppercase tracking-wide opacity-90">
                  <DollarSign className="h-3.5 w-3.5" /> Total del envío
                </p>
                <p className="text-xl font-bold tabular-nums">{resumen.total}</p>
              </div>
            </div>
          </div>

          {/* Panel envío */}
          <div className="space-y-3 xl:col-span-8">
            <div className="card space-y-3">
              <h3 className="panel-title flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-salazar-800 text-xs font-bold text-white">2</span>
                Datos del envío
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Origen *</label>
                  <input name="origen" className="input-field" value={form.origen} onChange={handleChange} required placeholder="Ej. Lima, Ate" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Destino *</label>
                  <input name="destino" className="input-field" value={form.destino} onChange={handleChange} required placeholder="Ej. Piura" />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Fecha registro</label>
                  <input
                    type="date"
                    name="fecha_registro"
                    className="input-field"
                    value={form.fecha_registro}
                    onChange={handleChange}
                    readOnly={isEdit}
                    disabled={isEdit}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Entrega estimada</label>
                  <input
                    type="date"
                    name="fecha_estimada_entrega"
                    className="input-field"
                    value={form.fecha_estimada_entrega}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Tipo de carga *</label>
                  <input name="tipo_carga" className="input-field" value={form.tipo_carga} onChange={handleChange} required placeholder="General, frágil..." />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Peso (kg)</label>
                  <input type="number" step="0.01" min="0" name="peso_kg" className="input-field" value={form.peso_kg} onChange={handleChange} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Nº paquetes *</label>
                  <input type="number" min="1" name="numero_paquetes" className="input-field" value={form.numero_paquetes} onChange={handleChange} required />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Total del envío (S/) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="total_envio"
                  className="input-field font-semibold text-salazar-900"
                  value={form.total_envio}
                  onChange={handleChange}
                  placeholder="0.00"
                  required
                />
                {!isEdit && (
                  <button
                    type="button"
                    className="mt-1 text-[11px] font-medium text-salazar-700 hover:underline"
                    onClick={aplicarTotalSugerido}
                  >
                    Calcular sugerido según peso y paquetes
                  </button>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Observaciones</label>
                <textarea name="observaciones" rows={2} className="input-field" value={form.observaciones} onChange={handleChange} placeholder="Instrucciones especiales, referencias..." />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button type="submit" className="btn-primary min-w-[160px]" disabled={saving}>
                {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Registrar envío'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => navigate('/envios')} disabled={saving}>
                Cancelar
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

export default EnvioFormPage;
