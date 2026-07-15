const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ErrorRegistro = sequelize.define('errores_registro', {
  id_error: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_envio: DataTypes.INTEGER,
  id_usuario: DataTypes.INTEGER,
  codigo_envio: DataTypes.STRING(30),
  tipo_error: { type: DataTypes.STRING(80), allowNull: false },
  campo_afectado: { type: DataTypes.STRING(80), allowNull: false },
  descripcion: DataTypes.TEXT,
  corregido: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'errores_registro', timestamps: false, createdAt: 'created_at', updatedAt: false });

module.exports = ErrorRegistro;
