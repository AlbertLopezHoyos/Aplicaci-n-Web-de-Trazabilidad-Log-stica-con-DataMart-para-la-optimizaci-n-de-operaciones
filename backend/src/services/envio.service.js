const { Envio, HistorialEstado, EstadoEnvio, Auditoria } = require('../models');
const envioRepo = require('../repositories/envio.repository');
const { generarCodigoEnvio } = require('../utils/codigoEnvio');
const { sanitizeObject } = require('../utils/sanitize');
const { ORIGEN_ENVIO_FIJO, esTipoCargaValido } = require('../utils/tiposCarga');
const anonimizacion = require('./anonimizacion.service');

const normalizarEnvioOperativo = (clean) => {
  clean.origen = ORIGEN_ENVIO_FIJO;
  if (clean.tipo_carga !== undefined && clean.tipo_carga !== '' && !esTipoCargaValido(clean.tipo_carga)) {
    throw Object.assign(new Error('Tipo de carga inválido. Use: frágil, general o vulnerable.'), {
      statusCode: 400,
    });
  }
  return clean;
};

const calcularTiemposRegistro = (horaInicio) => {
  const inicio = horaInicio ? new Date(horaInicio) : new Date();
  const fin = new Date();
  const diffMs = fin - inicio;
  const minutos = Math.round((diffMs / 60000) * 100) / 100;
  return { hora_inicio_registro: inicio, hora_fin_registro: fin, tiempo_registro_min: minutos };
};

const list = async (filters, { presentacionAcademica = false } = {}) => {
  const resultado = await envioRepo.findAllPaginated({
    ...filters,
    presentacionAcademica,
  });
  if (!presentacionAcademica) return resultado;
  return anonimizacion.anonimizarListaEnvios(resultado);
};

const getById = async (id, { presentacionAcademica = false } = {}) => {
  const envio = await envioRepo.findById(id);
  if (!envio || !envio.activo) throw Object.assign(new Error('Envío no encontrado'), { statusCode: 404 });
  if (!presentacionAcademica) return envio;
  return anonimizacion.anonimizarEnvioUnico(envio);
};

const create = async (data, userId, opciones = {}) => {
  const clean = normalizarEnvioOperativo(sanitizeObject(data, ['origen', 'destino', 'tipo_carga', 'observaciones']));
  const codigo = await generarCodigoEnvio();
  const estadoInicial = await EstadoEnvio.findOne({ where: { codigo: 'recibido' } });
  if (!estadoInicial) {
    throw Object.assign(new Error('Estado inicial no configurado — ejecute el seed de la base de datos'), {
      statusCode: 503,
    });
  }

  const tiempos = calcularTiemposRegistro(clean.hora_inicio_registro);
  const peso = parseFloat(clean.peso_kg);
  if (clean.peso_kg !== undefined && clean.peso_kg !== '' && (Number.isNaN(peso) || peso < 0)) {
    throw Object.assign(new Error('Peso inválido'), { statusCode: 400 });
  }
  const total = parseFloat(clean.total_envio);
  if (clean.total_envio !== undefined && clean.total_envio !== '' && (Number.isNaN(total) || total < 0)) {
    throw Object.assign(new Error('Total del envío inválido'), { statusCode: 400 });
  }

  const envio = await Envio.create({
    ...clean,
    codigo_envio: codigo,
    id_estado_actual: clean.id_estado_actual || estadoInicial.id_estado,
    id_responsable: clean.id_responsable || userId,
    fecha_registro: clean.fecha_registro || new Date().toISOString().split('T')[0],
    numero_paquetes: parseInt(clean.numero_paquetes, 10) || 1,
    peso_kg: Number.isNaN(peso) ? 0 : peso,
    total_envio: Number.isNaN(total) ? 0 : total,
    ...tiempos,
    registro_correcto: true,
  });

  // Hito inicial de trazabilidad: sin él el envío nace sin historial y PEEA
  // lo contaría como no actualizado hasta el primer cambio de estado.
  await HistorialEstado.create({
    id_envio: envio.id_envio,
    id_estado: envio.id_estado_actual,
    id_usuario: userId,
    comentario: 'Envío registrado en el sistema',
    fecha_hora: tiempos.hora_fin_registro || new Date(),
  });

  await Auditoria.create({
    id_usuario: userId,
    tabla_afectada: 'envios',
    accion: 'INSERT',
    registro_id: String(envio.id_envio),
    datos_nuevos: {
      codigo_envio: codigo,
      tiempo_registro_min: tiempos.tiempo_registro_min,
    },
  });

  anonimizacion.invalidarCache();
  return getById(envio.id_envio, opciones);
};

const update = async (id, data, userId, opciones = {}) => {
  const envio = await Envio.findByPk(id);
  if (!envio || !envio.activo) throw Object.assign(new Error('Envío no encontrado'), { statusCode: 404 });
  const clean = normalizarEnvioOperativo(sanitizeObject(data, ['origen', 'destino', 'tipo_carga', 'observaciones']));
  if (clean.numero_paquetes !== undefined) clean.numero_paquetes = parseInt(clean.numero_paquetes, 10) || 1;
  if (clean.total_envio !== undefined) {
    const total = parseFloat(clean.total_envio);
    if (Number.isNaN(total) || total < 0) {
      throw Object.assign(new Error('Total del envío inválido'), { statusCode: 400 });
    }
    clean.total_envio = total;
  }
  const anterior = envio.toJSON();
  await envio.update(clean);
  await Auditoria.create({
    id_usuario: userId,
    tabla_afectada: 'envios',
    accion: 'UPDATE',
    registro_id: String(id),
    datos_anteriores: anterior,
    datos_nuevos: clean,
  });
  return getById(id, opciones);
};

const remove = async (id, userId) => {
  const envio = await Envio.findByPk(id);
  if (!envio) throw Object.assign(new Error('Envío no encontrado'), { statusCode: 404 });
  await envio.update({ activo: false });
  anonimizacion.invalidarCache();
  await Auditoria.create({
    id_usuario: userId,
    tabla_afectada: 'envios',
    accion: 'DELETE',
    registro_id: String(id),
  });
};

const actualizarEstado = async (id, { id_estado, ubicacion, comentario }, userId, opciones = {}) => {
  const envio = await Envio.findByPk(id);
  if (!envio || !envio.activo) throw Object.assign(new Error('Envío no encontrado'), { statusCode: 404 });

  const estado = await EstadoEnvio.findByPk(id_estado);
  if (!estado) throw Object.assign(new Error('Estado no válido'), { statusCode: 400 });

  await envio.update({
    id_estado_actual: id_estado,
    ...(estado.codigo === 'entregado' ? { fecha_entrega_real: new Date().toISOString().split('T')[0] } : {}),
  });

  await HistorialEstado.create({
    id_envio: id,
    id_estado,
    id_usuario: userId,
    ubicacion: ubicacion || null,
    comentario: comentario || `Cambio de estado a ${estado.nombre}`,
    fecha_hora: new Date(),
  });

  return getById(id, opciones);
};

const getTimeline = async (id) => {
  const envio = await envioRepo.findById(id);
  if (!envio || !envio.activo) throw Object.assign(new Error('Envío no encontrado'), { statusCode: 404 });
  return envio.historial || [];
};

module.exports = { list, getById, create, update, remove, actualizarEstado, getTimeline };
