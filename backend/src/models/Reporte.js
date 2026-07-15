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
  hora_inicio: DataTypes.DATE,
  hora_fin: DataTypes.DATE,
  tiempo_generacion_min: DataTypes.DECIMAL(8, 2),
  area_solicitante: DataTypes.STRING(100),
  cantidad_registros: DataTypes.INTEGER,
  observaciones: DataTypes.TEXT,
}, { tableName: 'reportes', timestamps: false, createdAt: 'created_at', updatedAt: false });

module.exports = Reporte;
