/**
 * Reglas de cálculo de los indicadores de investigación.
 * TPDRE = ΣTRE / NERD · PDRE = (RCE/TRD)×100 · PDEEA = (EEA/TED)×100 · PDIOIC = (NIOC/TID)×100
 */
const {
  CAMPOS_INCIDENCIA_COMPLETA,
  esIncidenciaCompleta,
  camposFaltantesIncidencia,
  esRegistroConError,
  tieneEstadoActualizado,
  calcularTPDRE,
  calcularPDRE,
  calcularPDEEA,
  calcularPDIOIC,
} = require('../src/utils/reglasIndicadores');

describe('TPDRE — tiempo promedio diario de registro de envíos', () => {
  it('si ΣTRE = 20 y NERD = 4, TPDRE = 5', () => {
    const { valor, numerador, denominador } = calcularTPDRE([4, 6, 8, 2]);
    expect(valor).toBe(5);
    expect(numerador).toBe(20);
    expect(denominador).toBe(4);
  });

  it('ignora valores no numéricos o nulos sin romper el promedio', () => {
    expect(calcularTPDRE([3, null, undefined, 'x', 5]).valor).toBe(4);
  });

  it('devuelve 0 cuando no hay registros evaluables', () => {
    expect(calcularTPDRE([]).valor).toBe(0);
  });
});

describe('PDRE — porcentaje diario de registros con error', () => {
  it('si RCE = 2 y TRD = 20, PDRE = 10 %', () => {
    expect(calcularPDRE(2, 20).valor).toBe(10);
  });

  it('cuenta una sola vez un envío con varios errores asociados', () => {
    const envio = { registro_correcto: false, total_errores: 3 };
    expect(esRegistroConError(envio)).toBe(true);
    expect(calcularPDRE(1, 20).valor).toBe(5);
  });

  it('marca error cuando existe al menos un error asociado aunque el envío esté marcado correcto', () => {
    expect(esRegistroConError({ registro_correcto: true, total_errores: 1 })).toBe(true);
  });

  it('no marca error en un registro correcto y sin errores asociados', () => {
    expect(esRegistroConError({ registro_correcto: true, total_errores: 0 })).toBe(false);
  });

  it('nunca puede superar el 100 % con datos coherentes', () => {
    expect(calcularPDRE(20, 20).valor).toBe(100);
  });
});

describe('PDEEA — porcentaje diario de envíos con estado actualizado', () => {
  it('considera actualizado el envío cuyo estado coincide con el último historial', () => {
    expect(tieneEstadoActualizado({ id_estado_actual: 3, id_ultimo_estado_historial: 3 })).toBe(true);
  });

  it('no considera actualizado el envío con historial desfasado', () => {
    expect(tieneEstadoActualizado({ id_estado_actual: 3, id_ultimo_estado_historial: 1 })).toBe(false);
  });

  it('no considera actualizado el envío sin historial', () => {
    expect(tieneEstadoActualizado({ id_estado_actual: 3, id_ultimo_estado_historial: null })).toBe(false);
  });

  it('si EEA = 18 y TED = 20, PDEEA = 90 %', () => {
    expect(calcularPDEEA(18, 20).valor).toBe(90);
  });
});

describe('PDIOIC — porcentaje diario de incidencias con información completa', () => {
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

  it('si NIOC = 9 y TID = 12, PDIOIC = 75 %', () => {
    const resultado = calcularPDIOIC(9, 12);
    expect(resultado.valor).toBe(75);
    expect(resultado.denominador).toBe(12);
  });

  it('si TID = 0, el 0 numérico no se interpreta como 0 % metodológico', () => {
    const resultado = calcularPDIOIC(0, 0);
    expect(resultado.denominador).toBe(0);
    // Compatibilidad numérica de la función genérica. La ficha muestra N/A
    // cuando TID = 0 (observacion.service.js).
    expect(resultado.valor).toBe(0);
  });
});
