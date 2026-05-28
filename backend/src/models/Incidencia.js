const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Incidencia = sequelize.define('incidencias', {
  id_incidencia: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_envio: { type: DataTypes.INTEGER, allowNull: false },
  id_usuario_reporta: DataTypes.INTEGER,
  tipo: {
    type: DataTypes.ENUM('error', 'retraso', 'dano', 'perdida', 'observacion', 'otro'),
    defaultValue: 'observacion',
  },
  severidad: {
    type: DataTypes.ENUM('baja', 'media', 'alta', 'critica'),
    defaultValue: 'media',
  },
  titulo: { type: DataTypes.STRING(200), allowNull: false },
  descripcion: { type: DataTypes.TEXT, allowNull: false },
  estado_incidencia: {
    type: DataTypes.ENUM('abierta', 'en_revision', 'resuelta', 'cerrada'),
    defaultValue: 'abierta',
  },
  fecha_reporte: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  fecha_resolucion: DataTypes.DATE,
  resolucion: DataTypes.TEXT,
}, { tableName: 'incidencias', createdAt: 'created_at', updatedAt: 'updated_at' });

module.exports = Incidencia;
