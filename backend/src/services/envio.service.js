const { Envio, HistorialEstado, EstadoEnvio, Auditoria } = require('../models');
const envioRepo = require('../repositories/envio.repository');
const { generarCodigoEnvio } = require('../utils/codigoEnvio');
const { sanitizeObject } = require('../utils/sanitize');

const list = (filters) => envioRepo.findAllPaginated(filters);

const getById = async (id) => {
  const envio = await envioRepo.findById(id);
  if (!envio) throw Object.assign(new Error('Envío no encontrado'), { statusCode: 404 });
  return envio;
};

const create = async (data, userId) => {
  const clean = sanitizeObject(data, ['origen', 'destino', 'tipo_carga', 'observaciones']);
  const codigo = await generarCodigoEnvio();
  const estadoInicial = await EstadoEnvio.findOne({ where: { codigo: 'recibido' } });
  if (!estadoInicial) throw new Error('Estado inicial no configurado');

  const envio = await Envio.create({
    ...clean,
    codigo_envio: codigo,
    id_estado_actual: clean.id_estado_actual || estadoInicial.id_estado,
    id_responsable: clean.id_responsable || userId,
    fecha_registro: clean.fecha_registro || new Date().toISOString().split('T')[0],
  });

  await Auditoria.create({
    id_usuario: userId,
    tabla_afectada: 'envios',
    accion: 'INSERT',
    registro_id: String(envio.id_envio),
    datos_nuevos: { codigo_envio: codigo },
  });

  return getById(envio.id_envio);
};

const update = async (id, data, userId) => {
  const envio = await Envio.findByPk(id);
  if (!envio || !envio.activo) throw Object.assign(new Error('Envío no encontrado'), { statusCode: 404 });
  const clean = sanitizeObject(data, ['origen', 'destino', 'tipo_carga', 'observaciones']);
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
  return getById(id);
};

const remove = async (id, userId) => {
  const envio = await Envio.findByPk(id);
  if (!envio) throw Object.assign(new Error('Envío no encontrado'), { statusCode: 404 });
  await envio.update({ activo: false });
  await Auditoria.create({
    id_usuario: userId,
    tabla_afectada: 'envios',
    accion: 'DELETE',
    registro_id: String(id),
  });
};

const actualizarEstado = async (id, { id_estado, ubicacion, comentario }, userId) => {
  const envio = await Envio.findByPk(id, { include: [{ model: EstadoEnvio, as: 'estadoActual' }] });
  if (!envio) throw Object.assign(new Error('Envío no encontrado'), { statusCode: 404 });

  const estado = await EstadoEnvio.findByPk(id_estado);
  if (!estado) throw Object.assign(new Error('Estado no válido'), { statusCode: 400 });

  await envio.update({
    id_estado_actual: id_estado,
    ...(estado.codigo === 'entregado' ? { fecha_entrega_real: new Date().toISOString().split('T')[0] } : {}),
    ...(estado.codigo === 'retrasado' ? {} : {}),
  });

  await HistorialEstado.create({
    id_envio: id,
    id_estado,
    id_usuario: userId,
    ubicacion: ubicacion || null,
    comentario: comentario || `Cambio de estado a ${estado.nombre}`,
    fecha_hora: new Date(),
  });

  return getById(id);
};

const getTimeline = async (id) => {
  const envio = await getById(id);
  return envio.historial || [];
};

module.exports = { list, getById, create, update, remove, actualizarEstado, getTimeline };
