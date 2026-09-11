const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Envio = sequelize.define('envios', {
  id_envio: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  codigo_envio: { type: DataTypes.STRING(30), allowNull: false, unique: true },
  id_cliente: { type: DataTypes.INTEGER, allowNull: false },
  id_estado_actual: { type: DataTypes.INTEGER, allowNull: false },
  id_responsable: DataTypes.INTEGER,
  origen: { type: DataTypes.STRING(255), allowNull: false },
  destino: { type: DataTypes.STRING(255), allowNull: false },
  nombre_destinatario: { type: DataTypes.STRING(200), allowNull: false },
  dni_destinatario: { type: DataTypes.STRING(8), allowNull: false },
  telefono_destinatario: { type: DataTypes.STRING(20), allowNull: false },
  fecha_registro: { type: DataTypes.DATEONLY, allowNull: false },
  fecha_estimada_entrega: DataTypes.DATEONLY,
  fecha_entrega_real: DataTypes.DATEONLY,
  tipo_carga: { type: DataTypes.STRING(100), allowNull: false },
  peso_kg: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  total_envio: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  numero_paquetes: { type: DataTypes.INTEGER, defaultValue: 1 },
  hora_inicio_registro: DataTypes.DATE,
  hora_fin_registro: DataTypes.DATE,
  tiempo_registro_min: DataTypes.DECIMAL(8, 2),
  registro_correcto: { type: DataTypes.BOOLEAN, defaultValue: true },
  observaciones: DataTypes.TEXT,
  prioridad: {
    type: DataTypes.ENUM('baja', 'normal', 'alta', 'urgente'),
    defaultValue: 'normal',
  },
  activo: { type: DataTypes.BOOLEAN, defaultValue: true },
  origen_dato: {
    type: DataTypes.ENUM('REAL', 'SINTETICO'),
    defaultValue: 'REAL',
  },
  grupo_muestra: {
    type: DataTypes.ENUM('PREPRUEBA', 'POSPRUEBA', 'NO_MUESTRA'),
    defaultValue: 'NO_MUESTRA',
  },
}, { tableName: 'envios', createdAt: 'created_at', updatedAt: 'updated_at' });

module.exports = Envio;
