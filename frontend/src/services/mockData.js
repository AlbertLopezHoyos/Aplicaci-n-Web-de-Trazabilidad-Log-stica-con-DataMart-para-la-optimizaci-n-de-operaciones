const estados = [
  { id_estado: 1, codigo: 'recibido', nombre: 'Recibido', color_hex: '#3b82f6', orden: 1 },
  { id_estado: 2, codigo: 'en_transito', nombre: 'En tránsito', color_hex: '#f59e0b', orden: 2 },
  { id_estado: 3, codigo: 'entregado', nombre: 'Entregado', color_hex: '#22c55e', orden: 3 },
  { id_estado: 4, codigo: 'retrasado', nombre: 'Retrasado', color_hex: '#ef4444', orden: 4 },
  { id_estado: 5, codigo: 'cancelado', nombre: 'Cancelado', color_hex: '#6b7280', orden: 5 },
];

const clientes = [
  { id_cliente: 1, nombre_completo: 'Albert López Hoyos', razon_social: 'Albert López Hoyos', dni: '72345678', telefono: null },
  { id_cliente: 2, nombre_completo: 'María García Ruiz', razon_social: 'María García Ruiz', dni: '45678901', telefono: null },
  { id_cliente: 3, nombre_completo: 'Carlos Mendoza Vela', razon_social: 'Carlos Mendoza Vela', dni: '73451289', telefono: null },
  { id_cliente: 4, nombre_completo: 'Rosa Quispe Huamán', razon_social: 'Rosa Quispe Huamán', dni: '47892345', telefono: null },
  { id_cliente: 5, nombre_completo: 'José Torres Ramírez', razon_social: 'José Torres Ramírez', dni: '70123456', telefono: null },
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
    total_envio: 1126,
    hora_inicio_registro: '2026-05-20T09:00:00',
    hora_fin_registro: '2026-05-20T09:04:30',
    tiempo_registro_min: 4.5,
    registro_correcto: true,
    observaciones: 'Registro demo',
    nombre_destinatario: 'Pedro Huamán Quispe',
    dni_destinatario: '45678901',
    telefono_destinatario: '987654321',
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
    total_envio: 98,
    hora_inicio_registro: '2026-05-25T10:15:00',
    hora_fin_registro: '2026-05-25T10:17:20',
    tiempo_registro_min: 2.33,
    registro_correcto: true,
    nombre_destinatario: 'Lucía Mendoza Ríos',
    dni_destinatario: '70123456',
    telefono_destinatario: '912345678',
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
    nombre_destinatario: 'Jorge Medina Ponce',
    dni_destinatario: '47892345',
    telefono_destinatario: '923456789',
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
    observacion: null,
    estado_incidencia: 'abierta',
    fecha_reporte: '2026-05-26T11:00:00',
    envio: { codigo_envio: 'GLS-2026-00003' },
  },
];

let evidencias = [];
let mockDatamartHechos = 0;
const mockEtlEjecuciones = [];
let nextEnvioId = 4;
let nextClienteId = 6;
let nextIncidenciaId = 2;
let nextErrorId = 2;
let nextReporteId = 2;

const DNI_MASCARADO = '********';
const TELEFONO_MASCARADO = '*** *** ***';

let mockPresentacionActiva = false;
let mockMapaAlias = null;

const solicitaPresentacionMock = (config) => {
  const h = config.headers?.['X-Presentacion-Academica'] ?? config.headers?.['x-presentacion-academica'];
  return h === '1' || h === 'true';
};

const buildMockAliasMap = () => {
  const mapa = new Map();
  [...clientes].sort((a, b) => a.id_cliente - b.id_cliente).forEach((c, i) => {
    mapa.set(c.id_cliente, {
      alias: `Cliente POS-${String(i + 1).padStart(3, '0')}`,
      tipo_cliente: 'Muestra posprueba (demo)',
      total_envios: envios.filter((e) => e.id_cliente === c.id_cliente).length,
    });
  });
  return mapa;
};

const presentarClienteMock = (cliente) => {
  if (!cliente || !mockMapaAlias) return cliente;
  const meta = mockMapaAlias.get(cliente.id_cliente);
  const alias = meta?.alias || `Cliente GEN-${String(cliente.id_cliente).padStart(3, '0')}`;
  return {
    id_cliente: cliente.id_cliente,
    alias_academico: alias,
    nombre_completo: alias,
    razon_social: alias,
    dni: DNI_MASCARADO,
    telefono: TELEFONO_MASCARADO,
    activo: true,
    tipo_cliente: meta?.tipo_cliente || 'Operacional',
    total_envios: meta?.total_envios ?? 0,
    datos_anonimizados: true,
  };
};

const anonimizarEnvioMock = (envio) => {
  if (!envio || !mockPresentacionActiva) return envio;
  return {
    ...envio,
    cliente: presentarClienteMock(envio.cliente),
    datos_anonimizados: true,
  };
};

const anonimizarListaEnviosMock = (resultado) => {
  if (!mockPresentacionActiva || !resultado?.data) return resultado;
  return { ...resultado, data: resultado.data.map(anonimizarEnvioMock) };
};

const anonimizarIncidenciaMock = (inc) => {
  if (!mockPresentacionActiva || !inc?.envio) return inc;
  const envioBase = envios.find((e) => e.id_envio === inc.id_envio);
  return {
    ...inc,
    envio: envioBase
      ? anonimizarEnvioMock({ ...envioBase, ...inc.envio })
      : inc.envio,
  };
};

const ok = (data, message = 'OK') => Promise.resolve({ data: { success: true, message, data } });

const parseRequestBody = (config) => {
  const raw = config.data;
  if (raw instanceof FormData) {
    const obj = {};
    raw.forEach((value, key) => {
      obj[key] = value;
    });
    return obj;
  }
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw || '{}');
    } catch {
      return {};
    }
  }
  return raw || {};
};

const normalizeMockPath = (url) =>
  (url || '')
    .replace(/^https?:\/\/[^/]+/, '')
    .replace(/^\/api\/?/, '')
    .replace(/^\//, '')
    .split('?')[0];

const JORNADAS_FICHA = 20;
const VALOR_NA = 'N/A';

const diasPospruebaMock = () => {
  const dias = [];
  const cursor = new Date('2026-09-01T12:00:00');
  for (let i = 0; i < JORNADAS_FICHA; i += 1) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, '0');
    const d = String(cursor.getDate()).padStart(2, '0');
    dias.push(`${y}-${m}-${d}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return dias;
};

const fmtFechaFicha = (iso) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const jornadasMock = () =>
  diasPospruebaMock().map((iso, i) => {
    const nerd = 2 + (i % 4);
    const sumaTre = Math.round(nerd * (3.2 + (i % 5) * 0.15) * 100) / 100;
    const rce = i % 5 === 0 ? 1 : 0;
    const eea = Math.max(0, nerd - (i % 7 === 0 ? 1 : 0));
    const tid = i % 4 === 0 ? 0 : 1;
    const nioc = tid && i % 6 !== 0 ? 1 : 0;
    return { iso, nerd, sumaTre, rce, eea, tid, nioc };
  });

const ratioONa = (numerador, denominador, porcentaje = false) => {
  if (!denominador) return VALOR_NA;
  const valor = porcentaje ? (numerador / denominador) * 100 : numerador / denominador;
  return Math.round(valor * 100) / 100;
};

const buildFichaEficiencia = () =>
  jornadasMock().map(({ iso, nerd, sumaTre }) => ({
    fecha: fmtFechaFicha(iso),
    nerd,
    suma_tre: sumaTre,
    tpdre: ratioONa(sumaTre, nerd),
  }));

const buildFichaCalidad = () =>
  jornadasMock().map(({ iso, nerd, rce }) => ({
    fecha: fmtFechaFicha(iso),
    trd: nerd,
    rce,
    sin_error: nerd - rce,
    pdre: ratioONa(rce, nerd, true),
  }));

const buildFichaControl = () =>
  jornadasMock().map(({ iso, nerd, eea }) => ({
    fecha: fmtFechaFicha(iso),
    ted: nerd,
    eea,
    no_actualizado: nerd - eea,
    pdeea: ratioONa(eea, nerd, true),
  }));

const buildFichaInformacionOperativa = () =>
  jornadasMock().map(({ iso, tid, nioc }) => ({
    fecha: fmtFechaFicha(iso),
    tid,
    nioc,
    incompletas: Math.max(0, tid - nioc),
    pdioic: ratioONa(nioc, tid, true),
  }));

const buildMockReportData = (tipo) => {
  const headerMap = {
    envios_estado: [
      { key: 'estado', label: 'Estado' },
      { key: 'codigo', label: 'Código' },
      { key: 'cantidad', label: 'Cantidad de envíos' },
    ],
    tiempos: [
      { key: 'codigo', label: 'Código envío' },
      { key: 'cliente', label: 'Cliente' },
      { key: 'registro', label: 'Fecha registro' },
      { key: 'estimada', label: 'Entrega estimada' },
      { key: 'entrega', label: 'Entrega real' },
      { key: 'dias', label: 'Días de tránsito' },
    ],
    incidencias: [
      { key: 'envio', label: 'Código envío' },
      { key: 'tipo', label: 'Tipo' },
      { key: 'severidad', label: 'Severidad' },
      { key: 'titulo', label: 'Título' },
      { key: 'estado', label: 'Estado' },
      { key: 'fecha', label: 'Fecha reporte' },
    ],
    productividad: [
      { key: 'operador', label: 'Operador' },
      { key: 'envios_gestionados', label: 'Envíos gestionados' },
      { key: 'entregas', label: 'Entregas' },
      { key: 'incidencias_reportadas', label: 'Incidencias reportadas' },
    ],
  };

  switch (tipo) {
    case 'envios_estado':
      return {
        titulo: 'Reporte de envíos por estado',
        headers: headerMap.envios_estado,
        filas: estados.map((s) => ({
          estado: s.nombre,
          codigo: s.codigo,
          cantidad: envios.filter((e) => e.id_estado_actual === s.id_estado).length,
        })),
      };
    case 'tiempos':
      return {
        titulo: 'Reporte de tiempos de entrega',
        headers: headerMap.tiempos,
        filas: envios
          .filter((e) => e.estadoActual?.codigo === 'entregado')
          .map((e) => ({
            codigo: e.codigo_envio,
            cliente: mockPresentacionActiva
              ? presentarClienteMock(e.cliente).alias_academico
              : (e.cliente?.nombre_completo || e.cliente?.razon_social),
            registro: e.fecha_registro,
            estimada: '—',
            entrega: e.fecha_registro,
            dias: 2,
          })),
      };
    case 'incidencias':
      return {
        titulo: 'Reporte de incidencias operativas',
        headers: headerMap.incidencias,
        filas: incidencias.map((i) => ({
          envio: i.envio?.codigo_envio,
          tipo: i.tipo,
          severidad: i.severidad,
          titulo: i.titulo,
          estado: i.estado_incidencia,
          fecha: i.fecha_reporte,
        })),
      };
    case 'productividad':
      return {
        titulo: 'Reporte de productividad por operador',
        headers: headerMap.productividad,
        filas: [
          {
            operador: `${responsable.nombres} ${responsable.apellidos}`,
            envios_gestionados: envios.length,
            entregas: envios.filter((e) => e.estadoActual?.codigo === 'entregado').length,
            incidencias_reportadas: incidencias.length,
          },
        ],
      };
    default:
      return { titulo: 'Reporte', headers: [], filas: [] };
  }
};

const FICHA_CONFIG = {
  1: {
    titulo: 'Dimensión 1 - Eficiencia operativa (TPDRE)',
    indicador: 'TPDRE',
    columnas: ['fecha', 'nerd', 'suma_tre', 'tpdre'],
    labels: [
      'Fecha',
      'Número de envíos registrados (NERD)',
      'Sumatoria de tiempos de registro (min) (ΣTRE)',
      'Tiempo promedio diario de registro de envíos (min) (TPDRE)',
    ],
  },
  2: {
    titulo: 'Dimensión 2 - Calidad información (PDRE)',
    indicador: 'PDRE',
    columnas: ['fecha', 'trd', 'rce', 'sin_error', 'pdre'],
    labels: [
      'Fecha',
      'Total de registros evaluados (TRD)',
      'Registros con error (RCE)',
      'Registros sin error',
      'Porcentaje diario de registros con error (%) (PDRE)',
    ],
  },
  3: {
    titulo: 'Dimensión 3 - Control y seguimiento (PDEEA)',
    indicador: 'PDEEA',
    columnas: ['fecha', 'ted', 'eea', 'no_actualizado', 'pdeea'],
    labels: [
      'Fecha',
      'Total de envíos evaluados (TED)',
      'Envíos con estado actualizado (EEA)',
      'Envíos con estado no actualizado',
      'Porcentaje diario de envíos con estado actualizado (%) (PDEEA)',
    ],
  },
  4: {
    titulo: 'Dimensión 4 - Gestión de la información operativa (PDIOIC)',
    indicador: 'PDIOIC',
    columnas: ['fecha', 'tid', 'nioc', 'incompletas', 'pdioic'],
    labels: [
      'Fecha',
      'Total de incidencias evaluadas (TID)',
      'Incidencias con información completa (NIOC)',
      'Incidencias con información incompleta',
      'Porcentaje diario de incidencias con información completa (%) (PDIOIC)',
    ],
  },
};

const FICHA_MUESTRA = JORNADAS_FICHA;

const buildFichaExportPayload = (dim) => {
  const cfg = FICHA_CONFIG[dim];
  const builders = {
    1: buildFichaEficiencia,
    2: buildFichaCalidad,
    3: buildFichaControl,
    4: buildFichaInformacionOperativa,
  };
  const filas = builders[dim]?.() || [];
  const headers = cfg.columnas.map((key, i) => ({ key, label: cfg.labels[i] }));
  const ind = calcIndicadores();
  return {
    dimension: dim,
    titulo: cfg.titulo,
    indicador: cfg.indicador,
    columnas: cfg.columnas,
    labels: cfg.labels,
    headers,
    filas,
    total: filas.length,
    exportados: filas.length,
    limite: FICHA_MUESTRA,
    indicadores: {
      tpdre: ind.tpdre,
      pdre: ind.pdre,
      pdeea: ind.pdeea,
      pdioic: ind.pdioic,
    },
  };
};

const redondear = (v) => Math.round((Number(v) || 0) * 100) / 100;

const mediaDiariaMock = (filas, numeradorKey, denominadorKey, porcentaje = false) => {
  const valores = filas
    .map((f) => {
      const d = Number(f[denominadorKey]) || 0;
      if (!d) return null;
      const n = Number(f[numeradorKey]) || 0;
      return porcentaje ? (n / d) * 100 : n / d;
    })
    .filter((v) => v !== null);
  return valores.length ? redondear(valores.reduce((a, b) => a + b, 0) / valores.length) : 0;
};

const calcIndicadores = () => {
  const dias = jornadasMock();
  const tpdre = mediaDiariaMock(dias, 'sumaTre', 'nerd');
  const pdre = mediaDiariaMock(dias, 'rce', 'nerd', true);
  const pdeea = mediaDiariaMock(dias, 'eea', 'nerd', true);
  const pdioic = mediaDiariaMock(dias, 'nioc', 'tid', true);
  const nerd = dias.reduce((a, d) => a + d.nerd, 0);
  const sumaTre = redondear(dias.reduce((a, d) => a + d.sumaTre, 0));
  const rce = dias.reduce((a, d) => a + d.rce, 0);
  const eea = dias.reduce((a, d) => a + d.eea, 0);
  const tid = dias.reduce((a, d) => a + d.tid, 0);
  const nioc = dias.reduce((a, d) => a + d.nioc, 0);
  const nDias = dias.filter((d) => d.nerd > 0).length;
  const nDiasInc = dias.filter((d) => d.tid > 0).length;

  return {
    alcance: 'MUESTRA',
    grupo: 'POSPRUEBA',
    incluyeDatosSinteticos: false,
    unidadObservacion: 'jornada',
    nJornadas: JORNADAS_FICHA,
    nJornadasConDatos: nDias,
    tpdre,
    pdre,
    pdeea,
    pdioic,
    totalEnvios: nerd,
    totalIncidencias: tid,
    detalle: {
      tpdre: { suma_tre: sumaTre, nerd, n_jornadas: nDias, unidad: 'minutos', media_diaria: true },
      pdre: { rce, trd: nerd, n_jornadas: nDias, media_diaria: true },
      pdeea: { eea, ted: nerd, n_jornadas: nDias, media_diaria: true },
      pdioic: { nioc, tid, n_jornadas: nDiasInc, media_diaria: true },
    },
  };
};

const buildMedicionMock = () => {
  const base = calcIndicadores();
  return {
    posprueba: { ...base, grupo: 'POSPRUEBA' },
    ventanas: {
      posprueba: {
        anexo: 'Anexo 3',
        desde: '2026-09-01',
        hasta: '2026-09-20',
        fuente: 'Registros capturados desde la aplicación web.',
        registrados: base.totalEnvios,
        dentroDeVentana: JORNADAS_FICHA,
        esperadoJornadas: JORNADAS_FICHA,
        fueraDeVentana: 0,
        faltantes: 0,
        abierta: false,
        diasRestantes: 0,
      },
    },
    muestra: {
      esperadoPorGrupo: JORNADAS_FICHA,
      registradoPosprueba: JORNADAS_FICHA,
      completa: true,
      unidadObservacion: 'jornada',
    },
    datosSinteticos: {
      envios: 0,
      totalEnviosActivos: envios.length,
      nota: 'Modo demostración: cifras ilustrativas, no corresponden a la muestra de investigación.',
    },
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
      list = list.filter((e) => {
        const alias = mockPresentacionActiva
          ? presentarClienteMock(e.cliente)?.alias_academico?.toLowerCase()
          : e.cliente?.razon_social?.toLowerCase();
        return (
          e.codigo_envio.toLowerCase().includes(q) ||
          e.origen.toLowerCase().includes(q) ||
          e.destino.toLowerCase().includes(q) ||
          (alias && alias.includes(q))
        );
      });
    }
    if (params.estado) list = list.filter((e) => String(e.id_estado_actual) === String(params.estado));
    if (params.fechaDesde) list = list.filter((e) => e.fecha_registro >= params.fechaDesde);
    if (params.fechaHasta) list = list.filter((e) => e.fecha_registro <= params.fechaHasta);
    return ok(anonimizarListaEnviosMock({ data: list, total: list.length, page, limit }));
  },

  'GET /catalogos/estados': () => ok(estados),
  'GET /catalogos/clientes': (config) => {
    if (mockPresentacionActiva) {
      const q = (config.params?.search || '').toLowerCase();
      const limit = Math.min(Number(config.params?.limit) || (q ? 15 : 25), 100);
      const page = Math.max(1, Number(config.params?.page) || 1);
      let list = clientes.map((c) => presentarClienteMock(c));
      if (q) {
        list = list.filter(
          (c) =>
            c.alias_academico.toLowerCase().includes(q) ||
            String(c.id_cliente).includes(q)
        );
      }
      list.sort((a, b) => a.alias_academico.localeCompare(b.alias_academico));
      const total = list.length;
      const offset = (page - 1) * limit;
      const data = list.slice(offset, offset + limit);
      return ok({ data, total, page, limit, presentacion_academica: true });
    }
    const q = (config.params?.search || '').toLowerCase();
    const limit = Math.min(Number(config.params?.limit) || (q ? 15 : 25), 100);
    const page = Math.max(1, Number(config.params?.page) || 1);
    let list = [...clientes];
    if (q) {
      list = list.filter(
        (c) =>
          c.razon_social.toLowerCase().includes(q) ||
          (c.dni && c.dni.includes(q))
      );
    }
    list.sort((a, b) => a.razon_social.localeCompare(b.razon_social));
    const total = list.length;
    const offset = (page - 1) * limit;
    const data = list.slice(offset, offset + limit);
    return ok({ data, total, page, limit });
  },
  'GET /catalogos/clientes/check-dni': (config) => {
    const dni = String(config.params?.dni || '').replace(/\D/g, '');
    const cliente = clientes.find((c) => c.dni === dni) || null;
    const vista = cliente && mockPresentacionActiva ? presentarClienteMock(cliente) : cliente;
    return ok({ exists: Boolean(cliente), cliente: vista });
  },
  'GET /incidencias': (config) => {
    const params = config.params || {};
    let list = [...incidencias];
    if (params.estado) list = list.filter((i) => i.estado_incidencia === params.estado);
    if (params.tipo) list = list.filter((i) => i.tipo === params.tipo);
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Number(params.limit) || list.length;
    const offset = (page - 1) * limit;
    const data = list.slice(offset, offset + limit).map(anonimizarIncidenciaMock);
    return ok({ data, total: list.length, page, limit });
  },
  'GET /reportes/historial': () => ok(reportesHistorial),
  'GET /observacion/indicadores': () => ok(calcIndicadores()),
  'GET /observacion/medicion': () => ok(buildMedicionMock()),
  'GET /datamart/design': () =>
    ok({
      nombre: 'DataMart Operaciones Logísticas',
      version: '2.0.0',
      esquema: 'estrella',
      etl: { extraccion: 'Modo demo' },
      dashboardsBI: ['Panel OTIF'],
      tablas: {
        hechos: {
          fact_operaciones_logisticas: {
            grain: 'Una fila de la tabla de hechos representa una operación de envío',
            metricas: {
              peso_kg: { aditividad: 'aditiva' },
              dias_transito: { aditividad: 'semiaditiva' },
              cantidad_incidencias: { aditividad: 'aditiva' },
            },
          },
        },
      },
    }),
  'GET /datamart/etl/ejecuciones': () => ok(mockEtlEjecuciones),
  'GET /datamart/preview': () =>
    ok({
      totalHechos: mockDatamartHechos,
      hechosSinteticos: mockDatamartHechos,
      hechosReales: 0,
      ultimasEjecuciones: mockEtlEjecuciones,
      dimensiones: [
        { tabla: 'dim_fecha', registros: 1461 },
        { tabla: 'dim_cliente', registros: clientes.length },
        { tabla: 'dim_estado', registros: estados.length },
        { tabla: 'dim_operador', registros: 2 },
      ],
    }),
  'GET /datamart/analytics': () =>
    mockDatamartHechos > 0
      ? ok({
          otif_pct: 66.7,
          lead_time_promedio: 2.5,
          tasa_incidencias: 33.3,
          peso_promedio_kg: 425,
          envios_con_retraso: 1,
        })
      : ok(null),
  'POST /datamart/etl/run': () => {
    const previos = mockDatamartHechos;
    mockDatamartHechos = envios.length;
    const nuevos = Math.max(0, mockDatamartHechos - previos);
    const inicio = new Date();
    mockEtlEjecuciones.unshift({
      id_ejecucion: mockEtlEjecuciones.length + 1,
      proceso: 'staging_datamart',
      fecha_inicio: inicio.toISOString(),
      fecha_fin: new Date(inicio.getTime() + 1200).toISOString(),
      estado: 'EXITOSO',
      registros_extraidos: envios.length + incidencias.length + clientes.length,
      registros_transformados: envios.length,
      registros_cargados: nuevos,
      mensaje_error: null,
    });
    return ok({
      ok: true,
      filasCargadas: nuevos,
      filasActualizadas: mockDatamartHechos - nuevos,
      mensaje: nuevos
        ? `ETL completado: ${nuevos} hechos nuevos`
        : 'ETL completado sin hechos nuevos (proceso idempotente)',
    });
  },
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
  mockPresentacionActiva = solicitaPresentacionMock(config);
  mockMapaAlias = mockPresentacionActiva ? buildMockAliasMap() : null;

  const method = (config.method || 'get').toLowerCase();
  const path = normalizeMockPath(config.url);
  const body = parseRequestBody(config);

  const key = matchRoute(method, path);
  if (key === 'GET_ENVIO_ID') {
    const envio = envios.find((e) => e.id_envio === Number(path.split('/')[1]));
    if (!envio) return Promise.reject({ response: { data: { message: 'No encontrado' }, status: 404 } });
    return ok(anonimizarEnvioMock(envio));
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
    const payload = buildFichaExportPayload(dim);
    return ok({
      dimension: dim,
      titulo: payload.titulo,
      indicador: payload.indicador,
      columnas: payload.columnas,
      labels: payload.labels,
      data: payload.filas,
      total: payload.total,
      limite: payload.limite,
    });
  }
  if (key === 'GET_FICHA_EXPORT') {
    const dim = Number(path.split('/')[2]);
    return ok(buildFichaExportPayload(dim));
  }

  if (method === 'get' && path.match(/^reportes\/datos\/\w+$/)) {
    const tipo = path.split('/')[2];
    return ok(buildMockReportData(tipo));
  }

  const handlerKey = `${method.toUpperCase()} /${path}`;
  if (mockHandlers[handlerKey]) return mockHandlers[handlerKey](config);

  if (method === 'post' && path === 'envios') {
    if (!body.nombre_destinatario?.trim() || !/^\d{8}$/.test(String(body.dni_destinatario || '').replace(/\D/g, '')) || !body.telefono_destinatario?.trim()) {
      return Promise.reject({
        response: { status: 400, data: { message: 'Nombre, DNI y teléfono del destinatario son obligatorios' } },
      });
    }
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
    return ok(anonimizarEnvioMock(nuevo), 'Envío registrado (demo)');
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
    const dni = String(body.dni || '').replace(/\D/g, '');
    if (!/^\d{8}$/.test(dni)) {
      return Promise.reject({ response: { status: 400, data: { message: 'DNI inválido: debe tener exactamente 8 dígitos' } } });
    }
    if (clientes.some((c) => c.dni === dni)) {
      return Promise.reject({ response: { status: 409, data: { message: 'Ya existe un cliente con ese DNI. Búsquelo por DNI o nombre en el buscador.' } } });
    }
    const id = nextClienteId++;
    const nombre = body.nombre_completo || body.razon_social;
    const cliente = {
      id_cliente: id,
      activo: true,
      nombre_completo: nombre,
      razon_social: nombre,
      dni,
      telefono: body.telefono || null,
    };
    clientes.push(cliente);
    return ok(cliente);
  }

  if (method === 'put' && path.match(/^catalogos\/clientes\/\d+$/)) {
    const id = Number(path.split('/').pop());
    const idx = clientes.findIndex((c) => c.id_cliente === id);
    if (idx === -1) return Promise.reject({ response: { status: 404, data: { message: 'No encontrado' } } });
    const dni = String(body.dni || '').replace(/\D/g, '');
    if (!/^\d{8}$/.test(dni)) {
      return Promise.reject({ response: { status: 400, data: { message: 'DNI inválido: debe tener exactamente 8 dígitos' } } });
    }
    if (clientes.some((c) => c.dni === dni && c.id_cliente !== id)) {
      return Promise.reject({ response: { status: 409, data: { message: 'Ya existe un cliente con ese DNI. Búsquelo por DNI o nombre en el buscador.' } } });
    }
    const nombre = body.nombre_completo || body.razon_social;
    clientes[idx] = {
      ...clientes[idx],
      nombre_completo: nombre,
      razon_social: nombre,
      dni,
      telefono: body.telefono || null,
    };
    return ok(clientes[idx]);
  }

  if (method === 'delete' && path.match(/^evidencias\/\d+$/)) {
    const id = Number(path.split('/')[1]);
    evidencias = evidencias.filter((e) => e.id_evidencia !== id);
    return ok(null);
  }

  if (method === 'post' && path === 'observacion/errores-registro') {
    erroresRegistro.unshift({ id_error: nextErrorId++, ...body, id_usuario: 1 });
    return ok(body);
  }

  if (method === 'post' && path === 'reportes/generar') {
    const inicio = new Date();
    const tiempoMin = Math.round((Math.random() * 2 + 0.3) * 100) / 100;
    const fin = new Date(inicio.getTime() + tiempoMin * 60000);
    const datos = buildMockReportData(body.tipo);
    const rep = {
      id_reporte: nextReporteId++,
      titulo: datos.titulo,
      tipo_reporte: body.tipo,
      formato: body.formato,
      area_solicitante: body.area_solicitante || 'Operaciones',
      observaciones: body.observaciones,
      tiempo_generacion_min: tiempoMin,
      cantidad_registros: datos.filas.length,
      hora_inicio: inicio.toISOString(),
      hora_fin: fin.toISOString(),
      ruta_archivo: null,
      estado: 'generado',
    };
    reportesHistorial.unshift(rep);
    return ok({ reporte: rep, datos });
  }

  if (method === 'delete' && path.match(/^envios\/\d+$/)) {
    envios = envios.filter((e) => e.id_envio !== Number(path.split('/')[1]));
    return ok(null);
  }

  if (method === 'post' && path === 'auth/logout') return ok(null);
  if (method === 'post' && path === 'evidencias/upload') {
    const idEnvio = Number(body.id_envio);
    const nombre = body.archivo?.name || 'evidencia-demo.jpg';
    const ev = { id_evidencia: Date.now(), id_envio: idEnvio, nombre_archivo: nombre, ruta_archivo: '#' };
    evidencias.push(ev);
    return ok(ev);
  }

  return Promise.reject({ response: { status: 404, data: { message: `Mock: ${method} ${path}` } } });
};
