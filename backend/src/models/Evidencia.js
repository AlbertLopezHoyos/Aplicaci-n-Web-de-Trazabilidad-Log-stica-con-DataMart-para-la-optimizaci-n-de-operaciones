const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Evidencia = sequelize.define('evidencias', {
  id_evidencia: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_envio: { type: DataTypes.INTEGER, allowNull: false },
  id_usuario: DataTypes.INTEGER,
  id_incidencia: DataTypes.INTEGER,
  tipo: {
    type: DataTypes.ENUM('imagen', 'comprobante', 'documento', 'firma', 'otro'),
    defaultValue: 'imagen',
  },
  nombre_archivo: { type: DataTypes.STRING(255), allowNull: false },
  ruta_archivo: { type: DataTypes.STRING(500), allowNull: false },
  mime_type: DataTypes.STRING(100),
  tamano_bytes: DataTypes.INTEGER,
  descripcion: DataTypes.STRING(255),
}, { tableName: 'evidencias', timestamps: false, createdAt: 'created_at', updatedAt: false });

module.exports = Evidencia;
