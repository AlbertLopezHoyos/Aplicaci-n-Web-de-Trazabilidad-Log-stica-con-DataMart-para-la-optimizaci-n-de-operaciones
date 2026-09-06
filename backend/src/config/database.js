const { Sequelize } = require('sequelize');
require('dotenv').config();

const utf8Define = {
  timestamps: true,
  underscored: true,
  freezeTableName: true,
  charset: 'utf8mb4',
  collate: 'utf8mb4_unicode_ci',
};

const utf8DialectOptions = (extra = {}) => ({
  charset: 'utf8mb4',
  ...extra,
});

const buildFromEnv = () => {
  const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_PUBLIC_URL;

  if (databaseUrl) {
    return {
      url: databaseUrl,
      options: {
        dialect: 'mysql',
        logging: false,
        timezone: '-05:00',
        define: utf8Define,
        pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
        dialectOptions: utf8DialectOptions({
          ssl: { require: true, rejectUnauthorized: false },
        }),
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
      define: utf8Define,
      pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
      dialectOptions: utf8DialectOptions(
        useSsl ? { ssl: { require: true, rejectUnauthorized: false } } : {}
      ),
    },
  };
};

const config = buildFromEnv();

const sequelize = config.url
  ? new Sequelize(config.url, config.options)
  : new Sequelize(config.database, config.username, config.password, config.options);

module.exports = sequelize;
