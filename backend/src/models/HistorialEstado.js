const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const HistorialEstado = sequelize.define('historial_estados', {
  id_historial: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_envio: { type: DataTypes.INTEGER, allowNull: false },
  id_estado: { type: DataTypes.INTEGER, allowNull: false },
  id_usuario: DataTypes.INTEGER,
  ubicacion: DataTypes.STRING(255),
  comentario: DataTypes.TEXT,
  fecha_hora: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'historial_estados', timestamps: false });

module.exports = HistorialEstado;
