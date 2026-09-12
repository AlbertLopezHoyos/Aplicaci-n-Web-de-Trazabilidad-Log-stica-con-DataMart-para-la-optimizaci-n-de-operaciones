const { aFechaISO } = require('./reglasIndicadores');

const ESTADO_EQUIVALENCIAS = Object.freeze({
  recibido: ['recibido', 'RECIBIDO'],
  en_transito: ['en_transito', 'en transito', 'en tránsito', 'transito', 'tránsito'],
  entregado: ['entregado', 'ENTREGADO'],
  retrasado: ['retrasado', 'RETRASADO'],
});

const normalizar = (v) => String(v || '').trim().toLowerCase();

const resolverEstado = (estadosPorCodigo, codigoObjetivo) => {
  if (!estadosPorCodigo) return null;
  if (estadosPorCodigo[codigoObjetivo]) return estadosPorCodigo[codigoObjetivo];
  const candidatos = ESTADO_EQUIVALENCIAS[codigoObjetivo] || [codigoObjetivo];
  const entries = Object.values(estadosPorCodigo);
  return entries.find((estado) => {
    const codigo = normalizar(estado?.codigo);
    const nombre = normalizar(estado?.nombre);
    return candidatos.some((c) => {
      const val = normalizar(c);
      return codigo === val || nombre === val;
    });
  }) || null;
};

const diasEntre = (desdeISO, hastaISO) => {
  const a = new Date(`${desdeISO}T12:00:00`);
  const b = new Date(`${hastaISO}T12:00:00`);
  const dias = Math.round((b - a) / 86400000);
  return Number.isFinite(dias) ? Math.max(0, dias) : 0;
};

const sumarDiasISO = (iso, dias) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return aFechaISO(d);
};

const fechaHoraEnDia = (fechaISO, diasOffset, hora = 10, minuto = 0) =>
  new Date(
    `${sumarDiasISO(fechaISO, diasOffset)}T${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}:00`
  );

/**
 * Entregado solo si han pasado al menos 3 días desde el registro.
 * refHasta = ayer (captura operativa).
 */
const codigoEstadoPorAntiguedad = (dias, rng = Math.random()) => {
  if (dias < 1) return 'recibido';
  if (dias < 3) {
    if (dias >= 2 && rng < 0.1) return 'retrasado';
    return 'en_transito';
  }
  if (rng < 0.8) return 'entregado';
  if (rng < 0.93) return 'en_transito';
  return 'retrasado';
};

const COMENTARIO_REGISTRO = 'Registro inicial en almacén Lima';

const aplicarEstadoYTimeline = async ({
  envio,
  HistorialEstado,
  fechaRegistro,
  tiempos,
  responsableId,
  estadosPorCodigo,
  refHasta,
}) => {
  const dias = diasEntre(fechaRegistro, refHasta);
  const codigoFinal = codigoEstadoPorAntiguedad(dias);
  const estadoRecibido = resolverEstado(estadosPorCodigo, 'recibido');
  const estadoTransito = resolverEstado(estadosPorCodigo, 'en_transito');
  const estadoEntregado = resolverEstado(estadosPorCodigo, 'entregado');
  const estadoRetrasado = resolverEstado(estadosPorCodigo, 'retrasado');
  const estadoFinal = resolverEstado(estadosPorCodigo, codigoFinal) || estadoRecibido;
  if (!estadoRecibido || !estadoFinal) return;

  const uid = responsableId ?? envio.id_responsable;
  await HistorialEstado.destroy({ where: { id_envio: envio.id_envio } });

  const entradas = [{
    id_envio: envio.id_envio,
    id_estado: estadoRecibido.id_estado,
    id_usuario: uid,
    comentario: COMENTARIO_REGISTRO,
    fecha_hora: tiempos.hora_inicio_registro,
  }];

  if (dias >= 1 && codigoFinal !== 'recibido' && estadoTransito) {
    entradas.push({
      id_envio: envio.id_envio,
      id_estado: estadoTransito.id_estado,
      id_usuario: uid,
      comentario: 'Salida de almacén hacia destino',
      fecha_hora: fechaHoraEnDia(fechaRegistro, 1, 9 + Math.floor(Math.random() * 3)),
    });
  }

  if (codigoFinal === 'entregado' && estadoEntregado) {
    const diaEntrega = Math.max(3, Math.min(dias, 3 + Math.floor(Math.random() * Math.min(dias - 2, 5))));
    entradas.push({
      id_envio: envio.id_envio,
      id_estado: estadoEntregado.id_estado,
      id_usuario: uid,
      comentario: 'Entrega confirmada al destinatario',
      fecha_hora: fechaHoraEnDia(fechaRegistro, diaEntrega, 11 + Math.floor(Math.random() * 5)),
    });
  } else if (codigoFinal === 'retrasado' && estadoRetrasado) {
    entradas.push({
      id_envio: envio.id_envio,
      id_estado: estadoRetrasado.id_estado,
      id_usuario: uid,
      comentario: 'Demora en ruta reportada por el conductor',
      fecha_hora: fechaHoraEnDia(fechaRegistro, Math.max(1, dias), 14),
    });
  }

  for (const entrada of entradas) {
    await HistorialEstado.create(entrada);
  }

  const ultima = entradas[entradas.length - 1];
  await envio.update({
    id_estado_actual: estadoFinal.id_estado,
    fecha_entrega_real: codigoFinal === 'entregado' ? aFechaISO(ultima.fecha_hora) : null,
  });
};

module.exports = {
  diasEntre,
  codigoEstadoPorAntiguedad,
  COMENTARIO_REGISTRO,
  aplicarEstadoYTimeline,
};
