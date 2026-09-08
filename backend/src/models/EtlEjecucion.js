const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EtlEjecucion = sequelize.define('etl_ejecuciones', {
  id_ejecucion: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  proceso: { type: DataTypes.STRING(80), defaultValue: 'staging_datamart' },
  fecha_inicio: { type: DataTypes.DATE, allowNull: false },
  fecha_fin: DataTypes.DATE,
  estado: {
    type: DataTypes.ENUM('EN_PROCESO', 'EXITOSO', 'FALLIDO'),
    defaultValue: 'EN_PROCESO',
  },
  registros_extraidos: { type: DataTypes.INTEGER, defaultValue: 0 },
  registros_transformados: { type: DataTypes.INTEGER, defaultValue: 0 },
  registros_cargados: { type: DataTypes.INTEGER, defaultValue: 0 },
  mensaje_error: DataTypes.TEXT,
}, { tableName: 'etl_ejecuciones', createdAt: 'created_at', updatedAt: false });

module.exports = EtlEjecucion;
