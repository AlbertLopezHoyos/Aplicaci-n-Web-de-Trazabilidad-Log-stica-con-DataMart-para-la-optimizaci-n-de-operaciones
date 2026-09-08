/**
 * Verifica que los indicadores de investigación se calculen sobre la muestra
 * real (preprueba/posprueba) y nunca sobre los datos sintéticos del DataMart.
 */
jest.mock('../src/models', () => ({
  sequelize: { query: jest.fn() },
}));

const { sequelize } = require('../src/models');
const observacionService = require('../src/services/observacion.service');

/** Devuelve, en orden, las filas simuladas para TPRE, PER, PEEA y PIOIC. */
const mockIndicadores = ({ tpre, per, peea, pioic }) => {
  sequelize.query
    .mockResolvedValueOnce([tpre])
    .mockResolvedValueOnce([per])
    .mockResolvedValueOnce([peea])
    .mockResolvedValueOnce([pioic]);
};

const sqlDeLlamada = (i) => sequelize.query.mock.calls[i][0].replace(/\s+/g, ' ');
const replacementsDeLlamada = (i) => sequelize.query.mock.calls[i][1].replacements;

beforeEach(() => {
  sequelize.query.mockReset();
});

describe('calcularIndicadores — exclusión de datos sintéticos', () => {
  it('filtra por origen REAL y grupos de muestra en las cuatro consultas', async () => {
    mockIndicadores({
      tpre: { ner: 50, suma_tre: 250 },
      per: { treg: 50, rce: 5 },
      peea: { tee: 50, eea: 40 },
      pioic: { ntir: 12, nioc: 9 },
    });

    await observacionService.calcularIndicadores();

    expect(sequelize.query).toHaveBeenCalledTimes(4);
    for (let i = 0; i < 4; i += 1) {
      expect(sqlDeLlamada(i)).toContain('origen_dato = :origenReal');
      expect(sqlDeLlamada(i)).toContain('grupo_muestra IN (:gruposMuestra)');
      expect(replacementsDeLlamada(i)).toEqual({
        origenReal: 'REAL',
        gruposMuestra: ['PREPRUEBA', 'POSPRUEBA'],
      });
    }
  });

  it('restringe el cálculo a un solo grupo cuando se indica', async () => {
    mockIndicadores({
      tpre: { ner: 50, suma_tre: 300 },
      per: { treg: 50, rce: 10 },
      peea: { tee: 50, eea: 35 },
      pioic: { ntir: 20, nioc: 12 },
    });

    const resultado = await observacionService.calcularIndicadores({ grupo: 'PREPRUEBA' });

    expect(replacementsDeLlamada(0).gruposMuestra).toEqual(['PREPRUEBA']);
    expect(resultado.grupo).toBe('PREPRUEBA');
    expect(resultado.incluyeDatosSinteticos).toBe(false);
  });

  it('solo incluye datos sintéticos con alcance TODOS, marcándolo explícitamente', async () => {
    mockIndicadores({
      tpre: { ner: 5500, suma_tre: 27500 },
      per: { treg: 5500, rce: 440 },
      peea: { tee: 5500, eea: 3300 },
      pioic: { ntir: 990, nioc: 871 },
    });

    const resultado = await observacionService.calcularIndicadores({ alcance: 'TODOS' });

    expect(sqlDeLlamada(0)).not.toContain('origen_dato = :origenReal');
    expect(resultado.incluyeDatosSinteticos).toBe(true);
    expect(resultado.alcance).toBe('TODOS');
  });

  it('ignora un alcance desconocido y vuelve al alcance de muestra', async () => {
    mockIndicadores({
      tpre: { ner: 1, suma_tre: 1 },
      per: { treg: 1, rce: 0 },
      peea: { tee: 1, eea: 1 },
      pioic: { ntir: 1, nioc: 1 },
    });

    const resultado = await observacionService.calcularIndicadores({ alcance: 'DATAMART' });
    expect(resultado.alcance).toBe('MUESTRA');
  });
});

describe('calcularIndicadores — fórmulas', () => {
  it('devuelve los cuatro indicadores con sus numeradores y denominadores', async () => {
    mockIndicadores({
      tpre: { ner: 50, suma_tre: 250 },   // 5 min
      per: { treg: 50, rce: 6 },          // 12 %
      peea: { tee: 50, eea: 41 },         // 82 %
      pioic: { ntir: 12, nioc: 9 },       // 75 %
    });

    const r = await observacionService.calcularIndicadores();

    expect(r.tpre).toBe(5);
    expect(r.per).toBe(12);
    expect(r.peea).toBe(82);
    expect(r.pioic).toBe(75);
    expect(r.detalle.pioic).toEqual({ nioc: 9, ntir: 12 });
    expect(r.totalEnvios).toBe(50);
    expect(r.totalIncidencias).toBe(12);
  });

  it('PIOIC divide entre las incidencias registradas, no entre los envíos', async () => {
    mockIndicadores({
      tpre: { ner: 50, suma_tre: 250 },
      per: { treg: 50, rce: 0 },
      peea: { tee: 50, eea: 50 },
      pioic: { ntir: 20, nioc: 15 },
    });

    const r = await observacionService.calcularIndicadores();
    expect(r.pioic).toBe(75);      // 15/20, no 15/50
    expect(r.detalle.pioic.ntir).toBe(20);
    expect(sqlDeLlamada(3)).toContain('FROM incidencias i');
  });

  it('no divide entre cero cuando la muestra está vacía', async () => {
    mockIndicadores({
      tpre: { ner: 0, suma_tre: 0 },
      per: { treg: 0, rce: 0 },
      peea: { tee: 0, eea: 0 },
      pioic: { ntir: 0, nioc: 0 },
    });

    const r = await observacionService.calcularIndicadores();
    expect([r.tpre, r.per, r.peea, r.pioic]).toEqual([0, 0, 0, 0]);
  });
});

describe('criterio PIOIC en SQL', () => {
  it('exige en SQL los mismos campos que la regla en JavaScript', () => {
    const sql = observacionService.SQL_INCIDENCIA_COMPLETA;
    ['tipo', 'area', 'titulo', 'descripcion', 'fuente_principal'].forEach((campo) => {
      expect(sql).toContain(`i.\`${campo}\``);
    });
  });
});

describe('fichas de observación', () => {
  it('la ficha de la dimensión 4 se construye sobre incidencias de la muestra', async () => {
    sequelize.query.mockResolvedValueOnce([]);
    await observacionService.getDatosDimension(4, { limit: 50 });
    const sql = sqlDeLlamada(0);
    expect(sql).toContain('FROM incidencias i');
    expect(sql).toContain('origen_dato = :origenReal');
    expect(sql).toContain('LIMIT 50');
  });

  it('rechaza dimensiones fuera del rango 1-4', async () => {
    await expect(observacionService.getDatosDimension(9)).rejects.toThrow('Dimensión no válida');
  });
});
