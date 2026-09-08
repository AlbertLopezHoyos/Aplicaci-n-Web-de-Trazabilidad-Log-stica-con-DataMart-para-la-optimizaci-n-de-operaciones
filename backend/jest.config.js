module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  clearMocks: true,
  collectCoverageFrom: [
    'src/utils/reglasIndicadores.js',
    'src/services/observacion.service.js',
    'src/datamart/etl.service.js',
  ],
};
