const {
  presentarCliente,
  anonimizarEnvio,
  DNI_MASCARADO,
  TELEFONO_MASCARADO,
} = require('../src/services/anonimizacion.service');

describe('anonimizacion.service', () => {
  const mapa = new Map([
    [10, { alias: 'Cliente POS-001', tipo_cliente: 'Muestra posprueba', total_envios: 3, es_muestra: true }],
    [20, { alias: 'Cliente SINT-001', tipo_cliente: 'Sintético (DataMart)', total_envios: 100, es_sintetico: true }],
  ]);

  test('presentarCliente enmascara PII y expone alias estable', () => {
    const vista = presentarCliente(
      { id_cliente: 10, razon_social: 'Juan Pérez Real', dni: '12345678', telefono: '999888777', activo: true },
      mapa
    );
    expect(vista.alias_academico).toBe('Cliente POS-001');
    expect(vista.razon_social).toBe('Cliente POS-001');
    expect(vista.dni).toBe(DNI_MASCARADO);
    expect(vista.telefono).toBe(TELEFONO_MASCARADO);
    expect(vista.tipo_cliente).toBe('Muestra posprueba');
    expect(vista.total_envios).toBe(3);
    expect(vista.datos_anonimizados).toBe(true);
  });

  test('anonimizarEnvio conserva datos operativos del envío', () => {
    const envio = {
      codigo_envio: 'GLS-2026-00001',
      origen: 'Lima',
      destino: 'Arequipa',
      peso_kg: 120,
      numero_paquetes: 2,
      cliente: { id_cliente: 10, razon_social: 'Nombre Real', dni: '11111111' },
    };
    const anon = anonimizarEnvio(envio, mapa);
    expect(anon.codigo_envio).toBe('GLS-2026-00001');
    expect(anon.origen).toBe('Lima');
    expect(anon.destino).toBe('Arequipa');
    expect(anon.peso_kg).toBe(120);
    expect(anon.cliente.alias_academico).toBe('Cliente POS-001');
    expect(anon.cliente.dni).toBe(DNI_MASCARADO);
  });

  test('diferencia clientes sintéticos en tipo_cliente', () => {
    const vista = presentarCliente({ id_cliente: 20, razon_social: 'X', activo: true }, mapa);
    expect(vista.tipo_cliente).toBe('Sintético (DataMart)');
    expect(vista.es_sintetico).toBe(true);
  });
});
