const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Rol = sequelize.define('roles', {
  id_rol: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  descripcion: DataTypes.STRING(255),
  activo: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'roles', createdAt: 'created_at', updatedAt: 'updated_at' });

module.exports = Rol;
