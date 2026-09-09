const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Incidencia = sequelize.define('incidencias', {
  id_incidencia: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  codigo_incidencia: { type: DataTypes.STRING(30), unique: true },
  id_envio: { type: DataTypes.INTEGER, allowNull: false },
  id_usuario_reporta: DataTypes.INTEGER,
  tipo: {
    type: DataTypes.ENUM('error', 'retraso', 'dano', 'perdida', 'observacion', 'otro'),
    defaultValue: 'observacion',
  },
  area: { type: DataTypes.STRING(100) },
  fuente_principal: { type: DataTypes.STRING(120) },
  informacion_completa: { type: DataTypes.BOOLEAN, defaultValue: false },
  severidad: {
    type: DataTypes.ENUM('baja', 'media', 'alta', 'critica'),
    defaultValue: 'media',
  },
  titulo: { type: DataTypes.STRING(200), allowNull: false },
  descripcion: { type: DataTypes.TEXT, allowNull: false },
  observacion: { type: DataTypes.TEXT, allowNull: true },
  estado_incidencia: {
    type: DataTypes.ENUM('abierta', 'en_revision', 'resuelta', 'cerrada'),
    defaultValue: 'abierta',
  },
  fecha_reporte: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  fecha_resolucion: DataTypes.DATE,
  resolucion: DataTypes.TEXT,
  origen_dato: {
    type: DataTypes.ENUM('REAL', 'SINTETICO'),
    defaultValue: 'REAL',
  },
  grupo_muestra: {
    type: DataTypes.ENUM('PREPRUEBA', 'POSPRUEBA', 'NO_MUESTRA'),
    defaultValue: 'NO_MUESTRA',
  },
}, { tableName: 'incidencias', createdAt: 'created_at', updatedAt: 'updated_at' });

module.exports = Incidencia;
