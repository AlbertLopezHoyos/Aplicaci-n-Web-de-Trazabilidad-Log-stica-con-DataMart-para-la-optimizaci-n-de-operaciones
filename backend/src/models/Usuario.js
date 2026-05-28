const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Usuario = sequelize.define('usuarios', {
  id_usuario: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_rol: { type: DataTypes.INTEGER, allowNull: false },
  nombres: { type: DataTypes.STRING(100), allowNull: false },
  apellidos: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
  password_hash: { type: DataTypes.STRING(255), allowNull: false },
  telefono: DataTypes.STRING(20),
  activo: { type: DataTypes.BOOLEAN, defaultValue: true },
  ultimo_acceso: DataTypes.DATE,
}, { tableName: 'usuarios', createdAt: 'created_at', updatedAt: 'updated_at' });

module.exports = Usuario;
