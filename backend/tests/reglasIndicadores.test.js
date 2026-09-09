/**
 * Reglas de cálculo de los indicadores de investigación.
 * TPRE = ΣTRE / NER · PER = (RCE/TREg)×100 · PEEA = (EEA/TEE)×100 · PIOIC = (NIOC/NTIR)×100
 */
const {
  CAMPOS_INCIDENCIA_COMPLETA,
  esIncidenciaCompleta,
  camposFaltantesIncidencia,
  esRegistroConError,
  tieneEstadoActualizado,
  calcularTPRE,
  calcularPER,
  calcularPEEA,
  calcularPIOIC,
} = require('../src/utils/reglasIndicadores');

describe('TPRE — tiempo promedio de registro de envíos', () => {
  it('promedia los tiempos de registro en minutos', () => {
    const { valor, numerador, denominador } = calcularTPRE([4, 6, 8, 2]);
    expect(valor).toBe(5);
    expect(numerador).toBe(20);
    expect(denominador).toBe(4);
  });

  it('ignora valores no numéricos o nulos sin romper el promedio', () => {
    expect(calcularTPRE([3, null, undefined, 'x', 5]).valor).toBe(4);
  });

  it('devuelve 0 cuando no hay registros evaluables', () => {
    expect(calcularTPRE([]).valor).toBe(0);
  });
});

describe('PER — porcentaje de errores en los registros', () => {
  it('aplica la fórmula (RCE / TREg) × 100', () => {
    expect(calcularPER(7, 50).valor).toBe(14);
  });

  it('cuenta una sola vez un envío con varios errores asociados', () => {
    const envio = { registro_correcto: false, total_errores: 3 };
    expect(esRegistroConError(envio)).toBe(true);
    // el indicador recibe conteos de envíos, no de errores
    expect(calcularPER(1, 50).valor).toBe(2);
  });

  it('marca error cuando existe al menos un error asociado aunque el envío esté marcado correcto', () => {
    expect(esRegistroConError({ registro_correcto: true, total_errores: 1 })).toBe(true);
  });

  it('no marca error en un registro correcto y sin errores asociados', () => {
    expect(esRegistroConError({ registro_correcto: true, total_errores: 0 })).toBe(false);
  });

  it('nunca puede superar el 100 % con datos coherentes', () => {
    expect(calcularPER(50, 50).valor).toBe(100);
  });
});

describe('PEEA — porcentaje de envíos con estado actualizado', () => {
  it('considera actualizado el envío cuyo estado coincide con el último historial', () => {
    expect(tieneEstadoActualizado({ id_estado_actual: 3, id_ultimo_estado_historial: 3 })).toBe(true);
  });

  it('no considera actualizado el envío con historial desfasado', () => {
    expect(tieneEstadoActualizado({ id_estado_actual: 3, id_ultimo_estado_historial: 1 })).toBe(false);
  });

  it('no considera actualizado el envío sin historial', () => {
    expect(tieneEstadoActualizado({ id_estado_actual: 3, id_ultimo_estado_historial: null })).toBe(false);
  });

  it('aplica la fórmula (EEA / TEE) × 100', () => {
    expect(calcularPEEA(41, 50).valor).toBe(82);
  });
});

describe('PIOIC — porcentaje de incidencias con información completa', () => {
  const incidenciaCompleta = {
    tipo: 'retraso',
    area: 'Transporte',
    titulo: 'Retraso en ruta',
    descripcion: 'Demora de 24 horas por obras viales.',
    fuente_principal: 'Llamada telefónica',
  };

  it('exige exactamente los campos declarados como obligatorios', () => {
    expect(CAMPOS_INCIDENCIA_COMPLETA).toEqual([
      'tipo', 'area', 'titulo', 'descripcion', 'fuente_principal',
    ]);
    expect(esIncidenciaCompleta(incidenciaCompleta)).toBe(true);
  });

  it('considera incompleta la incidencia a la que le falta un campo obligatorio', () => {
    expect(esIncidenciaCompleta({ ...incidenciaCompleta, fuente_principal: null })).toBe(false);
    expect(esIncidenciaCompleta({ ...incidenciaCompleta, area: '   ' })).toBe(false);
  });

  it('no incluye observacion entre los campos de completitud', () => {
    expect(CAMPOS_INCIDENCIA_COMPLETA).not.toContain('observacion');
    expect(esIncidenciaCompleta({ ...incidenciaCompleta, observacion: '' })).toBe(true);
    expect(esIncidenciaCompleta({ ...incidenciaCompleta, observacion: null })).toBe(true);
    expect(esIncidenciaCompleta({
      ...incidenciaCompleta,
      fuente_principal: '',
      observacion: 'Nota de ficha con los cinco campos incompletos',
    })).toBe(false);
  });

  it('informa qué campos faltan', () => {
    const faltantes = camposFaltantesIncidencia({ ...incidenciaCompleta, area: '', descripcion: null });
    expect(faltantes).toEqual(['area', 'descripcion']);
  });

  it('se calcula sobre incidencias, no sobre los 50 envíos de la muestra', () => {
    // 12 incidencias registradas en los envíos seleccionados, 9 completas
    const resultado = calcularPIOIC(9, 12);
    expect(resultado.valor).toBe(75);
    expect(resultado.denominador).toBe(12);
    expect(resultado.denominador).not.toBe(50);
  });

  it('devuelve 0 si no hay incidencias registradas', () => {
    expect(calcularPIOIC(0, 0).valor).toBe(0);
  });
});
