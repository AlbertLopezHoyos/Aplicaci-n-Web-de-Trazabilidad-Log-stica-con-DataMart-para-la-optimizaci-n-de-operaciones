/**
 * ETL del DataMart: idempotencia de la carga y bitácora de ejecución.
 */
const transaction = { commit: jest.fn(), rollback: jest.fn() };

jest.mock('../src/models', () => ({
  sequelize: {
    query: jest.fn(),
    transaction: jest.fn(),
  },
}));

const { sequelize } = require('../src/models');
const etlService = require('../src/datamart/etl.service');

const sqls = () => sequelize.query.mock.calls.map(([sql]) => sql.replace(/\s+/g, ' '));

/**
 * Simula la secuencia de consultas de runStaging: bitácora → extracción →
 * 3 UPDATE de expiración → 3 INSERT dim → 3 UPDATE dim → conteo →
 * INSERT hechos → UPDATE operador de hechos → UPDATE métricas de hechos.
 */
const mockRunStaging = ({ insertados = 0, actualizados = 0, expirados = 0 } = {}) => {
  sequelize.transaction.mockResolvedValue(transaction);
  sequelize.query
    .mockResolvedValueOnce([101])                                              // abrirBitacora
    .mockResolvedValueOnce([{ envios: 5500, clientes: 50, estados: 6, usuarios: 2, incidencias: 990 }])
    .mockResolvedValueOnce([{ affectedRows: expirados }])                      // expira dim_cliente
    .mockResolvedValueOnce([{ affectedRows: 0 }])                              // expira dim_estado
    .mockResolvedValueOnce([{ affectedRows: expirados }])                      // expira dim_operador
    .mockResolvedValueOnce([{ affectedRows: 0 }])                              // dim_cliente
    .mockResolvedValueOnce([{ affectedRows: 0 }])                              // dim_estado
    .mockResolvedValueOnce([{ affectedRows: 0 }])                              // dim_operador
    .mockResolvedValueOnce([{}])                                               // update dim_cliente
    .mockResolvedValueOnce([{}])                                               // update dim_estado
    .mockResolvedValueOnce([{}])                                               // update dim_operador
    .mockResolvedValueOnce([{ total: 5500 }])                                  // transformables
    .mockResolvedValueOnce([{ affectedRows: insertados }])                     // insert hechos
    .mockResolvedValueOnce([{}])                                               // reapunta operador
    .mockResolvedValueOnce([{ affectedRows: actualizados }])                   // update hechos
    .mockResolvedValueOnce([{}]);                                              // cerrarBitacora
};

beforeEach(() => {
  sequelize.query.mockReset();
  sequelize.transaction.mockReset();
  transaction.commit.mockReset();
  transaction.rollback.mockReset();
});

describe('runStaging — idempotencia', () => {
  it('inserta hechos solo para envíos que aún no están en la tabla de hechos', async () => {
    mockRunStaging({ insertados: 5500, actualizados: 0 });
    await etlService.runStaging();

    const insertHechos = sqls().find((s) => s.includes('INSERT INTO fact_operaciones_logisticas'));
    expect(insertHechos).toContain('NOT EXISTS (SELECT 1 FROM fact_operaciones_logisticas f WHERE f.id_envio = e.id_envio)');
  });

  it('una segunda ejecución no carga hechos nuevos y solo refresca métricas', async () => {
    mockRunStaging({ insertados: 0, actualizados: 5500 });
    const resultado = await etlService.runStaging();

    expect(resultado.filasCargadas).toBe(0);
    expect(resultado.filasActualizadas).toBe(5500);
    expect(resultado.mensaje).toMatch(/idempotente/i);
  });

  it('carga las dimensiones evitando duplicar filas vigentes', async () => {
    mockRunStaging();
    await etlService.runStaging();

    const inserts = sqls().filter((s) => s.startsWith('INSERT INTO dim_'));
    expect(inserts).toHaveLength(3);
    inserts.forEach((sql) => expect(sql).toContain('NOT EXISTS'));
  });

  it('propaga origen_dato hacia la tabla de hechos para poder aislar los sintéticos', async () => {
    mockRunStaging({ insertados: 10 });
    await etlService.runStaging();

    const insertHechos = sqls().find((s) => s.includes('INSERT INTO fact_operaciones_logisticas'));
    expect(insertHechos).toContain('origen_dato');
  });

  it('cierra los miembros de dimensión cuyo registro de origen ya no está vigente', async () => {
    mockRunStaging({ expirados: 2 });
    const resultado = await etlService.runStaging();

    const cierres = sqls().filter((s) => s.includes('SET d.es_actual = 0'));
    expect(cierres).toHaveLength(3);
    cierres.forEach((sql) => expect(sql).toContain('d.vigente_hasta = CURDATE()'));
    expect(resultado.dimensionesExpiradas.dim_operador).toBe(2);
  });

  it('reapunta los hechos al operador vigente cuando cambia el responsable en el origen', async () => {
    mockRunStaging();
    await etlService.runStaging();

    const reapunte = sqls().find((s) => s.includes('SET f.id_dim_operador = dop.id_dim_operador'));
    expect(reapunte).toContain('dop.es_actual = 1');
  });

  it('confirma la transacción al terminar correctamente', async () => {
    mockRunStaging({ insertados: 3 });
    await etlService.runStaging();
    expect(transaction.commit).toHaveBeenCalledTimes(1);
    expect(transaction.rollback).not.toHaveBeenCalled();
  });
});

describe('runStaging — bitácora de ejecución', () => {
  it('registra inicio, fin, estado y conteos de la corrida', async () => {
    mockRunStaging({ insertados: 5500 });
    const resultado = await etlService.runStaging();

    const apertura = sqls().find((s) => s.includes('INSERT INTO etl_ejecuciones'));
    expect(apertura).toContain('EN_PROCESO');

    const cierre = sequelize.query.mock.calls.find(([sql]) => sql.includes('UPDATE etl_ejecuciones'));
    expect(cierre[1].replacements).toMatchObject({
      estado: 'EXITOSO',
      cargados: 5500,
      transformados: 5500,
    });
    expect(resultado.registrosExtraidos).toBe(6548);
  });

  it('marca la ejecución como FALLIDA y revierte si el ETL falla', async () => {
    sequelize.transaction.mockResolvedValue(transaction);
    sequelize.query
      .mockResolvedValueOnce([101])
      .mockRejectedValueOnce(new Error('tabla envios inaccesible'))
      .mockResolvedValueOnce([{}]);

    await expect(etlService.runStaging()).rejects.toThrow('tabla envios inaccesible');
    expect(transaction.rollback).toHaveBeenCalledTimes(1);

    const cierre = sequelize.query.mock.calls.find(([sql]) => sql.includes('UPDATE etl_ejecuciones'));
    expect(cierre[1].replacements).toMatchObject({
      estado: 'FALLIDO',
      error: 'tabla envios inaccesible',
    });
  });

  it('no rompe el ETL si la tabla de bitácora todavía no existe', async () => {
    sequelize.transaction.mockResolvedValue(transaction);
    sequelize.query.mockRejectedValueOnce(new Error("Table 'etl_ejecuciones' doesn't exist"));
    sequelize.query
      .mockResolvedValueOnce([{ envios: 8, clientes: 5, estados: 6, usuarios: 2, incidencias: 2 }])
      .mockResolvedValueOnce([{ affectedRows: 0 }])
      .mockResolvedValueOnce([{ affectedRows: 0 }])
      .mockResolvedValueOnce([{ affectedRows: 0 }])
      .mockResolvedValueOnce([{ affectedRows: 0 }])
      .mockResolvedValueOnce([{ affectedRows: 0 }])
      .mockResolvedValueOnce([{ affectedRows: 0 }])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{ total: 8 }])
      .mockResolvedValueOnce([{ affectedRows: 8 }])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{ affectedRows: 0 }]);

    const resultado = await etlService.runStaging();
    expect(resultado.ok).toBe(true);
    expect(resultado.idEjecucion).toBeNull();
  });
});
