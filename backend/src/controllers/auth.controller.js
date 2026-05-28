const authService = require('../services/auth.service');
const { success, error } = require('../utils/response');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    return success(res, result, 'Inicio de sesión exitoso');
  } catch (err) {
    err.statusCode = err.statusCode || 401;
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    await authService.logout(req.user.id_usuario, { ip: req.ip, userAgent: req.get('user-agent') });
    return success(res, null, 'Sesión cerrada');
  } catch (err) {
    next(err);
  }
};

const me = async (req, res) => success(res, req.user, 'Perfil de usuario');

module.exports = { login, logout, me };
