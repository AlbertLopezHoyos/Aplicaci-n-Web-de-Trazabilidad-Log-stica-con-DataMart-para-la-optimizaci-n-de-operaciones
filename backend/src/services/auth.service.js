const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const { Usuario, Rol, Auditoria } = require('../models');

const login = async (email, password, meta = {}) => {
  const usuario = await Usuario.findOne({
    where: { email, activo: true },
    include: [{ model: Rol, as: 'rol' }],
  });
  if (!usuario) throw Object.assign(new Error('Credenciales inválidas'), { statusCode: 401 });

  const valid = await bcrypt.compare(password, usuario.password_hash);
  if (!valid) throw Object.assign(new Error('Credenciales inválidas'), { statusCode: 401 });

  await usuario.update({ ultimo_acceso: new Date() });
  await Auditoria.create({
    id_usuario: usuario.id_usuario,
    tabla_afectada: 'usuarios',
    accion: 'LOGIN',
    registro_id: String(usuario.id_usuario),
    ip_address: meta.ip,
    user_agent: meta.userAgent,
  });

  const token = jwt.sign(
    { id_usuario: usuario.id_usuario, email: usuario.email, rol: usuario.rol.nombre },
    jwtConfig.secret,
    { expiresIn: jwtConfig.expiresIn }
  );

  const { password_hash, ...userSafe } = usuario.toJSON();
  return { token, usuario: userSafe };
};

const logout = async (userId, meta = {}) => {
  await Auditoria.create({
    id_usuario: userId,
    tabla_afectada: 'usuarios',
    accion: 'LOGOUT',
    registro_id: String(userId),
    ip_address: meta.ip,
    user_agent: meta.userAgent,
  });
};

module.exports = { login, logout };
