const app = require('./app');
const { sequelize } = require('./models');

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await sequelize.authenticate();
    console.log('✓ Conexión MySQL establecida');
    app.listen(PORT, () => {
      console.log(`✓ API en http://localhost:${PORT}/api`);
      console.log(`  Entorno: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    console.error('✗ Error al iniciar servidor:', err.message || err);
    if (err.original) {
      console.error('  MySQL:', err.original.code, err.original.sqlMessage || err.original.message);
    }
    if (process.env.NODE_ENV === 'production') {
      console.error('  Revise DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD y DB_SSL en Render.');
      console.error('  Use el host PUBLICO de Railway (tokaido.proxy.rlwy.net), NO mysql.railway.internal');
    }
    process.exit(1);
  }
};

start();
