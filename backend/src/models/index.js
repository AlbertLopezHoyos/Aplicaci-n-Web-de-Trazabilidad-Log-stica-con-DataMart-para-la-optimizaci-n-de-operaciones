const sequelize = require('../config/database');
const Rol = require('./Rol');
const Usuario = require('./Usuario');
const Cliente = require('./Cliente');
const EstadoEnvio = require('./EstadoEnvio');
const Envio = require('./Envio');
const HistorialEstado = require('./HistorialEstado');
const Incidencia = require('./Incidencia');
const Evidencia = require('./Evidencia');
const Reporte = require('./Reporte');
const Auditoria = require('./Auditoria');
const ErrorRegistro = require('./ErrorRegistro');

// Asociaciones
Rol.hasMany(Usuario, { foreignKey: 'id_rol', as: 'usuarios' });
Usuario.belongsTo(Rol, { foreignKey: 'id_rol', as: 'rol' });

Cliente.hasMany(Envio, { foreignKey: 'id_cliente', as: 'envios' });
Envio.belongsTo(Cliente, { foreignKey: 'id_cliente', as: 'cliente' });

EstadoEnvio.hasMany(Envio, { foreignKey: 'id_estado_actual', as: 'envios' });
Envio.belongsTo(EstadoEnvio, { foreignKey: 'id_estado_actual', as: 'estadoActual' });

Usuario.hasMany(Envio, { foreignKey: 'id_responsable', as: 'enviosAsignados' });
Envio.belongsTo(Usuario, { foreignKey: 'id_responsable', as: 'responsable' });

Envio.hasMany(HistorialEstado, { foreignKey: 'id_envio', as: 'historial' });
HistorialEstado.belongsTo(Envio, { foreignKey: 'id_envio', as: 'envio' });
HistorialEstado.belongsTo(EstadoEnvio, { foreignKey: 'id_estado', as: 'estado' });
HistorialEstado.belongsTo(Usuario, { foreignKey: 'id_usuario', as: 'usuario' });

Envio.hasMany(Incidencia, { foreignKey: 'id_envio', as: 'incidencias' });
Incidencia.belongsTo(Envio, { foreignKey: 'id_envio', as: 'envio' });
Incidencia.belongsTo(Usuario, { foreignKey: 'id_usuario_reporta', as: 'reportadoPor' });

Envio.hasMany(Evidencia, { foreignKey: 'id_envio', as: 'evidencias' });
Evidencia.belongsTo(Envio, { foreignKey: 'id_envio', as: 'envio' });
Evidencia.belongsTo(Usuario, { foreignKey: 'id_usuario', as: 'usuario' });
Evidencia.belongsTo(Incidencia, { foreignKey: 'id_incidencia', as: 'incidencia' });

Usuario.hasMany(Reporte, { foreignKey: 'id_usuario', as: 'reportes' });
Reporte.belongsTo(Usuario, { foreignKey: 'id_usuario', as: 'usuario' });

Usuario.hasMany(Auditoria, { foreignKey: 'id_usuario', as: 'auditorias' });
Auditoria.belongsTo(Usuario, { foreignKey: 'id_usuario', as: 'usuario' });

Envio.hasMany(ErrorRegistro, { foreignKey: 'id_envio', as: 'erroresRegistro' });
ErrorRegistro.belongsTo(Envio, { foreignKey: 'id_envio', as: 'envio' });
ErrorRegistro.belongsTo(Usuario, { foreignKey: 'id_usuario', as: 'usuario' });

module.exports = {
  sequelize,
  Rol,
  Usuario,
  Cliente,
  EstadoEnvio,
  Envio,
  HistorialEstado,
  Incidencia,
  Evidencia,
  Reporte,
  Auditoria,
  ErrorRegistro,
};
