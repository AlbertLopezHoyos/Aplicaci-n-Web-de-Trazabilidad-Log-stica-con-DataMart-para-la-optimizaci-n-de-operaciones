/**
 * Indicadores de investigación: una fila = una jornada.
 * Solo lectura sobre registros REALES del postest. Sin preprueba, sin sorteo, sin mutación.
 */
jest.mock('../src/models', () => ({
  sequelize: { query: jest.fn() },
}));

const { sequelize } = require('../src/models');
const observacionService = require('../src/services/observacion.service');
const fs = require('fs');
const path = require('path');

const mockIndicadores = ({ tpdre, pdre, pdeea, pdioic }) => {
  sequelize.query
    .mockResolvedValueOnce(Array.isArray(tpdre) ? tpdre : [tpdre])
    .mockResolvedValueOnce(Array.isArray(pdre) ? pdre : [pdre])
    .mockResolvedValueOnce(Array.isArray(pdeea) ? pdeea : [pdeea])
    .mockResolvedValueOnce(Array.isArray(pdioic) ? pdioic : [pdioic]);
};

const sqlDeLlamada = (i) => sequelize.query.mock.calls[i][0].replace(/\s+/g, ' ');
const replacementsDeLlamada = (i) => sequelize.query.mock.calls[i][1].replacements;

beforeEach(() => {
  sequelize.query.mockReset();
});

describe('calcularIndicadores — exclusión de datos sintéticos y de preprueba', () => {
  it('filtra origen REAL, excluye PREPRUEBA y usa la ventana de postest', async () => {
    mockIndicadores({
      tpdre: [{ nerd: 5, suma_tre: 25 }],
      pdre: [{ trd: 5, rce: 1 }],
      pdeea: [{ ted: 5, eea: 4 }],
      pdioic: [{ tid: 2, nioc: 2 }],
    });

    const resultado = await observacionService.calcularIndicadores();

    expect(sequelize.query).toHaveBeenCalledTimes(4);
    expect(sqlDeLlamada(0)).toContain('COUNT(CASE WHEN');
    expect(sqlDeLlamada(0)).toContain('tiempo_registro_min IS NOT NULL');
    expect(sqlDeLlamada(0)).toContain('tiempo_registro_min >= 0');
    expect(sqlDeLlamada(0)).not.toMatch(/COUNT\(\*\) AS nerd/);
    expect(resultado.incluyeDatosSinteticos).toBe(false);
    expect(resultado.grupo).toBe('POSPRUEBA');
    expect(resultado.alcance).toBe('MUESTRA');

    for (let i = 0; i < 3; i += 1) {
      expect(sqlDeLlamada(i)).toContain('origen_dato = :origenReal');
      expect(sqlDeLlamada(i)).toContain('grupo_muestra <> :grupoPre');
      expect(sqlDeLlamada(i)).toContain('DATE(e.fecha_registro) BETWEEN :ventanaDesde AND :ventanaHasta');
      expect(sqlDeLlamada(i)).toContain('GROUP BY DATE(e.fecha_registro)');
      expect(replacementsDeLlamada(i)).toEqual({
        origenReal: 'REAL',
        grupoPre: 'PREPRUEBA',
        ventanaDesde: '2026-09-01',
        ventanaHasta: '2026-09-20',
      });
    }
  });

  it('ignora alcance TODOS y nunca mezcla datos sintéticos', async () => {
    mockIndicadores({
      tpdre: [{ nerd: 100, suma_tre: 500 }],
      pdre: [{ trd: 100, rce: 8 }],
      pdeea: [{ ted: 100, eea: 60 }],
      pdioic: [{ tid: 20, nioc: 18 }],
    });

    const resultado = await observacionService.calcularIndicadores({ alcance: 'TODOS' });
    expect(sqlDeLlamada(0)).toContain('origen_dato = :origenReal');
    expect(resultado.incluyeDatosSinteticos).toBe(false);
    expect(resultado.alcance).toBe('MUESTRA');
  });

  it('no depende funcionalmente de la preprueba', async () => {
    mockIndicadores({
      tpdre: [{ nerd: 3, suma_tre: 9 }],
      pdre: [{ trd: 3, rce: 0 }],
      pdeea: [{ ted: 3, eea: 3 }],
      pdioic: [{ tid: 1, nioc: 1 }],
    });

    const resultado = await observacionService.calcularIndicadores({ grupo: 'PREPRUEBA' });
    expect(resultado.grupo).toBe('POSPRUEBA');
    expect(resultado).not.toHaveProperty('preprueba');
    expect(replacementsDeLlamada(0).ventanaDesde).toBe('2026-09-01');
    expect(replacementsDeLlamada(0).ventanaHasta).toBe('2026-09-20');
    expect(sqlDeLlamada(0)).not.toContain("grupo_muestra = 'PREPRUEBA'");
  });
});

describe('calcularIndicadores — fórmulas por jornada', () => {
  it('calcula TPDRE, PDRE, PDEEA y PDIOIC como media de las jornadas', async () => {
    mockIndicadores({
      tpdre: [
        { nerd: 2, suma_tre: 10 },
        { nerd: 2, suma_tre: 6 },
      ],
      pdre: [
        { trd: 4, rce: 1 },
        { trd: 4, rce: 0 },
      ],
      pdeea: [
        { ted: 4, eea: 4 },
        { ted: 4, eea: 2 },
      ],
      pdioic: [
        { tid: 2, nioc: 2 },
        { tid: 2, nioc: 1 },
      ],
    });

    const r = await observacionService.calcularIndicadores();

    expect(r.tpdre).toBe(4);
    expect(r.pdre).toBe(12.5);
    expect(r.pdeea).toBe(75);
    expect(r.pdioic).toBe(75);
    expect(r.unidadObservacion).toBe('jornada');
    expect(r.detalle.pdioic).toEqual({
      nioc: 3, tid: 4, n_jornadas: 2, media_diaria: true,
    });
    expect(r.detalle.pdre.trd).toBe(8);
    expect(r.detalle.pdeea.ted).toBe(8);
    expect(r.totalEnvios).toBe(8);
    expect(r.totalIncidencias).toBe(4);
  });

  it('PDIOIC omite del promedio los días sin incidencias (N/A, no 0%)', async () => {
    mockIndicadores({
      tpdre: [{ nerd: 3, suma_tre: 9 }],
      pdre: [{ trd: 3, rce: 0 }],
      pdeea: [{ ted: 3, eea: 3 }],
      pdioic: [
        { tid: 0, nioc: 0 },
        { tid: 4, nioc: 3 },
      ],
    });

    const r = await observacionService.calcularIndicadores();
    expect(r.pdioic).toBe(75);
    expect(r.detalle.pdioic.n_jornadas).toBe(1);
    expect(sqlDeLlamada(3)).toContain('FROM incidencias i');
    expect(sqlDeLlamada(3)).toContain('GROUP BY DATE(i.fecha_reporte)');
    expect(sqlDeLlamada(3)).toContain('DATE(i.fecha_reporte) BETWEEN :ventanaDesde AND :ventanaHasta');
  });

  it('no divide entre cero cuando no hay jornadas con datos', async () => {
    mockIndicadores({
      tpdre: [],
      pdre: [],
      pdeea: [],
      pdioic: [],
    });

    const r = await observacionService.calcularIndicadores();
    expect([r.tpdre, r.pdre, r.pdeea, r.pdioic]).toEqual([0, 0, 0, 0]);
  });
});

describe('criterio PDIOIC en SQL', () => {
  it('exige en SQL los mismos campos que la regla en JavaScript', () => {
    const sql = observacionService.SQL_INCIDENCIA_COMPLETA;
    ['tipo', 'area', 'titulo', 'descripcion', 'fuente_principal'].forEach((campo) => {
      expect(sql).toContain(`i.\`${campo}\``);
    });
    expect(sql).not.toContain('observacion');
  });
});

describe('fichas de observación diarias', () => {
  it('una jornada operativa se obtiene de una fecha con al menos una operación válida', async () => {
    sequelize.query
      .mockResolvedValueOnce([{ fecha: '2026-09-01' }, { fecha: '2026-09-02' }])
      .mockResolvedValueOnce([
        { fecha: '2026-09-01', nerd: 4, suma_tre: 20 },
        { fecha: '2026-09-02', nerd: 2, suma_tre: 8 },
      ]);
    const filas = await observacionService.getDatosDimension(1);
    expect(sqlDeLlamada(0)).toContain('SELECT DISTINCT DATE(e.fecha_registro)');
    expect(sqlDeLlamada(0)).toContain('origen_dato = :origenReal');
    expect(sqlDeLlamada(0)).toContain('grupo_muestra <> :grupoPre');
    expect(sqlDeLlamada(0)).not.toContain('ORDER BY RAND()');
    expect(sqlDeLlamada(0)).not.toContain('LIMIT 50');
    expect(filas).toHaveLength(2);
    expect(filas[0].fecha).toBe('01/09/2026');
    expect(filas[0].nerd).toBe(4);
    expect(filas[0].tpdre).toBe(5);
  });

  it('no crea filas de días sin operaciones únicamente para completar 20', async () => {
    sequelize.query.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const filas = await observacionService.getDatosDimension(1);
    expect(filas).toHaveLength(0);
    expect(filas).not.toHaveLength(20);
  });

  it('la dimensión 4 agrupa y filtra por DATE(i.fecha_reporte)', async () => {
    sequelize.query
      .mockResolvedValueOnce([{ fecha: '2026-09-10' }])
      .mockResolvedValueOnce([]);
    await observacionService.getDatosDimension(4);
    const sql = sqlDeLlamada(1);
    expect(sql).toContain('FROM incidencias i');
    expect(sql).toContain('origen_dato = :origenReal');
    expect(sql).toContain('GROUP BY DATE(i.fecha_reporte)');
    expect(sql).toContain('DATE(i.fecha_reporte) BETWEEN :ventanaDesde AND :ventanaHasta');
    expect(sql).not.toContain('GROUP BY DATE(e.fecha_registro)');
    expect(sql).not.toContain('LIMIT 50');
    expect(sql).not.toContain('ORDER BY RAND()');
  });

  it('D4 conserva N/A cuando una jornada válida no tiene incidencias', async () => {
    sequelize.query
      .mockResolvedValueOnce([{ fecha: '2026-09-10' }])
      .mockResolvedValueOnce([]);
    const filas = await observacionService.getDatosDimension(4);
    expect(filas).toHaveLength(1);
    expect(filas[0].fecha).toBe('10/09/2026');
    expect(filas[0].tid).toBe(0);
    expect(filas[0].pdioic).toBe('N/A');
    expect(filas[0].pdioic).not.toBe(0);
  });

  it('la ficha 4 expone TID, NIOC, incompletas y PDIOIC', () => {
    const dim4 = observacionService.DIMENSIONES[4];
    expect(dim4.indicador).toBe('PDIOIC');
    expect(dim4.columnas).toEqual(['fecha', 'tid', 'nioc', 'incompletas', 'pdioic']);
    expect(dim4.labels).toEqual([
      'Fecha',
      'Total de incidencias evaluadas (TID)',
      'Incidencias con información completa (NIOC)',
      'Incidencias con información incompleta',
      'Porcentaje diario de incidencias con información completa (%) (PDIOIC)',
    ]);
  });

  it('las dimensiones 1, 2 y 3 consultan envíos agregados por jornada con NERD/TRD/TED', async () => {
    expect(observacionService.DIMENSIONES[1].indicador).toBe('TPDRE');
    expect(observacionService.DIMENSIONES[2].indicador).toBe('PDRE');
    expect(observacionService.DIMENSIONES[3].indicador).toBe('PDEEA');
    expect(observacionService.DIMENSIONES[1].columnas).toEqual(['fecha', 'nerd', 'suma_tre', 'tpdre']);
    expect(observacionService.DIMENSIONES[2].columnas).toEqual(['fecha', 'trd', 'rce', 'sin_error', 'pdre']);
    expect(observacionService.DIMENSIONES[3].columnas).toEqual(['fecha', 'ted', 'eea', 'no_actualizado', 'pdeea']);
    expect(observacionService.DIMENSIONES[1].columnas).not.toContain('codigo_envio');
    expect(observacionService.limiteFichaGrupo()).toBe(20);

    sequelize.query.mockResolvedValue([]);
    await observacionService.getDatosDimension(1);
    await observacionService.getDatosDimension(2);
    await observacionService.getDatosDimension(3);
    expect(sqlDeLlamada(1)).toContain('FROM envios e');
    expect(sqlDeLlamada(3)).toContain('FROM envios e');
    expect(sqlDeLlamada(5)).toContain('FROM envios e');
    expect(sqlDeLlamada(1)).toContain('AS nerd');
    expect(sqlDeLlamada(3)).toContain('AS trd');
    expect(sqlDeLlamada(5)).toContain('AS ted');
  });

  it('TPDRE usa el mismo conjunto de registros válidos en ΣTRE y NERD', async () => {
    sequelize.query.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    await observacionService.getDatosDimension(1);
    const sql = sqlDeLlamada(1);
    expect(sql).toContain('tiempo_registro_min IS NOT NULL');
    expect(sql).toContain('tiempo_registro_min >= 0');
    expect(sql).toContain(`COUNT(CASE WHEN ${observacionService.SQL_TIEMPO_VALIDO} THEN 1 END) AS nerd`);
    expect(sql).toContain(`SUM(CASE WHEN ${observacionService.SQL_TIEMPO_VALIDO} THEN e.tiempo_registro_min END)`);
    expect(sql).not.toMatch(/COUNT\(\*\) AS nerd/);
  });

  it('un tiempo_registro_min nulo no aumenta el denominador de TPDRE', async () => {
    sequelize.query
      .mockResolvedValueOnce([{ fecha: '2026-09-01' }])
      .mockResolvedValueOnce([{ fecha: '2026-09-01', nerd: 19, suma_tre: 95 }]);
    const filas = await observacionService.getDatosDimension(1);
    expect(filas).toHaveLength(1);
    expect(filas[0].nerd).toBe(19);
    expect(filas[0].suma_tre).toBe(95);
    expect(filas[0].tpdre).toBe(5);
    expect(filas[0].tpdre).not.toBe(4.75);
  });

  it('TPDRE es N/A si la jornada tiene envíos pero ningún tiempo válido', async () => {
    sequelize.query
      .mockResolvedValueOnce([{ fecha: '2026-09-01' }])
      .mockResolvedValueOnce([{ fecha: '2026-09-01', nerd: 0, suma_tre: 0 }]);
    const filas = await observacionService.getDatosDimension(1);
    expect(filas).toHaveLength(1);
    expect(filas[0].nerd).toBe(0);
    expect(filas[0].tpdre).toBe('N/A');
  });

  it('si hay más de 20 jornadas en el periodo, usa las primeras 20 cronológicas', async () => {
    const fechas = Array.from({ length: 22 }, (_, i) => ({
      fecha: `2026-09-${String(i + 1).padStart(2, '0')}`,
    }));
    sequelize.query.mockResolvedValueOnce(fechas).mockResolvedValueOnce([]);
    const filas = await observacionService.getDatosDimension(1);
    expect(filas).toHaveLength(20);
    expect(filas[0].fecha).toBe('01/09/2026');
    expect(filas[19].fecha).toBe('20/09/2026');
  });

  it('la exportación utiliza las mismas jornadas que la ficha', async () => {
    const jornadas = [{ fecha: '2026-09-01' }, { fecha: '2026-09-10' }];
    sequelize.query.mockImplementation((sql) => {
      if (String(sql).includes('SELECT DISTINCT DATE(e.fecha_registro)')) {
        return Promise.resolve(jornadas);
      }
      return Promise.resolve([]);
    });
    const ficha = await observacionService.getDatosDimension(4);
    const payload = await observacionService.buildExportPayload(4);
    expect(ficha.map((f) => f.fecha)).toEqual(['01/09/2026', '10/09/2026']);
    expect(payload.filas.map((f) => f.fecha)).toEqual(ficha.map((f) => f.fecha));
    expect(payload.exportados).toBe(ficha.length);
    expect(payload.jornadasDisponibles).toBe(2);
    expect(payload.jornadasEsperadas).toBe(20);
  });

  it('rechaza dimensiones fuera del rango 1-4', async () => {
    await expect(observacionService.getDatosDimension(9)).rejects.toThrow('Dimensión no válida');
  });
});

describe('cobertura de jornadas operativas', () => {
  it('si existen menos de 20 jornadas, informa el faltante sin generar datos', async () => {
    sequelize.query
      .mockResolvedValueOnce([{ fecha: '2026-09-01' }])
      .mockResolvedValueOnce([{ total: 40 }]);
    const cob = await observacionService.getCoberturaVentana();
    expect(cob.jornadasEsperadas).toBe(20);
    expect(cob.jornadasDisponibles).toBe(1);
    expect(cob.faltantes).toBe(19);
    expect(cob.completa).toBe(false);
    expect(cob.operacionesFueraDelPeriodo).toBe(40);
  });

  it('operaciones reales posteriores al periodo no invalidan la muestra', async () => {
    const veinte = Array.from({ length: 20 }, (_, i) => ({
      fecha: `2026-09-${String(i + 1).padStart(2, '0')}`,
    }));
    sequelize.query
      .mockResolvedValueOnce(veinte)
      .mockResolvedValueOnce([{ total: 120 }]);
    const cob = await observacionService.getCoberturaVentana();
    expect(cob.jornadasDisponibles).toBe(20);
    expect(cob.completa).toBe(true);
    expect(cob.operacionesFueraDelPeriodo).toBe(120);
    expect(cob.completa).not.toBe(cob.operacionesFueraDelPeriodo === 0);
  });
});

describe('módulo de investigación — solo lectura', () => {
  it('no exporta procedimientos que alteren datos para obtener resultados', () => {
    expect(observacionService.aleatorizarPosprueba).toBeUndefined();
    expect(observacionService.aplicarIndicadoresMuestra).toBeUndefined();
    expect(observacionService.normalizarEnvioPool).toBeUndefined();
    expect(observacionService.POSPRUEBA_POOL).toBeUndefined();
  });

  it('el servicio de observación no contiene INSERT, UPDATE ni DELETE', () => {
    const fuente = fs.readFileSync(
      path.join(__dirname, '../src/services/observacion.service.js'),
      'utf8'
    );
    expect(fuente).not.toMatch(/\bINSERT\b/i);
    expect(fuente).not.toMatch(/\bUPDATE\b/i);
    expect(fuente).not.toMatch(/\bDELETE\b/i);
    expect(fuente).not.toMatch(/ORDER BY RAND\(\)/);
    expect(fuente).not.toMatch(/LIMIT 50/);
    expect(fuente).not.toMatch(/aleatorizarPosprueba/);
    expect(fuente).not.toMatch(/3\s*[–-]\s*5 minutos/);
    expect(fuente).not.toMatch(/7\s*[–-]\s*10\s*%/);
    expect(fuente).not.toMatch(/85\s*[–-]\s*93/);
  });

  it('getMedicionInvestigacion no calcula ni expone preprueba y no usa fueraDeVentana para completar', async () => {
    sequelize.query.mockResolvedValue([]);
    const medicion = await observacionService.getMedicionInvestigacion();
    expect(medicion).not.toHaveProperty('preprueba');
    expect(medicion.posprueba).toBeDefined();
    expect(medicion.ventanas.preprueba).toBeUndefined();
    expect(medicion.muestra.completa).toBe(false);
    expect(medicion.muestra.jornadasEsperadas).toBe(20);
    expect(medicion.muestra.jornadasDisponibles).toBe(0);
    expect(medicion.muestra).not.toHaveProperty('fueraDeVentana');
  });
});
