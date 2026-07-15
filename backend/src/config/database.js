const { Sequelize } = require('sequelize');
require('dotenv').config();

const useSsl = process.env.DB_SSL === 'true';

const sequelize = new Sequelize(
  process.env.DB_NAME || 'trazabilidad_logistica',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    dialect: 'mysql',
    logging: false,
    timezone: '-05:00',
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true,
    },
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
    dialectOptions: useSsl
      ? { ssl: { require: true, rejectUnauthorized: false } }
      : {},
  }
);

module.exports = sequelize;
