const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Auditoria = sequelize.define('auditoria', {
  id_auditoria: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  id_usuario: DataTypes.INTEGER,
  tabla_afectada: DataTypes.STRING(80),
  accion: {
    type: DataTypes.ENUM('INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'OTRO'),
    allowNull: false,
  },
  registro_id: DataTypes.STRING(50),
  datos_anteriores: DataTypes.JSON,
  datos_nuevos: DataTypes.JSON,
  ip_address: DataTypes.STRING(45),
  user_agent: DataTypes.STRING(255),
}, { tableName: 'auditoria', timestamps: false, createdAt: 'created_at', updatedAt: false });

module.exports = Auditoria;
