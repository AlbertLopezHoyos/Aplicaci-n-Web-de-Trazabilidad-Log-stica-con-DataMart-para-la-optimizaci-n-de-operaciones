const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const { Usuario, Rol } = require('../models');
const { error } = require('../utils/response');

const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return error(res, 'Token no proporcionado', 401);
    }
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, jwtConfig.secret);
    const usuario = await Usuario.findByPk(decoded.id_usuario, {
      include: [{ model: Rol, as: 'rol' }],
      attributes: { exclude: ['password_hash'] },
    });
    if (!usuario || !usuario.activo) {
      return error(res, 'Usuario no autorizado', 401);
    }
    req.user = usuario;
    req.userRole = usuario.rol?.nombre;
    next();
  } catch (err) {
    return error(res, 'Token inválido o expirado', 401);
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.userRole || !roles.includes(req.userRole)) {
    return error(res, 'No tiene permisos para esta acción', 403);
  }
  next();
};

module.exports = { authenticate, authorize };
