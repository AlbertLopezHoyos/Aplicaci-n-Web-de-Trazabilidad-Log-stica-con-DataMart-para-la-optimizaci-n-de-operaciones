const path = require('path');
const fs = require('fs');
const { Evidencia, Envio } = require('../models');

const listByEnvio = (id_envio) =>
  Evidencia.findAll({
    where: { id_envio },
    order: [['created_at', 'DESC']],
  });

const create = async (file, body, userId) => {
  const envio = await Envio.findByPk(body.id_envio);
  if (!envio) throw Object.assign(new Error('Envío no encontrado'), { statusCode: 404 });

  const tipoMap = {
    'image/jpeg': 'imagen',
    'image/png': 'imagen',
    'image/webp': 'imagen',
    'application/pdf': 'documento',
  };

  return Evidencia.create({
    id_envio: body.id_envio,
    id_incidencia: body.id_incidencia || null,
    id_usuario: userId,
    tipo: body.tipo || tipoMap[file.mimetype] || 'otro',
    nombre_archivo: file.originalname,
    ruta_archivo: `/uploads/${file.filename}`,
    mime_type: file.mimetype,
    tamano_bytes: file.size,
    descripcion: body.descripcion || null,
  });
};

const remove = async (id) => {
  const ev = await Evidencia.findByPk(id);
  if (!ev) throw Object.assign(new Error('Evidencia no encontrada'), { statusCode: 404 });
  const filePath = path.join(__dirname, '../../', ev.ruta_archivo.replace(/^\//, ''));
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  await ev.destroy();
};

module.exports = { listByEnvio, create, remove };
