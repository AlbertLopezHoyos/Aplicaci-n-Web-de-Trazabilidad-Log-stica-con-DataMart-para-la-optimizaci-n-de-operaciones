/**
 * Verifica que los indicadores de investigación se calculen sobre la muestra
 * real (preprueba/posprueba) y nunca sobre los datos sintéticos del DataMart.
 * Unidad de análisis: jornada operativa (promedio diario, n = 20).
 */
jest.mock('../src/models', () => ({
  sequelize: { query: jest.fn() },
}));

const { sequelize } = require('../src/models');
const observacionService = require('../src/services/observacion.service');

/** Devuelve, en orden, las filas diarias simuladas para TPDRE, PDRE, PDEEA y PDIOIC. */
const mockIndicadores = ({ tpre, per, peea, pioic }) => {
  sequelize.query
    .mockResolvedValueOnce(Array.isArray(tpre) ? tpre : [tpre])
    .mockResolvedValueOnce(Array.isArray(per) ? per : [per])
    .mockResolvedValueOnce(Array.isArray(peea) ? peea : [peea])
    .mockResolvedValueOnce(Array.isArray(pioic) ? pioic : [pioic]);
};

const sqlDeLlamada = (i) => sequelize.query.mock.calls[i][0].replace(/\s+/g, ' ');
const replacementsDeLlamada = (i) => sequelize.query.mock.calls[i][1].replacements;

beforeEach(() => {
  sequelize.query.mockReset();
});

describe('calcularIndicadores — exclusión de datos sintéticos', () => {
  it('filtra por origen REAL y grupos de muestra en las cuatro consultas', async () => {
    mockIndicadores({
      tpre: [{ nerd: 5, suma_tre: 25 }],
      per: [{ trevd: 5, rce: 1 }],
      peea: [{ teed: 5, eea: 4 }],
      pioic: [{ tioed: 2, nioc: 2 }],
    });

    await observacionService.calcularIndicadores();

    expect(sequelize.query).toHaveBeenCalledTimes(4);
    for (let i = 0; i < 4; i += 1) {
      expect(sqlDeLlamada(i)).toContain('origen_dato = :origenReal');
      expect(sqlDeLlamada(i)).toContain('grupo_muestra IN (:gruposMuestra)');
      expect(sqlDeLlamada(i)).toContain('GROUP BY DATE(e.fecha_registro)');
      expect(replacementsDeLlamada(i)).toEqual({
        origenReal: 'REAL',
        gruposMuestra: ['PREPRUEBA', 'POSPRUEBA'],
      });
    }
  });

  it('restringe el cálculo a un solo grupo cuando se indica', async () => {
    mockIndicadores({
      tpre: [{ nerd: 5, suma_tre: 30 }],
      per: [{ trevd: 5, rce: 1 }],
      peea: [{ teed: 5, eea: 4 }],
      pioic: [{ tioed: 2, nioc: 1 }],
    });

    const resultado = await observacionService.calcularIndicadores({ grupo: 'PREPRUEBA' });

    expect(replacementsDeLlamada(0).gruposMuestra).toEqual(['PREPRUEBA']);
    expect(replacementsDeLlamada(0).ventanaDesde).toBe('2026-08-01');
    expect(replacementsDeLlamada(0).ventanaHasta).toBe('2026-08-20');
    expect(resultado.grupo).toBe('PREPRUEBA');
    expect(resultado.incluyeDatosSinteticos).toBe(false);
  });

  it('solo incluye datos sintéticos con alcance TODOS, marcándolo explícitamente', async () => {
    mockIndicadores({
      tpre: [{ nerd: 100, suma_tre: 500 }],
      per: [{ trevd: 100, rce: 8 }],
      peea: [{ teed: 100, eea: 60 }],
      pioic: [{ tioed: 20, nioc: 18 }],
    });

    const resultado = await observacionService.calcularIndicadores({ alcance: 'TODOS' });

    expect(sqlDeLlamada(0)).not.toContain('origen_dato = :origenReal');
    expect(resultado.incluyeDatosSinteticos).toBe(true);
    expect(resultado.alcance).toBe('TODOS');
  });

  it('ignora un alcance desconocido y vuelve al alcance de muestra', async () => {
    mockIndicadores({
      tpre: [{ nerd: 1, suma_tre: 1 }],
      per: [{ trevd: 1, rce: 0 }],
      peea: [{ teed: 1, eea: 1 }],
      pioic: [{ tioed: 1, nioc: 1 }],
    });

    const resultado = await observacionService.calcularIndicadores({ alcance: 'DATAMART' });
    expect(resultado.alcance).toBe('MUESTRA');
  });
});

describe('calcularIndicadores — media de promedios diarios', () => {
  it('devuelve TPDRE/PDRE/PDEEA/PDIOIC como promedio de las jornadas', async () => {
    mockIndicadores({
      tpre: [
        { nerd: 2, suma_tre: 10 }, // 5
        { nerd: 2, suma_tre: 6 },  // 3  → media 4
      ],
      per: [
        { trevd: 4, rce: 1 }, // 25%
        { trevd: 4, rce: 0 }, // 0%   → media 12.5
      ],
      peea: [
        { teed: 4, eea: 4 }, // 100%
        { teed: 4, eea: 2 }, // 50%   → media 75
      ],
      pioic: [
        { tioed: 2, nioc: 2 }, // 100%
        { tioed: 2, nioc: 1 }, // 50%   → media 75
      ],
    });

    const r = await observacionService.calcularIndicadores();

    expect(r.tpdre).toBe(4);
    expect(r.tpre).toBe(4);
    expect(r.pdre).toBe(12.5);
    expect(r.per).toBe(12.5);
    expect(r.pdeea).toBe(75);
    expect(r.peea).toBe(75);
    expect(r.pdioic).toBe(75);
    expect(r.pioic).toBe(75);
    expect(r.unidadObservacion).toBe('jornada');
    expect(r.detalle.pdioic).toEqual({
      nioc: 3, tioed: 4, n_jornadas: 2, media_diaria: true,
    });
    expect(r.totalEnvios).toBe(8);
    expect(r.totalIncidencias).toBe(4);
  });

  it('PDIOIC omite del promedio los días sin incidencias (N/A)', async () => {
    mockIndicadores({
      tpre: [{ nerd: 3, suma_tre: 9 }],
      per: [{ trevd: 3, rce: 0 }],
      peea: [{ teed: 3, eea: 3 }],
      pioic: [
        { tioed: 0, nioc: 0 },
        { tioed: 4, nioc: 3 },
      ],
    });

    const r = await observacionService.calcularIndicadores();
    expect(r.pdioic).toBe(75);
    expect(r.detalle.pdioic.n_jornadas).toBe(1);
    expect(sqlDeLlamada(3)).toContain('FROM incidencias i');
  });

  it('no divide entre cero cuando no hay jornadas con datos', async () => {
    mockIndicadores({
      tpre: [],
      per: [],
      peea: [],
      pioic: [],
    });

    const r = await observacionService.calcularIndicadores();
    expect([r.tpdre, r.pdre, r.pdeea, r.pdioic]).toEqual([0, 0, 0, 0]);
  });
});

describe('criterio PIOIC en SQL', () => {
  it('exige en SQL los mismos campos que la regla en JavaScript', () => {
    const sql = observacionService.SQL_INCIDENCIA_COMPLETA;
    ['tipo', 'area', 'titulo', 'descripcion', 'fuente_principal'].forEach((campo) => {
      expect(sql).toContain(`i.\`${campo}\``);
    });
    expect(sql).not.toContain('observacion');
  });
});

describe('fichas de observación diarias', () => {
  it('la ficha de posprueba agrupa 20 jornadas (1–20 set 2026) sin sorteo por envío', async () => {
    sequelize.query.mockResolvedValueOnce([]);
    const filas = await observacionService.getDatosDimension(1, { limit: 50, grupo: 'POSPRUEBA' });
    const sql = sqlDeLlamada(0);
    expect(sql).toContain('origen_dato = :origenReal');
    expect(sql).toContain('grupo_muestra <> :grupoPre');
    expect(sql).toContain('fecha_registro BETWEEN :ventanaDesde AND :ventanaHasta');
    expect(sql).toContain('GROUP BY DATE(e.fecha_registro)');
    expect(sql).not.toContain('ORDER BY RAND()');
    expect(sql).not.toContain('LIMIT 50');
    expect(replacementsDeLlamada(0)).toEqual({
      origenReal: 'REAL',
      grupoPre: 'PREPRUEBA',
      ventanaDesde: '2026-09-01',
      ventanaHasta: '2026-09-20',
    });
    expect(filas).toHaveLength(20);
    expect(filas[0].fecha).toBe('01/09/2026');
    expect(filas[19].fecha).toBe('20/09/2026');
    expect(filas[0].tpdre).toBe('N/A');
  });

  it('la ficha de la dimensión 4 se construye sobre incidencias agrupadas por día', async () => {
    sequelize.query.mockResolvedValueOnce([]);
    await observacionService.getDatosDimension(4, { grupo: 'POSPRUEBA' });
    const sql = sqlDeLlamada(0);
    expect(sql).toContain('FROM incidencias i');
    expect(sql).toContain('origen_dato = :origenReal');
    expect(sql).toContain('GROUP BY DATE(e.fecha_registro)');
    expect(sql).not.toContain('LIMIT 50');
  });

  it('la ficha 4 expone TIOED, NIOC, incompletas y PDIOIC', () => {
    const dim4 = observacionService.DIMENSIONES[4];
    expect(dim4.indicador).toBe('PDIOIC');
    expect(dim4.columnas).toEqual(['fecha', 'tioed', 'nioc', 'incompletas', 'pdioic']);
    expect(dim4.labels).toEqual([
      'Fecha',
      'Total de incidencias evaluadas (TIOED)',
      'Incidencias con información completa (NIOC)',
      'Incidencias con información incompleta',
      'Porcentaje diario de incidencias con información completa (%) (PDIOIC)',
    ]);
  });

  it('la exportación de la ficha 4 usa las columnas diarias y marca N/A si no hay incidencias', async () => {
    sequelize.query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const payload = await observacionService.buildExportPayload(4, { grupo: 'POSPRUEBA' });
    expect(payload.headers.map((h) => h.key)).toEqual(observacionService.DIMENSIONES[4].columnas);
    expect(payload.headers.map((h) => h.label)).toEqual(observacionService.DIMENSIONES[4].labels);
    expect(payload.filas).toHaveLength(20);
    expect(payload.filas[0].pdioic).toBe('N/A');
    expect(payload.exportados).toBe(20);
  });

  it('las dimensiones 1, 2 y 3 consultan envíos agregados por jornada', async () => {
    expect(observacionService.DIMENSIONES[1].indicador).toBe('TPDRE');
    expect(observacionService.DIMENSIONES[2].indicador).toBe('PDRE');
    expect(observacionService.DIMENSIONES[3].indicador).toBe('PDEEA');
    expect(observacionService.DIMENSIONES[1].columnas).toEqual(['fecha', 'nerd', 'suma_tre', 'tpdre']);
    expect(observacionService.DIMENSIONES[2].columnas).toContain('pdre');
    expect(observacionService.DIMENSIONES[3].columnas).toContain('pdeea');
    expect(observacionService.DIMENSIONES[1].columnas).not.toContain('codigo_envio');
    expect(observacionService.limiteFichaGrupo()).toBe(20);

    sequelize.query.mockResolvedValue([]);
    await observacionService.getDatosDimension(1, { grupo: 'POSPRUEBA' });
    await observacionService.getDatosDimension(2, { grupo: 'POSPRUEBA' });
    await observacionService.getDatosDimension(3, { grupo: 'POSPRUEBA' });
    expect(sqlDeLlamada(0)).toContain('FROM envios e');
    expect(sqlDeLlamada(1)).toContain('FROM envios e');
    expect(sqlDeLlamada(2)).toContain('FROM envios e');
    expect(sqlDeLlamada(0)).not.toContain('FROM incidencias');
    expect(sqlDeLlamada(1)).not.toContain('FROM incidencias');
    expect(sqlDeLlamada(2)).not.toContain('FROM incidencias');
  });

  it('rechaza dimensiones fuera del rango 1-4', async () => {
    await expect(observacionService.getDatosDimension(9)).rejects.toThrow('Dimensión no válida');
  });
});
