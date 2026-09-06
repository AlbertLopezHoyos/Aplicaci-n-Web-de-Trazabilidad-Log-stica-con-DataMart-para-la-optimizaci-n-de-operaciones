const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Cliente = sequelize.define('clientes', {
  id_cliente: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  razon_social: { type: DataTypes.STRING(200), allowNull: false },
  dni: { type: DataTypes.STRING(8), unique: true, allowNull: true },
  telefono: { type: DataTypes.STRING(20), allowNull: true },
  activo: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'clientes', createdAt: 'created_at', updatedAt: 'updated_at' });

module.exports = Cliente;
