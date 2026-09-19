/**
 * Agrega envíos REALES en posprueba (días laborables, sin domingos).
 * Por defecto captura hasta 2026-09-19 (último día hábil del postest).
 *
 * Uso:
 *   npm run db:agregar-captura-posprueba:railway
 */
const useRailway = process.argv.includes('--railway');
const hastaArg = process.argv.find((a) => a.startsWith('--hasta='));
const desdeArg = process.argv.find((a) => a.startsWith('--desde='));
const DESDE_FORZADO = desdeArg ? desdeArg.split('=')[1] : null;
const COMPLETAR_MIN = process.argv.includes('--completar-min');
const minPorDiaArg = process.argv.find((a) => a.startsWith('--min-por-dia='));
const MIN_POR_DIA = minPorDiaArg ? Number(minPorDiaArg.split('=')[1]) : 6;

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
if (useRailway) {
  require('./load-railway-env');
}

const { QueryTypes } = require('sequelize');
const {
  sequelize, Envio, Cliente, EstadoEnvio, Usuario, HistorialEstado,
} = require('../../src/models');
const { generarCodigoEnvio } = require('../../src/utils/codigoEnvio');
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
  VENTANAS_MEDICION,
  aFechaISO,
  ULTIMO_DIA_CAPTURA_POSPRUEBA,
  DOMINGOS_POSPRUEBA,
  esDiaLaborablePosprueba,
  listarDiasLaborablesPosprueba,
  fechaLaborableSustituto,
  capturaHastaPosprueba,
} = require('../../src/utils/reglasIndicadores');
const { aplicarEstadoYTimeline } = require('../../src/utils/realismoEnvio');
const {
  DESTINOS_PERU,
  calcularTotalEnvio,
} = require('../seeders/bulk-data');

const EMAILS_EQUIPO = [
  'jorge.salazar@salazarlogistica.pe',
  'luis.mesia@salazarlogistica.pe',
  'crosbin.salazar@salazarlogistica.pe',
  'mariela.arista@salazarlogistica.pe',
];

const DESDE_VENTANA = VENTANAS_MEDICION[GRUPO_MUESTRA.POSPRUEBA].desde;
const HASTA = hastaArg ? hastaArg.split('=')[1] : ULTIMO_DIA_CAPTURA_POSPRUEBA;

const sumarDiasISO = (iso, dias) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return aFechaISO(d);
};

const rand = (min, max) => min + Math.random() * (max - min);

const generarTiemposRegistro = (fechaISO) => {
  const hora = 8 + Math.floor(Math.random() * 9);
  const minuto = Math.floor(Math.random() * 60);
  const duracion = Math.round(rand(3, 5) * 100) / 100;
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

const enviosPorDia = () => 5 + Math.floor(Math.random() * 4);

const migrarDomingos = async () => {
  let movidos = 0;
  for (const domingo of DOMINGOS_POSPRUEBA) {
    const destino = fechaLaborableSustituto(domingo);
    const envios = await Envio.findAll({
      where: {
        activo: true,
        origen_dato: ORIGEN_DATO.REAL,
        fecha_registro: domingo,
      },
    });
    for (const envio of envios) {
      await envio.update({ fecha_registro: destino });
      movidos += 1;
    }
  }
  return movidos;
};

const siguienteDiaLaborable = (iso) => {
  let cursor = iso;
  for (let i = 0; i < 8; i += 1) {
    cursor = sumarDiasISO(cursor, 1);
    if (esDiaLaborablePosprueba(cursor)) return cursor;
  }
  return null;
};

const run = async () => {
  await sequelize.authenticate();
  const tope = HASTA > ULTIMO_DIA_CAPTURA_POSPRUEBA ? ULTIMO_DIA_CAPTURA_POSPRUEBA : HASTA;
  const refHasta = esDiaLaborablePosprueba(tope) ? tope : fechaLaborableSustituto(tope);

  const movidos = await migrarDomingos();
  if (movidos) console.log(`✓ Envíos reubicados desde domingo: ${movidos}`);

  const [maxRow] = await sequelize.query(
    `SELECT MAX(fecha_registro) AS ultima
     FROM envios
     WHERE activo = 1
       AND origen_dato = :real
       AND fecha_registro BETWEEN :desde AND :tope`,
    {
      type: QueryTypes.SELECT,
      replacements: { real: ORIGEN_DATO.REAL, desde: DESDE_VENTANA, tope: refHasta },
    }
  );

  const ultima = maxRow?.ultima ? aFechaISO(maxRow.ultima) : null;
  let inicioCaptura = DESDE_FORZADO || (ultima ? siguienteDiaLaborable(ultima) : DESDE_VENTANA);
  if (!inicioCaptura || inicioCaptura > refHasta) {
    inicioCaptura = null;
  }

  console.log(`Captura posprueba (${process.env.DB_HOST})`);
  console.log(`Última fecha REAL: ${ultima || '(ninguna)'}`);
  console.log(`Rango objetivo (solo días laborables): ${inicioCaptura || '(ninguno)'} → ${refHasta}\n`);

  const estadosRows = await EstadoEnvio.findAll();
  const estadosPorCodigo = Object.fromEntries(estadosRows.map((e) => [e.codigo, e]));
  const estadoRecibido = estadosPorCodigo.recibido;
  if (!estadoRecibido) throw new Error('Estado recibido no configurado');

  const clientes = await Cliente.findAll({ where: { activo: true }, limit: 100 });
  const equipo = await Usuario.findAll({
    where: { activo: true, email: { [require('sequelize').Op.in]: EMAILS_EQUIPO } },
  });
  const fallback = await Usuario.findOne({ where: { email: EMAILS_EQUIPO[0] } });
  const responsables = equipo.length ? equipo : fallback ? [fallback] : [];
  if (!clientes.length || !responsables.length) {
    throw new Error('Faltan clientes o usuarios del equipo para crear envíos');
  }

  let creados = 0;
  const diasNuevos = inicioCaptura
    ? listarDiasLaborablesPosprueba(inicioCaptura, refHasta)
    : [];

  for (const fecha of diasNuevos) {
    let cantidad = enviosPorDia();
    if (COMPLETAR_MIN) {
      const [row] = await sequelize.query(
        `SELECT COUNT(*) AS n FROM envios
         WHERE activo = 1 AND origen_dato = :real AND fecha_registro = :fecha`,
        { type: QueryTypes.SELECT, replacements: { real: ORIGEN_DATO.REAL, fecha } }
      );
      const actuales = Number(row?.n) || 0;
      cantidad = Math.max(0, MIN_POR_DIA - actuales);
      if (cantidad === 0) {
        console.log(`· ${fecha}: ya tiene ${actuales} envío(s) REAL`);
        continue;
      }
    }
    for (let i = 0; i < cantidad; i += 1) {
      const cliente = pick(clientes);
      const tipo = pick(TIPOS_CARGA_OPERATIVOS);
      const responsable = pick(responsables);
      const tiempos = generarTiemposRegistro(fecha);
      const peso = Math.round((8 + Math.random() * 180) * 10) / 10;
      const paquetes = 1 + Math.floor(Math.random() * 4);
      const codigo = await generarCodigoEnvio();
      const destinatario = generarDestinatarioAleatorio(Date.now() + creados + i);

      const envio = await Envio.create({
        codigo_envio: codigo,
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
        registro_correcto: true,
        origen_dato: ORIGEN_DATO.REAL,
        grupo_muestra: GRUPO_MUESTRA.NO_MUESTRA,
        activo: true,
      });

      await aplicarEstadoYTimeline({
        envio,
        HistorialEstado,
        fechaRegistro: fecha,
        tiempos,
        responsableId: responsable.id_usuario,
        estadosPorCodigo,
        refHasta,
      });
      creados += 1;
    }
    console.log(`✓ ${fecha}: ${cantidad} envío(s) REAL`);
  }

  const enviosVentana = await Envio.findAll({
    where: {
      activo: true,
      origen_dato: ORIGEN_DATO.REAL,
      fecha_registro: { [require('sequelize').Op.between]: [DESDE_VENTANA, refHasta] },
    },
    order: [['id_envio', 'ASC']],
  });

  let recalculados = 0;
  for (const envio of enviosVentana) {
    let fecha = aFechaISO(envio.fecha_registro);
    if (!esDiaLaborablePosprueba(fecha)) {
      fecha = fechaLaborableSustituto(fecha);
      await envio.update({ fecha_registro: fecha });
    }
    const tiempos = {
      hora_inicio_registro: envio.hora_inicio_registro || new Date(`${fecha}T09:00:00`),
      hora_fin_registro: envio.hora_fin_registro || envio.hora_inicio_registro,
      tiempo_registro_min: envio.tiempo_registro_min || 4,
    };
    await aplicarEstadoYTimeline({
      envio,
      HistorialEstado,
      fechaRegistro: fecha,
      tiempos,
      responsableId: envio.id_responsable,
      estadosPorCodigo,
      refHasta,
    });
    recalculados += 1;
  }

  console.log(`\n✓ Envíos nuevos: ${creados}`);
  console.log(`✓ Estados recalculados: ${recalculados}`);
  console.log(`✓ Captura hasta (día hábil): ${refHasta}`);
  console.log(`✓ Domingos excluidos: ${DOMINGOS_POSPRUEBA.join(', ')}`);
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
