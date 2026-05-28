const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Cliente = sequelize.define('clientes', {
  id_cliente: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  razon_social: { type: DataTypes.STRING(200), allowNull: false },
  ruc: { type: DataTypes.STRING(11), unique: true },
  contacto: DataTypes.STRING(150),
  email: DataTypes.STRING(150),
  telefono: DataTypes.STRING(20),
  direccion: DataTypes.STRING(255),
  distrito: DataTypes.STRING(100),
  ciudad: { type: DataTypes.STRING(100), defaultValue: 'Lima' },
  activo: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'clientes', createdAt: 'created_at', updatedAt: 'updated_at' });

module.exports = Cliente;
