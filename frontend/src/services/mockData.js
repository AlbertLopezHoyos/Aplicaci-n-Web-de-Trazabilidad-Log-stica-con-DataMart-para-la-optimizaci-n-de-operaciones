const estados = [
  { id_estado: 1, codigo: 'recibido', nombre: 'Recibido', color_hex: '#3b82f6', orden: 1 },
  { id_estado: 2, codigo: 'en_transito', nombre: 'En tránsito', color_hex: '#f59e0b', orden: 2 },
  { id_estado: 3, codigo: 'entregado', nombre: 'Entregado', color_hex: '#22c55e', orden: 3 },
  { id_estado: 4, codigo: 'retrasado', nombre: 'Retrasado', color_hex: '#ef4444', orden: 4 },
  { id_estado: 5, codigo: 'cancelado', nombre: 'Cancelado', color_hex: '#6b7280', orden: 5 },
];

const clientes = [
  { id_cliente: 1, razon_social: 'Comercial Andina S.A.C.', ruc: '20123456789', contacto: 'Juan Pérez', email: 'contacto@andina.pe', telefono: '999111222', ciudad: 'Lima' },
  { id_cliente: 2, razon_social: 'Distribuidora Norte E.I.R.L.', ruc: '20987654321', contacto: 'Ana Ruiz', email: 'ventas@norte.pe', telefono: '999333444', ciudad: 'Trujillo' },
  { id_cliente: 3, razon_social: 'Importaciones del Pacífico S.A.', ruc: '20456789123', contacto: 'Carlos Díaz', email: 'info@pacifico.pe', telefono: '999555666', ciudad: 'Callao' },
];

const responsable = { nombres: 'María', apellidos: 'Torres Vega' };

let envios = [
  {
    id_envio: 1,
    codigo_envio: 'GLS-2026-00001',
    id_cliente: 1,
    id_estado_actual: 3,
    origen: 'Lima - Surquillo',
    destino: 'Arequipa Centro',
    fecha_registro: '2026-05-20',
    tipo_carga: 'Carga general',
    peso_kg: 450,
    numero_paquetes: 12,
    hora_inicio_registro: '2026-05-20T09:00:00',
    hora_fin_registro: '2026-05-20T09:04:30',
    tiempo_registro_min: 4.5,
    registro_correcto: true,
    observaciones: 'Registro demo',
    cliente: clientes[0],
    estadoActual: estados[2],
    responsable,
    historial: [
      { id_historial: 3, fecha_hora: '2026-05-22T14:00:00', comentario: 'Entrega confirmada', estado: estados[2], usuario: responsable },
      { id_historial: 2, fecha_hora: '2026-05-21T08:00:00', comentario: 'En ruta', estado: estados[1], usuario: responsable },
      { id_historial: 1, fecha_hora: '2026-05-20T09:05:00', comentario: 'Registro inicial', estado: estados[0], usuario: responsable },
    ],
  },
  {
    id_envio: 2,
    codigo_envio: 'GLS-2026-00002',
    id_cliente: 2,
    id_estado_actual: 2,
    origen: 'Callao',
    destino: 'Trujillo',
    fecha_registro: '2026-05-25',
    tipo_carga: 'Encomienda',
    peso_kg: 25,
    numero_paquetes: 1,
    hora_inicio_registro: '2026-05-25T10:15:00',
    hora_fin_registro: '2026-05-25T10:17:20',
    tiempo_registro_min: 2.33,
    registro_correcto: true,
    cliente: clientes[1],
    estadoActual: estados[1],
    responsable,
    historial: [
      { id_historial: 10, fecha_hora: '2026-05-26T10:00:00', comentario: 'En ruta', estado: estados[1], usuario: responsable },
    ],
  },
  {
    id_envio: 3,
    codigo_envio: 'GLS-2026-00003',
    id_cliente: 3,
    id_estado_actual: 4,
    origen: 'Lima - Ate',
    destino: 'Piura',
    fecha_registro: '2026-05-24',
    tipo_carga: 'Carga refrigerada',
    peso_kg: 800,
    numero_paquetes: 8,
    hora_inicio_registro: '2026-05-24T08:30:00',
    hora_fin_registro: '2026-05-24T08:38:00',
    tiempo_registro_min: 8,
    registro_correcto: false,
    cliente: clientes[2],
    estadoActual: estados[3],
    responsable,
    historial: [],
  },
];

let erroresRegistro = [
  { id_error: 1, id_envio: 3, tipo_error: 'validacion', campo_afectado: 'destino', descripcion: 'Destino incompleto corregido' },
];

let reportesHistorial = [
  {
    id_reporte: 1,
    titulo: 'Reporte de envíos por estado',
    tipo_reporte: 'envios_estado',
    formato: 'pdf',
    area_solicitante: 'Operaciones',
    tiempo_generacion_min: 1.2,
    cantidad_registros: 4,
    hora_inicio: '2026-05-26T09:00:00',
    hora_fin: '2026-05-26T09:01:12',
    observaciones: 'Demo',
    ruta_archivo: null,
  },
];

let incidencias = [
  {
    id_incidencia: 1,
    codigo_incidencia: 'INC-2026-00001',
    id_envio: 3,
    tipo: 'retraso',
    severidad: 'alta',
    area: 'Transporte',
    fuente_principal: 'Llamada telefónica',
    informacion_completa: true,
    titulo: 'Retraso por obras viales',
    descripcion: 'Demora estimada 24h.',
    estado_incidencia: 'abierta',
    fecha_reporte: '2026-05-26T11:00:00',
    envio: { codigo_envio: 'GLS-2026-00003' },
  },
];

let evidencias = [];
let nextEnvioId = 4;
let nextClienteId = 4;
let nextIncidenciaId = 2;
let nextErrorId = 2;
let nextReporteId = 2;

const ok = (data, message = 'OK') => Promise.resolve({ data: { success: true, message, data } });

const fmtTime = (iso) => (iso ? new Date(iso).toTimeString().slice(0, 8) : null);

const buildFichaEficiencia = () =>
  envios.map((e) => ({
    codigo_envio: e.codigo_envio,
    fecha: e.fecha_registro,
    tipo_mercaderia: e.tipo_carga,
    peso_kg: e.peso_kg,
    numero_paquetes: e.numero_paquetes,
    origen: e.origen,
    destino: e.destino,
    hora_inicio: fmtTime(e.hora_inicio_registro),
    hora_fin: fmtTime(e.hora_fin_registro),
    tiempo_registro_min: e.tiempo_registro_min,
    usuario_responsable: e.responsable ? `${e.responsable.nombres} ${e.responsable.apellidos}` : 'María Torres Vega',
    observaciones: e.observaciones,
  }));

const buildFichaCalidad = () =>
  envios.map((e) => {
    const err = erroresRegistro.find((x) => x.id_envio === e.id_envio);
    const tieneError = !e.registro_correcto || err;
    return {
      codigo_envio: e.codigo_envio,
      fecha: e.fecha_registro,
      tipo_mercaderia: e.tipo_carga,
      destino: e.destino,
      numero_paquetes: e.numero_paquetes,
      error_en_registro: tieneError ? 'Sí' : 'No',
      tipo_error: err?.tipo_error || null,
      campo_afectado: err?.campo_afectado || null,
      observaciones: e.observaciones,
    };
  });

const buildFichaControl = () =>
  envios.map((e) => ({
    codigo_envio: e.codigo_envio,
    fecha: e.fecha_registro,
    tipo_mercaderia: e.tipo_carga,
    origen: e.origen,
    destino: e.destino,
    estado_actual: e.estadoActual?.nombre,
    estado_actualizado: (e.historial?.length > 1 || e.estadoActual?.codigo !== 'recibido') ? 'Sí' : 'No',
    fecha_actualizacion: e.historial?.[0]?.fecha_hora?.split('T')[0] || null,
    hora_actualizacion: fmtTime(e.historial?.[0]?.fecha_hora),
    responsable_actualizacion: e.historial?.[0]?.usuario
      ? `${e.historial[0].usuario.nombres} ${e.historial[0].usuario.apellidos}`
      : null,
    observaciones: e.observaciones,
  }));

const buildFichaInformacionOperativa = () =>
  incidencias.map((i) => ({
    fecha: i.fecha_reporte?.split('T')[0],
    codigo_incidencia: i.codigo_incidencia,
    tipo_incidencia: i.tipo,
    area: i.area,
    codigo_envio: i.envio?.codigo_envio || null,
    estado_incidencia: i.estado_incidencia,
    informacion_completa: i.informacion_completa ? 'Sí' : 'No',
    fuente_principal: i.fuente_principal,
    observacion: i.descripcion,
  }));

const calcIndicadores = () => {
  const tiempos = envios.filter((e) => e.tiempo_registro_min != null).map((e) => e.tiempo_registro_min);
  const tpre = tiempos.length ? tiempos.reduce((a, b) => a + b, 0) / tiempos.length : 0;
  const conError = envios.filter((e) => !e.registro_correcto || erroresRegistro.some((x) => x.id_envio === e.id_envio)).length;
  const per = envios.length ? (conError / envios.length) * 100 : 0;
  const actualizados = envios.filter((e) => e.historial?.length > 1 || e.estadoActual?.codigo !== 'recibido').length;
  const peea = envios.length ? (actualizados / envios.length) * 100 : 0;
  const completas = incidencias.filter((i) => i.informacion_completa).length;
  const pico = incidencias.length ? (completas / incidencias.length) * 100 : 0;
  return {
    tpre: Math.round(tpre * 100) / 100,
    per: Math.round(per * 100) / 100,
    peea: Math.round(peea * 100) / 100,
    pico: Math.round(pico * 100) / 100,
    totalEnvios: envios.length,
    totalIncidencias: incidencias.length,
  };
};

export const mockHandlers = {
  'GET /auth/me': () =>
    ok({
      id_usuario: 1,
      nombres: 'Carlos',
      apellidos: 'Salazar Mendoza',
      email: 'admin@salazarlogistica.pe',
      rol: { nombre: 'Administrador' },
    }),

  'GET /dashboard': () =>
    ok({
      kpis: {
        totalEnvios: envios.length,
        enviosEntregados: envios.filter((e) => e.estadoActual?.codigo === 'entregado').length,
        enviosPendientes: envios.filter((e) => ['recibido', 'en_transito', 'retrasado'].includes(e.estadoActual?.codigo)).length,
        incidenciasAbiertas: incidencias.filter((i) => i.estado_incidencia === 'abierta').length,
        diasPromedioEntrega: 2.4,
      },
      porEstado: estados.map((s) => ({
        codigo: s.codigo,
        estado: s.nombre,
        cantidad: envios.filter((e) => e.id_estado_actual === s.id_estado).length,
        color_hex: s.color_hex,
      })),
      tendencia: [
        { mes: '2026-03', total: 5, entregados: 4 },
        { mes: '2026-04', total: 8, entregados: 6 },
        { mes: '2026-05', total: envios.length, entregados: 1 },
      ],
      incidencias: [{ tipo: 'retraso', cantidad: 1 }],
    }),

  'GET /envios': (config) => {
    const params = config.params || {};
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 10;
    let list = [...envios];
    if (params.search) {
      const q = params.search.toLowerCase();
      list = list.filter(
        (e) =>
          e.codigo_envio.toLowerCase().includes(q) ||
          e.origen.toLowerCase().includes(q) ||
          e.destino.toLowerCase().includes(q) ||
          e.cliente?.razon_social?.toLowerCase().includes(q)
      );
    }
    if (params.estado) list = list.filter((e) => String(e.id_estado_actual) === String(params.estado));
    if (params.fechaDesde) list = list.filter((e) => e.fecha_registro >= params.fechaDesde);
    if (params.fechaHasta) list = list.filter((e) => e.fecha_registro <= params.fechaHasta);
    return ok({ data: list, total: list.length, page, limit });
  },

  'GET /catalogos/estados': () => ok(estados),
  'GET /catalogos/clientes': (config) => {
    const q = (config.params?.search || '').toLowerCase();
    let list = [...clientes];
    if (q) {
      list = list.filter(
        (c) => c.razon_social.toLowerCase().includes(q) || c.ruc.includes(q)
      );
    }
    return ok(list);
  },
  'GET /incidencias': (config) => {
    const params = config.params || {};
    let list = [...incidencias];
    if (params.estado) list = list.filter((i) => i.estado_incidencia === params.estado);
    return ok({ data: list, total: list.length, page: Number(params.page) || 1 });
  },
  'GET /reportes/historial': () => ok(reportesHistorial),
  'GET /observacion/indicadores': () => ok(calcIndicadores()),
  'GET /datamart/design': () =>
    ok({
      nombre: 'DataMart Operaciones Logísticas',
      version: '1.0.0',
      esquema: 'estrella',
      etl: { extraccion: 'Modo demo' },
      dashboardsBI: ['Panel OTIF'],
      tablas: { hechos: { fact_operaciones_logisticas: { metricas: ['peso_kg'] } } },
    }),
  'GET /datamart/preview': () =>
    ok({ totalHechos: 0, dimensiones: [{ tabla: 'dim_fecha', registros: 1461 }] }),
  'POST /datamart/etl/run': () => ok({ ok: true, filasCargadas: 0 }),
};

const matchRoute = (method, url) => {
  const path = url.replace(/^\//, '').split('?')[0];
  if (method === 'get' && path.match(/^envios\/\d+$/)) return 'GET_ENVIO_ID';
  if (method === 'get' && path.match(/^envios\/\d+\/timeline$/)) return 'GET_ENVIO_TIMELINE';
  if (method === 'get' && path.match(/^evidencias\/envio\/\d+$/)) return 'GET_EVIDENCIAS';
  if (method === 'get' && path.match(/^observacion\/ficha\/[1-4]$/)) return 'GET_FICHA';
  if (method === 'get' && path.match(/^observacion\/ficha\/[1-4]\/export$/)) return 'GET_FICHA_EXPORT';
  return null;
};

export const handleMockRequest = async (config) => {
  const method = (config.method || 'get').toLowerCase();
  const url = (config.url || '').replace(/^\/api/, '').replace(/^\//, '');
  const path = url.split('?')[0];
  const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : config.data || {};

  const key = matchRoute(method, path);
  if (key === 'GET_ENVIO_ID') {
    const envio = envios.find((e) => e.id_envio === Number(path.split('/')[1]));
    if (!envio) return Promise.reject({ response: { data: { message: 'No encontrado' }, status: 404 } });
    return ok(envio);
  }
  if (key === 'GET_ENVIO_TIMELINE') {
    const envio = envios.find((e) => e.id_envio === Number(path.split('/')[1]));
    return ok(envio?.historial || []);
  }
  if (key === 'GET_EVIDENCIAS') {
    return ok(evidencias.filter((e) => e.id_envio === Number(path.split('/').pop())));
  }
  if (key === 'GET_FICHA') {
    const dim = Number(path.split('/')[2]);
    const builders = { 1: buildFichaEficiencia, 2: buildFichaCalidad, 3: buildFichaControl, 4: buildFichaInformacionOperativa };
    const data = builders[dim]?.() || [];
    return ok({ dimension: dim, data });
  }
  if (key === 'GET_FICHA_EXPORT') {
    return ok({ downloadUrl: null, filas: buildFichaEficiencia(), mensaje: 'Export Excel disponible con MySQL' });
  }

  const handlerKey = `${method.toUpperCase()} /${path}`;
  if (mockHandlers[handlerKey]) return mockHandlers[handlerKey](config);

  if (method === 'post' && path === 'envios') {
    const estado = estados.find((s) => s.codigo === 'recibido');
    const inicio = body.hora_inicio_registro ? new Date(body.hora_inicio_registro) : new Date(Date.now() - 180000);
    const fin = new Date();
    const tiempoMin = Math.round(((fin - inicio) / 60000) * 100) / 100;
    const id = nextEnvioId++;
    const nuevo = {
      id_envio: id,
      codigo_envio: `GLS-2026-${String(id).padStart(5, '0')}`,
      ...body,
      id_estado_actual: estado.id_estado,
      estadoActual: estado,
      cliente: clientes.find((c) => c.id_cliente === Number(body.id_cliente)) || clientes[0],
      responsable,
      numero_paquetes: parseInt(body.numero_paquetes, 10) || 1,
      hora_inicio_registro: inicio.toISOString(),
      hora_fin_registro: fin.toISOString(),
      tiempo_registro_min: tiempoMin,
      registro_correcto: true,
      historial: [{
        id_historial: Date.now(),
        fecha_hora: fin.toISOString(),
        comentario: 'Registro inicial',
        estado,
        usuario: responsable,
      }],
    };
    envios.unshift(nuevo);
    return ok(nuevo, 'Envío registrado (demo)');
  }

  if (method === 'put' && path.match(/^envios\/\d+$/)) {
    const id = Number(path.split('/')[1]);
    const idx = envios.findIndex((e) => e.id_envio === id);
    if (idx >= 0) {
      envios[idx] = { ...envios[idx], ...body };
      return ok(envios[idx]);
    }
  }

  if (method === 'patch' && path.match(/^envios\/\d+\/estado$/)) {
    const envio = envios.find((e) => e.id_envio === Number(path.split('/')[1]));
    const estado = estados.find((s) => s.id_estado === Number(body.id_estado));
    if (envio && estado) {
      envio.id_estado_actual = estado.id_estado;
      envio.estadoActual = estado;
      envio.historial = envio.historial || [];
      envio.historial.unshift({
        id_historial: Date.now(),
        fecha_hora: new Date().toISOString(),
        comentario: body.comentario || `Cambio a ${estado.nombre}`,
        ubicacion: body.ubicacion,
        estado,
        usuario: responsable,
      });
      return ok(envio);
    }
  }

  if (method === 'post' && path === 'incidencias') {
    const envio = envios.find((e) => e.id_envio === Number(body.id_envio));
    const informacion_completa = Boolean(body.area && body.fuente_principal && body.titulo && body.descripcion);
    const id = nextIncidenciaId++;
    const inc = {
      id_incidencia: id,
      codigo_incidencia: `INC-2026-${String(id).padStart(5, '0')}`,
      estado_incidencia: 'abierta',
      ...body,
      informacion_completa,
      fecha_reporte: new Date().toISOString(),
      envio: envio ? { codigo_envio: envio.codigo_envio } : {},
    };
    incidencias.unshift(inc);
    return ok(inc);
  }

  if (method === 'put' && path.match(/^incidencias\/\d+$/)) {
    const id = Number(path.split('/')[1]);
    const idx = incidencias.findIndex((i) => i.id_incidencia === id);
    if (idx === -1) return Promise.reject({ response: { status: 404, data: { message: 'No encontrada' } } });
    const prev = incidencias[idx];
    const merged = { ...prev, ...body };
    merged.informacion_completa = Boolean(merged.area && merged.fuente_principal && merged.titulo && merged.descripcion);
    if (['resuelta', 'cerrada'].includes(merged.estado_incidencia)) {
      merged.fecha_resolucion = merged.fecha_resolucion || new Date().toISOString();
    }
    const envio = envios.find((e) => e.id_envio === Number(merged.id_envio));
    if (envio) merged.envio = { codigo_envio: envio.codigo_envio };
    incidencias[idx] = merged;
    return ok(merged);
  }

  if (method === 'post' && path === 'catalogos/clientes') {
    const id = nextClienteId++;
    const cliente = { id_cliente: id, activo: true, ciudad: 'Lima', ...body };
    clientes.push(cliente);
    return ok(cliente);
  }

  if (method === 'post' && path === 'observacion/errores-registro') {
    erroresRegistro.unshift({ id_error: nextErrorId++, ...body, id_usuario: 1 });
    return ok(body);
  }

  if (method === 'post' && path === 'reportes/generar') {
    const inicio = new Date();
    const tiempoMin = Math.round((Math.random() * 2 + 0.5) * 100) / 100;
    const fin = new Date(inicio.getTime() + tiempoMin * 60000);
    const rep = {
      id_reporte: nextReporteId++,
      titulo: `Reporte ${body.tipo}`,
      tipo_reporte: body.tipo,
      formato: body.formato,
      area_solicitante: body.area_solicitante || 'Operaciones',
      observaciones: body.observaciones,
      tiempo_generacion_min: tiempoMin,
      cantidad_registros: envios.length,
      hora_inicio: inicio.toISOString(),
      hora_fin: fin.toISOString(),
      ruta_archivo: null,
      estado: 'generado',
    };
    reportesHistorial.unshift(rep);
    return ok({ reporte: rep, downloadUrl: null });
  }

  if (method === 'delete' && path.match(/^envios\/\d+$/)) {
    envios = envios.filter((e) => e.id_envio !== Number(path.split('/')[1]));
    return ok(null);
  }

  if (method === 'post' && path === 'auth/logout') return ok(null);
  if (method === 'post' && path === 'evidencias/upload') {
    const ev = { id_evidencia: Date.now(), id_envio: Number(body.id_envio), nombre_archivo: 'demo.jpg', ruta_archivo: '#' };
    evidencias.push(ev);
    return ok(ev);
  }

  return Promise.reject({ response: { status: 404, data: { message: `Mock: ${method} ${path}` } } });
};
