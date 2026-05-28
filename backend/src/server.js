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
    console.error('✗ Error al iniciar servidor:', err.message);
    process.exit(1);
  }
};

start();
