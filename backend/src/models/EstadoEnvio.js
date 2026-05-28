const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EstadoEnvio = sequelize.define('estados_envio', {
  id_estado: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  codigo: { type: DataTypes.STRING(30), allowNull: false, unique: true },
  nombre: { type: DataTypes.STRING(80), allowNull: false },
  descripcion: DataTypes.STRING(255),
  color_hex: { type: DataTypes.STRING(7), defaultValue: '#64748b' },
  orden: { type: DataTypes.INTEGER, defaultValue: 0 },
  es_final: { type: DataTypes.BOOLEAN, defaultValue: false },
  activo: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'estados_envio', timestamps: false, createdAt: 'created_at', updatedAt: false });

module.exports = EstadoEnvio;
