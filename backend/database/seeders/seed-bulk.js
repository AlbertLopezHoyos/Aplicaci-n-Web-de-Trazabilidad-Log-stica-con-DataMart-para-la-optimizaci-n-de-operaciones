/**
 * Generador de DATOS SINTÉTICOS para las pruebas técnicas del DataMart.
 *
 * Los registros producidos por este script NO provienen de la empresa: son
 * datos generados artificialmente porque los datos históricos reales están
 * sujetos a restricciones de confidencialidad. Sirven únicamente para probar
 * el ETL, el esquema estrella, las consultas analíticas, los dashboards y el
 * volumen (>5000 filas).
 *
 * Todos los registros se marcan con origen_dato = 'SINTETICO' y
 * grupo_muestra = 'NO_MUESTRA', por lo que quedan EXCLUIDOS de los
 * indicadores de investigación (TPRE, PER, PEEA, PIOIC) y del contraste de
 * hipótesis de la tesis.
 *
 * Uso: npm run db:seed-bulk
 *      BULK_COUNT=5500 npm run db:seed-bulk
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { sequelize, Envio, EstadoEnvio, Cliente, Incidencia, Usuario } = require('../../src/models');
const { QueryTypes } = require('sequelize');
const {
  ORIGENES_LIMA,
  DESTINOS_PERU,
  TIPOS_CARGA,
  AREAS,
  FUENTES,
  TIPOS_INC,
  NOMBRES_CLIENTES,
  dniFromIndex,
  calcularTotalEnvio,
  pick,
  randomInt,
  randomDate,
  addDays,
  resolveEstadoOperativo,
  REF_DATE,
} = require('./bulk-data');
const { ORIGEN_DATO, GRUPO_MUESTRA, esIncidenciaCompleta } = require('../../src/utils/reglasIndicadores');

const TARGET = parseInt(process.env.BULK_COUNT || '5500', 10);
const BATCH = parseInt(process.env.BULK_BATCH || '500', 10);
const EXTRA_CLIENTES = parseInt(process.env.BULK_CLIENTES || '45', 10);

const padCodigo = (year, n) => `GLS-${year}-${String(n).padStart(5, '0')}`;
const padInc = (n) => `INC-2026-${String(n).padStart(5, '0')}`;

const ensureClientes = async () => {
  const existing = await Cliente.count();
  if (existing >= 5 + EXTRA_CLIENTES) {
    return Cliente.findAll({ where: { activo: true } });
  }
  const toCreate = [];
  for (let i = existing + 1; i <= 5 + EXTRA_CLIENTES; i++) {
    const idx = (i - 1) % NOMBRES_CLIENTES.length;
    toCreate.push({
      razon_social: `${NOMBRES_CLIENTES[idx] || `Cliente ${String(i).padStart(3, '0')}`}${i > NOMBRES_CLIENTES.length ? ` (${i})` : ''}`,
      dni: null,
      telefono: null,
    });
  }
  if (toCreate.length) {
    await Cliente.bulkCreate(toCreate, { ignoreDuplicates: true });
    console.log(`✓ ${toCreate.length} clientes adicionales creados`);
  }
  return Cliente.findAll({ where: { activo: true } });
};

const buildEnvioRow = (seq, estadoMap, clientes, operadorId) => {
  const fechaRegistro = randomDate('2024-01-01', REF_DATE);
  const year = fechaRegistro.slice(0, 4);
  const { estadoCodigo, fechaEstimada, fechaEntregaReal } = resolveEstadoOperativo(fechaRegistro);

  const cliente = clientes[randomInt(0, clientes.length - 1)];
  const tiempoReg = Math.round((Math.random() * 8 + 1) * 100) / 100;

  const peso = randomInt(5, 2500);
  const paquetes = randomInt(1, 40);
  const prioridad = pick(['baja', 'normal', 'normal', 'normal', 'alta', 'urgente']);
  const destIdx = randomInt(0, NOMBRES_CLIENTES.length - 1);

  return {
    codigo_envio: padCodigo(year, seq),
    id_cliente: cliente.id_cliente,
    id_estado_actual: estadoMap[estadoCodigo],
    id_responsable: operadorId,
    origen: pick(ORIGENES_LIMA),
    destino: pick(DESTINOS_PERU),
    fecha_registro: fechaRegistro,
    fecha_estimada_entrega: fechaEstimada,
    fecha_entrega_real: fechaEntregaReal,
    tipo_carga: pick(TIPOS_CARGA),
    peso_kg: peso,
    numero_paquetes: paquetes,
    total_envio: calcularTotalEnvio(peso, paquetes, prioridad),
    tiempo_registro_min: tiempoReg,
    registro_correcto: Math.random() > 0.08,
    observaciones: 'Dato sintético — carga masiva DataMart Tesis 2026',
    nombre_destinatario: NOMBRES_CLIENTES[destIdx],
    dni_destinatario: dniFromIndex(seq),
    telefono_destinatario: `9${String(10000000 + randomInt(0, 89999999)).slice(0, 8)}`,
    prioridad,
    activo: 1,
    origen_dato: ORIGEN_DATO.SINTETICO,
    grupo_muestra: GRUPO_MUESTRA.NO_MUESTRA,
  };
};

const run = async () => {
  const t0 = Date.now();
  try {
    await sequelize.authenticate();
    console.log(`Conectado a MySQL — objetivo: ${TARGET} envíos activos`);

    const current = await Envio.count({ where: { activo: true } });
    if (current >= TARGET) {
      console.log(`Ya hay ${current} envíos (>= ${TARGET}). Nada que generar.`);
      process.exit(0);
    }

    const toGenerate = TARGET - current;
    console.log(`Generando ${toGenerate} envíos adicionales (actual: ${current})...`);

    const estados = await EstadoEnvio.findAll();
    const estadoMap = Object.fromEntries(estados.map((e) => [e.codigo, e.id_estado]));
    const clientes = await ensureClientes();
    const operador = await Usuario.findOne({ where: { email: 'operador@salazarlogistica.pe' } });
    const operadorId = operador?.id_usuario || null;

    const [{ maxNum }] = await sequelize.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(codigo_envio, '-', -1) AS UNSIGNED)), 0) AS maxNum FROM envios`,
      { type: QueryTypes.SELECT }
    );
    let seq = Number(maxNum) + 1;

    let created = 0;
    while (created < toGenerate) {
      const chunk = Math.min(BATCH, toGenerate - created);
      const rows = [];
      for (let i = 0; i < chunk; i++) {
        rows.push(buildEnvioRow(seq++, estadoMap, clientes, operadorId));
      }
      await Envio.bulkCreate(rows);
      created += chunk;
      process.stdout.write(`\r  Envíos: ${created}/${toGenerate}`);
    }
    console.log('\n✓ Envíos masivos insertados');

    const incidenciaRate = parseFloat(process.env.BULK_INCIDENCIA_RATE || '0.18');
    const envioIds = await Envio.findAll({
      attributes: ['id_envio'],
      where: { activo: true },
      order: [['id_envio', 'DESC']],
      limit: toGenerate,
      raw: true,
    });

    const incTarget = Math.floor(envioIds.length * incidenciaRate);
    const shuffled = envioIds.sort(() => Math.random() - 0.5).slice(0, incTarget);
    const [{ maxInc }] = await sequelize.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(codigo_incidencia, '-', -1) AS UNSIGNED)), 0) AS maxInc FROM incidencias`,
      { type: QueryTypes.SELECT }
    );
    let incSeq = Number(maxInc) + 1;

    const incRows = shuffled.map(({ id_envio }) => {
      const tipo = pick(TIPOS_INC);
      // Una parte de las incidencias sintéticas se genera con campos obligatorios
      // vacíos para poder ejercitar el criterio PIOIC de información completa.
      const completa = Math.random() > 0.12;
      const fila = {
        id_envio,
        id_usuario_reporta: operadorId,
        codigo_incidencia: padInc(incSeq++),
        tipo,
        severidad: pick(['baja', 'media', 'media', 'alta', 'critica']),
        area: completa ? pick(AREAS) : null,
        fuente_principal: completa ? pick(FUENTES) : null,
        titulo: completa ? `Incidencia ${tipo} operativa` : 'Incidencia sin detalle',
        descripcion: completa
          ? 'Dato sintético generado para pruebas de volumen del DataMart.'
          : 'Falta detalle operativo.',
        estado_incidencia: pick(['abierta', 'en_revision', 'resuelta', 'cerrada']),
        origen_dato: ORIGEN_DATO.SINTETICO,
        grupo_muestra: GRUPO_MUESTRA.NO_MUESTRA,
      };
      return { ...fila, informacion_completa: esIncidenciaCompleta(fila) };
    });

    for (let i = 0; i < incRows.length; i += BATCH) {
      await Incidencia.bulkCreate(incRows.slice(i, i + BATCH));
    }
    console.log(`✓ ${incRows.length} incidencias generadas (~${Math.round(incidenciaRate * 100)}% envíos)`);

    const total = await Envio.count({ where: { activo: true } });
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`\nListo: ${total} envíos activos en ${elapsed}s`);
    console.log('Siguiente paso: npm run db:etl  (o Ejecutar ETL desde /datamart)');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
