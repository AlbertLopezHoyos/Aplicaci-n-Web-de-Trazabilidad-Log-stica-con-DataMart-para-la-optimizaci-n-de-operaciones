const estados = [
  { id_estado: 1, codigo: 'recibido', nombre: 'Recibido', color_hex: '#3b82f6', orden: 1 },
  { id_estado: 2, codigo: 'en_transito', nombre: 'En tránsito', color_hex: '#f59e0b', orden: 2 },
  { id_estado: 3, codigo: 'entregado', nombre: 'Entregado', color_hex: '#22c55e', orden: 3 },
  { id_estado: 4, codigo: 'retrasado', nombre: 'Retrasado', color_hex: '#ef4444', orden: 4 },
  { id_estado: 5, codigo: 'cancelado', nombre: 'Cancelado', color_hex: '#6b7280', orden: 5 },
];

const clientes = [
  { id_cliente: 1, razon_social: 'Comercial Andina S.A.C.', ruc: '20123456789' },
  { id_cliente: 2, razon_social: 'Distribuidora Norte E.I.R.L.', ruc: '20987654321' },
  { id_cliente: 3, razon_social: 'Importaciones del Pacífico S.A.', ruc: '20456789123' },
];

let envios = [
  {
    id_envio: 1,
    codigo_envio: 'GLS-2026-00001',
    id_cliente: 1,
    id_estado_actual: 3,
    origen: 'Lima - Surquillo',
    destino: 'Arequipa Centro',
    fecha_registro: '2026-05-20',
    fecha_estimada_entrega: '2026-05-22',
    tipo_carga: 'Carga general',
    peso_kg: 450,
    prioridad: 'normal',
    observaciones: 'Demo sin base de datos',
    cliente: clientes[0],
    estadoActual: estados[2],
    historial: [
      {
        id_historial: 3,
        fecha_hora: '2026-05-22T14:00:00',
        comentario: 'Entrega confirmada',
        ubicacion: 'Arequipa',
        estado: estados[2],
        usuario: { nombres: 'María', apellidos: 'Torres' },
      },
      {
        id_historial: 2,
        fecha_hora: '2026-05-21T08:00:00',
        comentario: 'Salida de planta Lima',
        ubicacion: 'Panamericana Sur',
        estado: estados[1],
        usuario: { nombres: 'María', apellidos: 'Torres' },
      },
      {
        id_historial: 1,
        fecha_hora: '2026-05-20T09:00:00',
        comentario: 'Registro inicial',
        estado: estados[0],
        usuario: { nombres: 'María', apellidos: 'Torres' },
      },
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
    cliente: clientes[1],
    estadoActual: estados[1],
    historial: [
      {
        id_historial: 10,
        fecha_hora: '2026-05-26T10:00:00',
        comentario: 'En ruta',
        estado: estados[1],
        usuario: { nombres: 'María', apellidos: 'Torres' },
      },
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
    cliente: clientes[2],
    estadoActual: estados[3],
    historial: [],
  },
];

let incidencias = [
  {
    id_incidencia: 1,
    id_envio: 3,
    tipo: 'retraso',
    severidad: 'alta',
    titulo: 'Retraso por obras viales',
    descripcion: 'Demora estimada 24h en Panamericana Norte.',
    estado_incidencia: 'abierta',
    fecha_reporte: '2026-05-26T11:00:00',
    envio: { codigo_envio: 'GLS-2026-00003' },
  },
];

let evidencias = [];
let nextEnvioId = 4;
let nextIncidenciaId = 2;

const ok = (data, message = 'OK') => Promise.resolve({ data: { success: true, message, data } });

export const mockHandlers = {
  'GET /auth/me': () => ok({ id_usuario: 1, nombres: 'Carlos', apellidos: 'Salazar Mendoza', email: 'admin@salazarlogistica.pe', rol: { nombre: 'Administrador' } }),

  'GET /dashboard': () =>
    ok({
      kpis: {
        totalEnvios: 8,
        enviosEntregados: 3,
        enviosPendientes: 4,
        incidenciasAbiertas: 1,
        diasPromedioEntrega: 2.4,
      },
      porEstado: [
        { codigo: 'recibido', estado: 'Recibido', cantidad: 2, color_hex: '#3b82f6' },
        { codigo: 'en_transito', estado: 'En tránsito', cantidad: 2, color_hex: '#f59e0b' },
        { codigo: 'entregado', estado: 'Entregado', cantidad: 3, color_hex: '#22c55e' },
        { codigo: 'retrasado', estado: 'Retrasado', cantidad: 1, color_hex: '#ef4444' },
      ],
      tendencia: [
        { mes: '2026-01', total: 12, entregados: 10 },
        { mes: '2026-02', total: 15, entregados: 13 },
        { mes: '2026-03', total: 18, entregados: 16 },
        { mes: '2026-04', total: 22, entregados: 19 },
        { mes: '2026-05', total: 8, entregados: 3 },
      ],
      incidencias: [
        { tipo: 'retraso', cantidad: 5 },
        { tipo: 'error', cantidad: 2 },
        { tipo: 'observacion', cantidad: 8 },
      ],
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
          e.destino.toLowerCase().includes(q)
      );
    }
    if (params.estado) list = list.filter((e) => String(e.id_estado_actual) === String(params.estado));
    return ok({ data: list, total: list.length, page, limit });
  },

  'GET /catalogos/estados': () => ok(estados),
  'GET /catalogos/clientes': () => ok(clientes),

  'GET /incidencias': (config) => {
    const page = Number(config.params?.page) || 1;
    return ok({ data: incidencias, total: incidencias.length, page });
  },

  'GET /reportes/historial': () => ok([]),

  'GET /datamart/design': () =>
    ok({
      nombre: 'DataMart Operaciones Logísticas',
      version: '1.0.0',
      esquema: 'estrella',
      etl: { extraccion: 'Modo demo — conectar MySQL para ETL real' },
      dashboardsBI: ['Panel OTIF', 'Productividad operadores', 'Incidencias por tipo'],
      tablas: { hechos: { fact_operaciones_logisticas: { metricas: ['peso_kg', 'dias_transito', 'cantidad_incidencias'] } } },
    }),

  'GET /datamart/preview': () =>
    ok({
      totalHechos: 0,
      dimensiones: [
        { tabla: 'dim_fecha', registros: 1461 },
        { tabla: 'dim_cliente', registros: 3 },
        { tabla: 'dim_estado', registros: 5 },
        { tabla: 'dim_operador', registros: 2 },
      ],
    }),

  'POST /datamart/etl/run': () => ok({ ok: true, filasCargadas: 0, mensaje: 'ETL disponible cuando conecte MySQL' }),

  'POST /reportes/generar': () =>
    ok({
      reporte: { id_reporte: 1, titulo: 'Reporte demo' },
      downloadUrl: null,
    }, 'Reporte demo (conecte API para descargar PDF/Excel)'),
};

const matchRoute = (method, url) => {
  const path = url.replace(/^\//, '').split('?')[0];
  const key = `${method.toUpperCase()} /${path}`;
  if (mockHandlers[key]) return key;

  if (method === 'get' && path.match(/^envios\/\d+$/)) return 'GET_ENVIO_ID';
  if (method === 'get' && path.match(/^envios\/\d+\/timeline$/)) return 'GET_ENVIO_TIMELINE';
  if (method === 'get' && path.match(/^evidencias\/envio\/\d+$/)) return 'GET_EVIDENCIAS';
  return null;
};

export const handleMockRequest = async (config) => {
  const method = (config.method || 'get').toLowerCase();
  const url = (config.url || '').replace(/^\/api/, '').replace(/^\//, '');
  const path = url.split('?')[0];

  const key = matchRoute(method, path);
  if (key === 'GET_ENVIO_ID') {
    const id = Number(path.split('/')[1]);
    const envio = envios.find((e) => e.id_envio === id);
    if (!envio) return Promise.reject({ response: { data: { message: 'No encontrado' }, status: 404 } });
    return ok(envio);
  }
  if (key === 'GET_ENVIO_TIMELINE') {
    const id = Number(path.split('/')[1]);
    const envio = envios.find((e) => e.id_envio === id);
    return ok(envio?.historial || []);
  }
  if (key === 'GET_EVIDENCIAS') {
    const id = Number(path.split('/').pop());
    return ok(evidencias.filter((e) => e.id_envio === id));
  }

  const handlerKey = `${method.toUpperCase()} /${path}`;
  if (mockHandlers[handlerKey]) return mockHandlers[handlerKey](config);

  if (method === 'post' && path === 'envios') {
    const body = config.data || {};
    const estado = estados.find((s) => s.codigo === 'recibido');
    const nuevo = {
      id_envio: nextEnvioId++,
      codigo_envio: `GLS-2026-${String(nextEnvioId).padStart(5, '0')}`,
      ...body,
      id_estado_actual: estado.id_estado,
      estadoActual: estado,
      cliente: clientes.find((c) => c.id_cliente === Number(body.id_cliente)) || clientes[0],
      historial: [],
    };
    envios.unshift(nuevo);
    return ok(nuevo, 'Envío registrado (demo)', 201);
  }

  if (method === 'put' && path.match(/^envios\/\d+$/)) {
    const id = Number(path.split('/')[1]);
    const idx = envios.findIndex((e) => e.id_envio === id);
    if (idx >= 0) {
      envios[idx] = { ...envios[idx], ...config.data };
      return ok(envios[idx], 'Actualizado (demo)');
    }
  }

  if (method === 'patch' && path.match(/^envios\/\d+\/estado$/)) {
    const id = Number(path.split('/')[1]);
    const body = config.data || {};
    const envio = envios.find((e) => e.id_envio === id);
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
        usuario: { nombres: 'María', apellidos: 'Torres' },
      });
      return ok(envio, 'Estado actualizado (demo)');
    }
  }

  if (method === 'post' && path === 'incidencias') {
    const body = config.data || {};
    const envio = envios.find((e) => e.id_envio === Number(body.id_envio));
    const inc = {
      id_incidencia: nextIncidenciaId++,
      ...body,
      fecha_reporte: new Date().toISOString(),
      estado_incidencia: 'abierta',
      envio: envio ? { codigo_envio: envio.codigo_envio } : {},
    };
    incidencias.unshift(inc);
    return ok(inc, 'Incidencia registrada (demo)', 201);
  }

  if (method === 'delete' && path.match(/^envios\/\d+$/)) {
    const id = Number(path.split('/')[1]);
    envios = envios.filter((e) => e.id_envio !== id);
    return ok(null, 'Eliminado (demo)');
  }

  if (method === 'post' && path === 'auth/logout') return ok(null);
  if (method === 'post' && path === 'evidencias/upload') {
    return ok({ nombre_archivo: 'demo.jpg', ruta_archivo: '#' }, 'Evidencia demo', 201);
  }

  return Promise.reject({
    response: { status: 404, data: { message: `Mock no definido: ${method} ${path}` } },
  });
};
