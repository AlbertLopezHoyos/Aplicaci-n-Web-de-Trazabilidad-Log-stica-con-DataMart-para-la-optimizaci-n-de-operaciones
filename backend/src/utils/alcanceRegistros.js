/** Resuelve filtro por responsable/reportante según alcance de la consulta. */
const resolveIdResponsable = (req) => {
  const alcance = String(req.query.alcance || 'todos').toLowerCase();
  if (alcance === 'mios') return req.user?.id_usuario;
  if (req.userRole === 'Administrador' && req.query.responsable) {
    const id = parseInt(req.query.responsable, 10);
    return Number.isFinite(id) ? id : undefined;
  }
  return undefined;
};

module.exports = { resolveIdResponsable };
