const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Reporte = sequelize.define('reportes', {
  id_reporte: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_usuario: DataTypes.INTEGER,
  tipo_reporte: { type: DataTypes.STRING(80), allowNull: false },
  titulo: { type: DataTypes.STRING(200), allowNull: false },
  parametros: DataTypes.JSON,
  ruta_archivo: DataTypes.STRING(500),
  formato: { type: DataTypes.ENUM('pdf', 'excel', 'json'), defaultValue: 'pdf' },
  estado: { type: DataTypes.ENUM('generado', 'error', 'pendiente'), defaultValue: 'generado' },
}, { tableName: 'reportes', timestamps: false, createdAt: 'created_at', updatedAt: false });

module.exports = Reporte;
