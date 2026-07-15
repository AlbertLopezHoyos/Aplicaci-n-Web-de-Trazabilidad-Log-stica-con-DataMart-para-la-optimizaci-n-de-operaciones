const { Sequelize } = require('sequelize');
require('dotenv').config();

const buildFromEnv = () => {
  const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_PUBLIC_URL;

  if (databaseUrl) {
    return {
      url: databaseUrl,
      options: {
        dialect: 'mysql',
        logging: false,
        timezone: '-05:00',
        define: {
          timestamps: true,
          underscored: true,
          freezeTableName: true,
        },
        pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
        dialectOptions: {
          ssl: { require: true, rejectUnauthorized: false },
        },
      },
    };
  }

  const host = process.env.DB_HOST || 'localhost';
  const useSsl =
    process.env.DB_SSL === 'true' ||
    host.includes('rlwy.net') ||
    host.includes('railway.app');

  return {
    database: process.env.DB_NAME || 'trazabilidad_logistica',
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    options: {
      host,
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
    },
  };
};

const config = buildFromEnv();

const sequelize = config.url
  ? new Sequelize(config.url, config.options)
  : new Sequelize(config.database, config.username, config.password, config.options);

module.exports = sequelize;
