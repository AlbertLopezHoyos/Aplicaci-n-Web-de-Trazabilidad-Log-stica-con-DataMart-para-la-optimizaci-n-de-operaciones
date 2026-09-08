/**
 * Autenticación y autorización de las rutas sensibles:
 * medición de investigación y administración del DataMart.
 */
process.env.JWT_SECRET = 'secreto_de_pruebas';

jest.mock('../src/models', () => {
  const usuarios = {
    1: { id_usuario: 1, activo: true, rol: { nombre: 'Administrador' } },
    2: { id_usuario: 2, activo: true, rol: { nombre: 'Operador logístico' } },
    3: { id_usuario: 3, activo: false, rol: { nombre: 'Administrador' } },
  };
  return {
    sequelize: { query: jest.fn().mockResolvedValue([{}]), transaction: jest.fn() },
    Usuario: { findByPk: jest.fn((id) => Promise.resolve(usuarios[id] || null)) },
    Rol: {},
  };
});

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');

const tokenDe = (idUsuario) => jwt.sign({ id_usuario: idUsuario }, process.env.JWT_SECRET, { expiresIn: '1h' });

describe('GET /api/observacion/medicion', () => {
  it('rechaza la petición sin token', async () => {
    const res = await request(app).get('/api/observacion/medicion');
    expect(res.status).toBe(401);
  });

  it('rechaza un token inválido', async () => {
    const res = await request(app)
      .get('/api/observacion/medicion')
      .set('Authorization', 'Bearer token_falso');
    expect(res.status).toBe(401);
  });

  it('rechaza a un usuario desactivado', async () => {
    const res = await request(app)
      .get('/api/observacion/medicion')
      .set('Authorization', `Bearer ${tokenDe(3)}`);
    expect(res.status).toBe(401);
  });

  it('rechaza al Operador logístico con 403', async () => {
    const res = await request(app)
      .get('/api/observacion/medicion')
      .set('Authorization', `Bearer ${tokenDe(2)}`);
    expect(res.status).toBe(403);
  });

  it('permite el acceso al Administrador', async () => {
    const res = await request(app)
      .get('/api/observacion/medicion')
      .set('Authorization', `Bearer ${tokenDe(1)}`);
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

describe('Rutas de administración del DataMart', () => {
  it.each([
    ['post', '/api/datamart/etl/run'],
    ['get', '/api/datamart/preview'],
    ['get', '/api/datamart/analytics'],
    ['get', '/api/datamart/etl/ejecuciones'],
  ])('%s %s exige rol Administrador', async (metodo, ruta) => {
    const sinToken = await request(app)[metodo](ruta);
    expect(sinToken.status).toBe(401);

    const operador = await request(app)[metodo](ruta).set('Authorization', `Bearer ${tokenDe(2)}`);
    expect(operador.status).toBe(403);
  });
});

describe('Validación de parámetros de las fichas', () => {
  it('rechaza una dimensión inexistente', async () => {
    const res = await request(app)
      .get('/api/observacion/ficha/9')
      .set('Authorization', `Bearer ${tokenDe(1)}`);
    expect(res.status).toBe(400);
  });

  it('rechaza un alcance no permitido', async () => {
    const res = await request(app)
      .get('/api/observacion/indicadores?alcance=DATAMART')
      .set('Authorization', `Bearer ${tokenDe(1)}`);
    expect(res.status).toBe(400);
  });
});
