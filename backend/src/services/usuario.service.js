const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const { Usuario, Rol } = require('../models');
const { sanitizeString } = require('../utils/sanitize');

const attrsPublicos = { exclude: ['password_hash'] };

const toResponse = (usuario) => {
  const row = usuario?.toJSON ? usuario.toJSON() : usuario;
  if (!row) return row;
  delete row.password_hash;
  return row;
};

const list = async () => {
  const rows = await Usuario.findAll({
    include: [{ model: Rol, as: 'rol', attributes: ['id_rol', 'nombre'] }],
    order: [['activo', 'DESC'], ['nombres', 'ASC']],
  });
  return rows.map(toResponse);
};

const findById = async (id) => {
  const usuario = await Usuario.findByPk(id, {
    include: [{ model: Rol, as: 'rol', attributes: ['id_rol', 'nombre'] }],
  });
  if (!usuario) throw Object.assign(new Error('Usuario no encontrado'), { statusCode: 404 });
  return toResponse(usuario);
};

const buildPayload = async (data, excludeId = null) => {
  const nombres = sanitizeString(data.nombres);
  const apellidos = sanitizeString(data.apellidos);
  const email = String(data.email || '').trim().toLowerCase();
  if (!nombres || !apellidos) {
    throw Object.assign(new Error('Nombres y apellidos son requeridos'), { statusCode: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw Object.assign(new Error('Correo inválido'), { statusCode: 400 });
  }
  const whereDup = { email };
  if (excludeId) whereDup.id_usuario = { [Op.ne]: excludeId };
  const dup = await Usuario.findOne({ where: whereDup });
  if (dup) throw Object.assign(new Error('Ya existe un usuario con ese correo'), { statusCode: 409 });

  const rol = await Rol.findByPk(Number(data.id_rol));
  if (!rol) throw Object.assign(new Error('Rol inválido'), { statusCode: 400 });

  const payload = {
    nombres,
    apellidos,
    email,
    id_rol: rol.id_rol,
    telefono: data.telefono?.trim() || null,
    activo: data.activo !== false,
  };

  if (data.password?.trim()) {
    if (data.password.length < 8) {
      throw Object.assign(new Error('La contraseña debe tener al menos 8 caracteres'), { statusCode: 400 });
    }
    payload.password_hash = await bcrypt.hash(data.password, 10);
  } else if (!excludeId) {
    throw Object.assign(new Error('Contraseña requerida para nuevo usuario'), { statusCode: 400 });
  }

  return payload;
};

const create = async (data) => {
  const payload = await buildPayload(data);
  const usuario = await Usuario.create(payload);
  return findById(usuario.id_usuario);
};

const update = async (id, data) => {
  const usuario = await Usuario.findByPk(id);
  if (!usuario) throw Object.assign(new Error('Usuario no encontrado'), { statusCode: 404 });
  const payload = await buildPayload(data, id);
  await usuario.update(payload);
  return findById(id);
};

const setActivo = async (id, activo) => {
  const usuario = await Usuario.findByPk(id);
  if (!usuario) throw Object.assign(new Error('Usuario no encontrado'), { statusCode: 404 });
  await usuario.update({ activo: Boolean(activo) });
  return findById(id);
};

module.exports = { list, findById, create, update, setActivo };
