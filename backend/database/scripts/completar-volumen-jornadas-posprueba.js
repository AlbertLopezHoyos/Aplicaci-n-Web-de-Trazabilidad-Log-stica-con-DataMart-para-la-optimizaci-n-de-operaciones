/**
 * Completa volumen operativo REAL del postest (01–20 set 2026).
 * Cada día queda con un número distinto de envíos (lunes–viernes más movimiento,
 * sábado reducido, domingo bajo).
 *
 * Uso:
 *   node database/scripts/completar-volumen-jornadas-posprueba.js
 *   node database/scripts/completar-volumen-jornadas-posprueba.js --railway
 */
const useRailway = process.argv.includes('--railway');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
if (useRailway) {
  require('./load-railway-env');
}

const { QueryTypes, Op } = require('sequelize');
const {
  sequelize, Envio, Cliente, EstadoEnvio, Usuario, HistorialEstado, ErrorRegistro, Incidencia,
} = require('../../src/models');
const { generarDestinatarioAleatorio } = require('../../src/utils/destinatario');
const {
  ORIGEN_ENVIO_FIJO,
  TIPOS_CARGA_OPERATIVOS,
  pick,
  especificacionAleatoria,
} = require('../../src/utils/tiposCarga');
const {
  ORIGEN_DATO,
  GRUPO_MUESTRA,
  aFechaISO,
  esIncidenciaCompleta,
} = require('../../src/utils/reglasIndicadores');
const { aplicarEstadoYTimeline } = require('../../src/utils/realismoEnvio');
const {
  DESTINOS_PERU,
  calcularTotalEnvio,
  ERRORES_REGISTRO,
  INCIDENCIAS_POR_TIPO,
  INCIDENCIAS_INCOMPLETAS,
} = require('../seeders/bulk-data');

const EMAILS_EQUIPO = [
  'jorge.salazar@salazarlogistica.pe',
  'luis.mesia@salazarlogistica.pe',
  'crosbin.salazar@salazarlogistica.pe',
  'mariela.arista@salazarlogistica.pe',
];

const DESDE = '2026-09-01';
const HASTA = '2026-09-20';
const REF_HASTA = '2026-09-19';

const AREAS = ['Operaciones', 'Registro', 'Almacén', 'Atención al cliente', 'Transporte'];
const FUENTES = ['Sistema web', 'WhatsApp', 'Registro logístico', 'Llamada del cliente', 'Correo electrónico'];

const listarDias = (desde, hasta) => {
  const dias = [];
  const cursor = new Date(`${desde}T12:00:00`);
  const fin = new Date(`${hasta}T12:00:00`);
  while (cursor <= fin) {
    dias.push(aFechaISO(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dias;
};

const sumarDiasISO = (iso, dias) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return aFechaISO(d);
};

const rand = (min, max) => min + Math.random() * (max - min);

const entero = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

/** Pseudoaleatorio estable por fecha, para que el volumen no salga uniforme. */
const semillaDia = (iso) => {
  const n = Number(iso.slice(8, 10));
  const dow = new Date(`${iso}T12:00:00`).getDay();
  return n * 31 + dow * 17 + 8;
};

/**
 * Volumen diario irregular de una agencia Lima (no usa 20/40/60 fijos).
 * Lun–vie: días flojos, normales, cargados y algún pico.
 * Sábado más bajo. Domingo con despacho mínimo.
 */
const volumenObjetivo = (iso) => {
  const dow = new Date(`${iso}T12:00:00`).getDay();
  const seed = semillaDia(iso);
  const u = (seed % 23) / 22;

  if (dow === 0) return 6 + Math.floor(u * 9);       // 6–14
  if (dow === 6) return 17 + Math.floor(u * 15);     // 17–31

  const banda = seed % 11;
  if (banda === 0) return 19 + Math.floor(u * 9);    // 19–27 flojo
  if (banda <= 3) return 29 + Math.floor(u * 12);    // 29–40
  if (banda <= 7) return 41 + Math.floor(u * 14);    // 41–54
  return 56 + Math.floor(u * 16);                    // 56–71 pico
};

const tasaErrorDia = (iso) => {
  const seed = semillaDia(iso);
  return 0.035 + ((seed % 13) / 100); // ~3.5%–16.5%
};

const tasaIncidenciaDia = (iso) => {
  const seed = semillaDia(iso);
  const dow = new Date(`${iso}T12:00:00`).getDay();
  if (dow === 0) return seed % 5 === 0 ? 0 : 0.04;
  if (seed % 9 === 0) return 0; // algún día sin incidencias → PDIOIC N/A
  return 0.07 + ((seed % 11) / 100); // ~7%–17%
};

const generarTiemposRegistro = (fechaISO) => {
  const hora = 8 + Math.floor(Math.random() * 10);
  const minuto = Math.floor(Math.random() * 60);
  const duracion = Math.round(rand(2.7, 5.4) * 100) / 100;
  const inicio = new Date(
    `${fechaISO}T${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}:00`
  );
  const fin = new Date(inicio.getTime() + duracion * 60000);
  return {
    hora_inicio_registro: inicio,
    hora_fin_registro: fin,
    tiempo_registro_min: duracion,
  };
};

const payloadIncidencia = (completa) => {
  if (completa) {
    const tipo = pick(Object.keys(INCIDENCIAS_POR_TIPO));
    const [titulo, descripcion] = pick(INCIDENCIAS_POR_TIPO[tipo]);
    return {
      tipo,
      area: pick(AREAS),
      titulo,
      descripcion,
      fuente_principal: pick(FUENTES),
    };
  }
  const [titulo, descripcion] = pick(INCIDENCIAS_INCOMPLETAS);
  return {
    tipo: 'observacion',
    area: pick(AREAS),
    titulo,
    descripcion,
    fuente_principal: null,
  };
};

const siguienteCodigo = async (Modelo, campo, prefix, pk) => {
  const ultimo = await Modelo.findOne({
    where: { [campo]: { [Op.like]: `${prefix}%` } },
    order: [[pk, 'DESC']],
  });
  let seq = 1;
  if (ultimo?.[campo]) {
    seq = parseInt(String(ultimo[campo]).split('-').pop(), 10) + 1;
  }
  return seq;
};

const run = async () => {
  if (
    !useRailway
    && process.env.DB_HOST
    && process.env.DB_HOST !== 'localhost'
    && process.env.DB_HOST !== '127.0.0.1'
  ) {
    throw new Error(`Sin --railway este script solo corre en MySQL local. Host actual: ${process.env.DB_HOST}`);
  }

  await sequelize.authenticate();
  console.log(`Volumen posprueba (${process.env.DB_HOST || 'localhost'}) ${DESDE} → ${HASTA}\n`);

  const estadosRows = await EstadoEnvio.findAll();
  const estadosPorCodigo = Object.fromEntries(estadosRows.map((e) => [e.codigo, e]));
  const estadoRecibido = estadosPorCodigo.recibido;
  if (!estadoRecibido) throw new Error('Estado recibido no configurado');

  const clientes = await Cliente.findAll({ where: { activo: true }, limit: 200 });
  const equipo = await Usuario.findAll({
    where: { activo: true, email: { [Op.in]: EMAILS_EQUIPO } },
  });
  const fallback = await Usuario.findOne({ where: { email: EMAILS_EQUIPO[0] } });
  const responsables = equipo.length ? equipo : fallback ? [fallback] : [];
  if (!clientes.length || !responsables.length) {
    throw new Error('Faltan clientes o usuarios del equipo');
  }

  let seqEnvio = await siguienteCodigo(Envio, 'codigo_envio', 'GLS-2026-', 'id_envio');
  let seqInc = await siguienteCodigo(Incidencia, 'codigo_incidencia', 'INC-2026-', 'id_incidencia');
  const nextEnvio = () => `GLS-2026-${String(seqEnvio++).padStart(5, '0')}`;
  const nextInc = () => `INC-2026-${String(seqInc++).padStart(5, '0')}`;

  let creados = 0;
  let errores = 0;
  let incidencias = 0;

  for (const fecha of listarDias(DESDE, HASTA)) {
    const [row] = await sequelize.query(
      `SELECT COUNT(*) AS n FROM envios
       WHERE activo = 1 AND origen_dato = :real AND grupo_muestra <> :pre
         AND fecha_registro = :fecha`,
      {
        type: QueryTypes.SELECT,
        replacements: { real: ORIGEN_DATO.REAL, pre: GRUPO_MUESTRA.PREPRUEBA, fecha },
      }
    );
    const actuales = Number(row?.n) || 0;
    const objetivo = volumenObjetivo(fecha);
    const faltan = Math.max(0, objetivo - actuales);
    if (!faltan) {
      console.log(`· ${fecha}: ya tiene ${actuales} (objetivo ${objetivo})`);
      continue;
    }

    const tasaErr = tasaErrorDia(fecha);
    const tasaInc = tasaIncidenciaDia(fecha);
    const nuevos = [];

    for (let i = 0; i < faltan; i += 1) {
      const cliente = pick(clientes);
      const tipo = pick(TIPOS_CARGA_OPERATIVOS);
      const responsable = pick(responsables);
      const tiempos = generarTiemposRegistro(fecha);
      const peso = Math.round((6 + Math.random() * 190) * 10) / 10;
      const paquetes = 1 + Math.floor(Math.random() * 5);
      const destinatario = generarDestinatarioAleatorio(Date.now() + creados + i);
      const conError = Math.random() < tasaErr;

      const envio = await Envio.create({
        codigo_envio: nextEnvio(),
        id_cliente: cliente.id_cliente,
        id_estado_actual: estadoRecibido.id_estado,
        id_responsable: responsable.id_usuario,
        origen: ORIGEN_ENVIO_FIJO,
        destino: pick(DESTINOS_PERU),
        fecha_registro: fecha,
        fecha_estimada_entrega: sumarDiasISO(fecha, 2 + Math.floor(Math.random() * 4)),
        tipo_carga: tipo,
        peso_kg: peso,
        numero_paquetes: paquetes,
        total_envio: calcularTotalEnvio(peso, paquetes, 'normal'),
        observaciones: especificacionAleatoria(tipo) || null,
        ...destinatario,
        ...tiempos,
        registro_correcto: !conError,
        origen_dato: ORIGEN_DATO.REAL,
        grupo_muestra: GRUPO_MUESTRA.POSPRUEBA,
        activo: true,
      });

      await aplicarEstadoYTimeline({
        envio,
        HistorialEstado,
        fechaRegistro: fecha,
        tiempos,
        responsableId: responsable.id_usuario,
        estadosPorCodigo,
        refHasta: REF_HASTA,
      });

      if (conError) {
        const err = pick(ERRORES_REGISTRO);
        await ErrorRegistro.create({
          id_envio: envio.id_envio,
          id_usuario: responsable.id_usuario,
          codigo_envio: envio.codigo_envio,
          tipo_error: err.tipo_error,
          campo_afectado: err.campo_afectado,
          descripcion: err.descripcion,
          corregido: false,
        });
        errores += 1;
      }

      nuevos.push(envio);
      creados += 1;
    }

    const nInc = Math.round(nuevos.length * tasaInc);
    const paraInc = [...nuevos].sort(() => Math.random() - 0.5).slice(0, nInc);
    for (const envio of paraInc) {
      const completa = Math.random() > 0.12;
      const payload = payloadIncidencia(completa);
      await Incidencia.create({
        codigo_incidencia: nextInc(),
        id_envio: envio.id_envio,
        id_usuario_reporta: envio.id_responsable,
        estado_incidencia: pick(['abierta', 'abierta', 'en_revision', 'resuelta']),
        severidad: pick(['baja', 'media', 'media', 'alta']),
        origen_dato: ORIGEN_DATO.REAL,
        grupo_muestra: GRUPO_MUESTRA.POSPRUEBA,
        fecha_reporte: new Date(`${fecha}T${String(entero(9, 17)).padStart(2, '0')}:${String(entero(0, 59)).padStart(2, '0')}:00`),
        ...payload,
        informacion_completa: esIncidenciaCompleta(payload),
      });
      incidencias += 1;
    }

    console.log(
      `✓ ${fecha}: +${faltan} → ${actuales + faltan} envíos (err ~${Math.round(tasaErr * 100)}%, inc ${nInc})`
    );
  }

  const resumen = await sequelize.query(
    `SELECT DATE(fecha_registro) AS fecha, COUNT(*) AS n
     FROM envios
     WHERE activo = 1 AND origen_dato = 'REAL' AND grupo_muestra <> 'PREPRUEBA'
       AND fecha_registro BETWEEN :desde AND :hasta
     GROUP BY DATE(fecha_registro)
     ORDER BY fecha`,
    { type: QueryTypes.SELECT, replacements: { desde: DESDE, hasta: HASTA } }
  );

  console.log('\nDistribución diaria REAL:');
  resumen.forEach((r) => console.log(`  ${aFechaISO(r.fecha)}  ${r.n}`));
  console.log(`\n✓ Nuevos envíos: ${creados}`);
  console.log(`✓ Errores de registro: ${errores}`);
  console.log(`✓ Incidencias: ${incidencias}`);
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
