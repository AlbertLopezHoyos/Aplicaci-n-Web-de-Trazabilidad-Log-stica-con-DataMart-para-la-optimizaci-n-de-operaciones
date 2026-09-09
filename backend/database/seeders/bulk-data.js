/** Datos realistas Lima 2026 para generación masiva (DataMart / sustentación) */

const REF_DATE = process.env.BULK_REF_DATE || '2026-05-31';

const ORIGENES_LIMA = [
  'Lima - Surquillo', 'Lima - Ate', 'Callao', 'Lima - La Molina', 'Los Olivos',
  'Villa El Salvador', 'Lince', 'Miraflores', 'San Isidro', 'San Miguel',
  'Comas', 'Independencia', 'Breña', 'Rímac', 'Chorrillos', 'San Juan de Lurigancho',
  'Santa Anita', 'Magdalena', 'Pueblo Libre', 'Jesús María',
];

const DESTINOS_PERU = [
  'Arequipa Centro', 'Trujillo', 'Piura', 'Cusco', 'Ica', 'Chiclayo', 'Huancayo',
  'Tacna', 'Puno', 'Cajamarca', 'Tarapoto', 'Iquitos', 'Huaraz', 'Ayacucho',
  'Pucallpa', 'Tumbes', 'Moquegua', 'Juliaca', 'Abancay', 'Huánuco',
];

const TIPOS_CARGA = [
  'Carga general', 'Encomienda', 'Carga refrigerada', 'Repuestos', 'Documentación',
  'Equipos tecnológicos', 'Muebles', 'Mudanza parcial', 'Productos químicos',
  'Textiles', 'Alimentos no perecederos', 'Maquinaria industrial',
];

const AREAS = ['Operaciones', 'Almacén', 'Transporte', 'Atención al cliente', 'Administración'];
const FUENTES = ['Sistema web', 'Llamada telefónica', 'Correo electrónico', 'WhatsApp', 'Documento físico'];
const TIPOS_INC = ['retraso', 'error', 'dano', 'observacion', 'otro'];

/**
 * Notas operativas que un asistente escribiría al registrar el envío.
 * Se usan para que la columna "Observaciones" de las fichas no repita
 * una plantilla en todos los registros.
 */
const OBSERVACIONES_ENVIO = [
  '',
  '',
  '',
  'Cliente solicita entrega en horario de mañana.',
  'Coordinar con el almacén de destino antes del despacho.',
  'Carga frágil, requiere embalaje reforzado.',
  'Se adjunta guía de remisión firmada por el cliente.',
  'Pago contra entrega, confirmar con caja.',
  'El cliente recogerá la carga en la agencia de destino.',
  'Requiere estoca para la descarga en destino.',
  'Dirección de destino confirmada por WhatsApp con el cliente.',
  'Contacto en destino disponible solo por las tardes.',
  'Bultos rotulados y precintados en almacén Surquillo.',
  'Se separó espacio en la unidad de la ruta del jueves.',
  'Cliente frecuente, aplica tarifa acordada.',
  'Entrega sujeta a disponibilidad del contacto en destino.',
  'Se verificó peso en balanza de almacén.',
  'Documentación entregada al conductor en el punto de salida.',
];

/** Comentarios de cambio de estado redactados como los escribe el operador. */
const COMENTARIOS_ESTADO = {
  recibido: [
    'Carga recibida y verificada en almacén.',
    'Bultos ingresados y rotulados en almacén.',
    'Recepción conforme según guía del cliente.',
  ],
  en_transito: [
    'Unidad salió de almacén Surquillo.',
    'Carga despachada en la ruta programada.',
    'En ruta, conductor confirmó salida.',
    'Transbordo realizado en terminal, continúa viaje.',
  ],
  retrasado: [
    'Demora por congestión en la carretera.',
    'Unidad detenida por control de tránsito.',
    'Retraso por reprogramación de la unidad.',
    'No se ubicó al contacto en destino, se reprograma.',
  ],
  entregado: [
    'Entregado al cliente, cargo firmado.',
    'Entrega conforme, sin observaciones.',
    'Recibido por el contacto autorizado en destino.',
    'Entregado en agencia, cliente recogió la carga.',
  ],
  cancelado: [
    'Cancelado a solicitud del cliente.',
    'Anulado por desistimiento del cliente.',
    'Cancelado, la carga no se presentó en almacén.',
  ],
};

/** Errores típicos de digitación para la ficha de calidad (PER). */
const ERRORES_REGISTRO = [
  {
    tipo_error: 'Dato incompleto',
    campo_afectado: 'destino',
    descripcion: 'Se registró el envío sin la referencia de la dirección de destino.',
  },
  {
    tipo_error: 'Dato errado',
    campo_afectado: 'peso_kg',
    descripcion: 'El peso digitado no coincide con el pesaje de balanza en almacén.',
  },
  {
    tipo_error: 'Dato errado',
    campo_afectado: 'numero_paquetes',
    descripcion: 'La cantidad de bultos difiere de la guía física del cliente.',
  },
  {
    tipo_error: 'Error de digitación',
    campo_afectado: 'destino',
    descripcion: 'Destino mal escrito, se corrigió tras confirmar con el cliente.',
  },
  {
    tipo_error: 'Dato incompleto',
    campo_afectado: 'tipo_carga',
    descripcion: 'No se especificó el tipo de mercadería al momento del registro.',
  },
  {
    tipo_error: 'Dato errado',
    campo_afectado: 'fecha_estimada_entrega',
    descripcion: 'Fecha estimada cargada fuera del plazo acordado con el cliente.',
  },
];

/** Títulos y descripciones de incidencias por tipo (dimensión 4 — PIOIC). */
const INCIDENCIAS_POR_TIPO = {
  retraso: [
    ['Retraso en la salida de la unidad', 'La unidad salió con demora por congestión en la vía de acceso al almacén.'],
    ['Demora en ruta por bloqueo', 'Se reportó bloqueo en la carretera; el conductor tomó ruta alterna.'],
    ['Entrega reprogramada', 'No se ubicó al contacto en destino, se reprogramó la entrega para el día siguiente.'],
  ],
  error: [
    ['Error en la dirección de entrega', 'La dirección registrada no correspondía al destino final; se corrigió con el cliente.'],
    ['Guía con datos incorrectos', 'La guía consignaba un número de bultos distinto al recibido en almacén.'],
    ['Cobro mal calculado', 'El monto del envío se calculó con una tarifa que no correspondía al cliente.'],
  ],
  dano: [
    ['Embalaje dañado en tránsito', 'Se detectó el embalaje deteriorado al momento de la descarga en destino.'],
    ['Bulto con abolladura', 'Uno de los bultos presentó abolladura; se registró con foto de evidencia.'],
    ['Mercadería con humedad', 'La carga presentó humedad por lluvia durante el traslado.'],
  ],
  observacion: [
    ['Cliente solicita reprogramar', 'El cliente pidió reprogramar la entrega por no contar con personal de recepción.'],
    ['Cambio de contacto en destino', 'El cliente comunicó un nuevo contacto y teléfono para la entrega.'],
    ['Solicitud de comprobante', 'El cliente solicitó copia del cargo de entrega firmado.'],
  ],
  otro: [
    ['Falta de contacto en destino', 'No se logró comunicación con el destinatario en los teléfonos registrados.'],
    ['Unidad con desperfecto mecánico', 'La unidad presentó falla mecánica; la carga se transfirió a otro vehículo.'],
    ['Documentación pendiente', 'Faltó adjuntar la guía firmada al cierre de la ruta.'],
  ],
};

/** Incidencias registradas a medias (quedan sin área ni fuente → PIOIC incompleto). */
const INCIDENCIAS_INCOMPLETAS = [
  ['Reclamo pendiente de tipificar', 'El cliente reportó un problema con la entrega; falta completar el detalle.'],
  ['Observación reportada por el conductor', 'Se avisó por teléfono, no se registró el detalle en el sistema.'],
  ['Caso derivado sin detalle', 'Derivado desde atención al cliente, pendiente de ampliar información.'],
];

/** Nombres peruanos para clientes simulados (persona natural) */
const NOMBRES_CLIENTES = [
  'Albert López Hoyos', 'María García Ruiz', 'Carlos Mendoza Vela', 'Rosa Quispe Huamán', 'José Torres Ramírez',
  'Ana Flores Castillo', 'Luis Ramírez Paredes', 'Patricia Vargas Solís', 'Miguel Huamán Ccoyllor', 'Lucía Mendoza Ríos',
  'Fernando Salazar Ortiz', 'Carmen Delgado Peña', 'Ricardo Chávez Luna', 'Elena Rojas Campos', 'Diego Paredes Silva',
  'Gabriela Ortiz Mejía', 'Héctor Villanueva Cruz', 'Silvia Acosta Vega', 'Jorge Medina Ponce', 'Valeria Castro Núñez',
  'Roberto Espinoza León', 'Claudia Fuentes Aguirre', 'Andrés Morales Quiroz', 'Daniela Suárez Palacios', 'Felipe Navarro Díaz',
  'Isabel Cárdenas Ruiz', 'Oscar Herrera Guzmán', 'Mónica Peña Valdez', 'Raúl Soto Arévalo', 'Teresa Iglesias Molina',
  'Pablo Ríos Carrasco', 'Adriana Campos Vela', 'Sergio Luna Tapia', 'Verónica Salinas Bravo', 'Gustavo Ponce Rojas',
  'Natalia Vega Calderón', 'Emilio Córdova Paredes', 'Karina Toledo Espinoza', 'Iván Barrios Montoya', 'Paola Reyna Chávez',
  'Manuel Aguilar Torres', 'Sandra Pizarro Huerta', 'César Domínguez León', 'Ruth Mercado Solano', 'Arturo Benítez Ramos',
  'Lorena Figueroa Castro', 'Marco Avalos Quiñones', 'Jessica Palomino Vera', 'Renzo Cabrera Ortiz', 'Fiorella Zavala Ríos',
];

const dniFromIndex = (i) => String(10000000 + ((i * 7919) % 89999999)).slice(0, 8);

const calcularTotalEnvio = (pesoKg, numeroPaquetes, prioridad = 'normal') => {
  const peso = parseFloat(pesoKg) || 0;
  const paquetes = parseInt(numeroPaquetes, 10) || 1;
  const tarifaBase = 35;
  const mult = { baja: 0.92, normal: 1, alta: 1.12, urgente: 1.28 };
  const subtotal = tarifaBase + peso * 2.2 + paquetes * 8;
  return Math.round(subtotal * (mult[prioridad] || 1) * 100) / 100;
};

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const randomDate = (from, to) => {
  const start = new Date(from).getTime();
  const end = new Date(to).getTime();
  const t = start + Math.random() * (end - start);
  return new Date(t).toISOString().split('T')[0];
};

const addDays = (dateStr, days) => {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const daysBetween = (fromStr, toStr) => {
  const from = new Date(`${fromStr}T12:00:00`);
  const to = new Date(`${toStr}T12:00:00`);
  return Math.floor((to - from) / 86400000);
};

/**
 * Estado coherente con la antigüedad del envío respecto a la fecha de referencia.
 * Envíos antiguos → mayoría entregado o cancelado.
 * Envíos recientes → recibido, en tránsito o retrasado.
 */
const resolveEstadoOperativo = (fechaRegistro, refDate = REF_DATE) => {
  const leadDays = randomInt(2, 12);
  const fechaEstimada = addDays(fechaRegistro, leadDays);
  const diasDesdeReg = daysBetween(fechaRegistro, refDate);
  const diasPasadoEta = daysBetween(fechaEstimada, refDate);

  let estadoCodigo;
  let fechaEntregaReal = null;

  if (diasPasadoEta > 7) {
    estadoCodigo = Math.random() < 0.91 ? 'entregado' : 'cancelado';
    if (estadoCodigo === 'entregado') {
      fechaEntregaReal = addDays(fechaEstimada, randomInt(-1, 3));
    }
  } else if (diasPasadoEta > 0) {
    const r = Math.random();
    if (r < 0.62) {
      estadoCodigo = 'entregado';
      fechaEntregaReal = addDays(fechaEstimada, randomInt(0, 4));
    } else if (r < 0.82) {
      estadoCodigo = 'retrasado';
    } else if (r < 0.93) {
      estadoCodigo = 'en_transito';
    } else {
      estadoCodigo = 'cancelado';
    }
  } else if (diasDesdeReg >= 2) {
    const r = Math.random();
    if (r < 0.48) estadoCodigo = 'en_transito';
    else if (r < 0.72) estadoCodigo = 'retrasado';
    else if (r < 0.88) estadoCodigo = 'recibido';
    else {
      estadoCodigo = 'entregado';
      fechaEntregaReal = addDays(fechaRegistro, randomInt(Math.max(1, leadDays - 1), leadDays));
    }
  } else {
    estadoCodigo = Math.random() < 0.72 ? 'recibido' : 'en_transito';
  }

  return { estadoCodigo, leadDays, fechaEstimada, fechaEntregaReal };
};

/**
 * Estado operativo al corte de una fecha de medición.
 *
 * @param {string} fechaRegistro YYYY-MM-DD
 * @param {string} fechaMedicion YYYY-MM-DD
 * @param {() => number} rnd — generador 0..1
 */
const resolveEstadoMedicion = (fechaRegistro, fechaMedicion, rnd = Math.random) => {
  const dia = parseInt(fechaRegistro.slice(8, 10), 10);
  let leadDays;
  if (dia >= 18) {
    leadDays = 24 + Math.floor(rnd() * 16);
  } else if (dia >= 16) {
    leadDays = 20 + Math.floor(rnd() * 14);
  } else if (dia >= 11) {
    leadDays = 12 + Math.floor(rnd() * 14);
  } else if (dia >= 6) {
    leadDays = 7 + Math.floor(rnd() * 10);
  } else {
    leadDays = 4 + Math.floor(rnd() * 8);
  }

  const fechaEstimada = addDays(fechaRegistro, leadDays);
  const diasPasadoEta = daysBetween(fechaEstimada, fechaMedicion);
  const diasDesdeReg = daysBetween(fechaRegistro, fechaMedicion);

  let estadoCodigo;
  let fechaEntregaReal = null;

  if (diasPasadoEta < 0) {
    const r = rnd();
    if (diasDesdeReg <= 3) {
      estadoCodigo = r < 0.55 ? 'recibido' : 'en_transito';
    } else {
      estadoCodigo = r < 0.15 ? 'recibido' : r < 0.7 ? 'en_transito' : 'retrasado';
    }
  } else if (diasPasadoEta <= 4) {
    const r = rnd();
    if (r < 0.18) {
      estadoCodigo = 'entregado';
      fechaEntregaReal = addDays(fechaEstimada, Math.floor(rnd() * 2));
    } else if (r < 0.52) estadoCodigo = 'retrasado';
    else if (r < 0.85) estadoCodigo = 'en_transito';
    else estadoCodigo = 'recibido';
  } else if (diasPasadoEta <= 12) {
    const r = rnd();
    if (r < 0.55) {
      estadoCodigo = 'entregado';
      fechaEntregaReal = addDays(fechaEstimada, Math.floor(rnd() * 4));
    } else if (r < 0.78) estadoCodigo = 'retrasado';
    else if (r < 0.93) estadoCodigo = 'en_transito';
    else estadoCodigo = 'cancelado';
  } else {
    const r = rnd();
    if (r < 0.88) {
      estadoCodigo = 'entregado';
      fechaEntregaReal = addDays(fechaEstimada, Math.floor(rnd() * 5) - 1);
    } else if (r < 0.96) estadoCodigo = 'cancelado';
    else estadoCodigo = 'retrasado';
  }

  return { estadoCodigo, leadDays, fechaEstimada, fechaEntregaReal };
};

module.exports = {
  REF_DATE,
  ORIGENES_LIMA,
  DESTINOS_PERU,
  TIPOS_CARGA,
  AREAS,
  FUENTES,
  TIPOS_INC,
  OBSERVACIONES_ENVIO,
  COMENTARIOS_ESTADO,
  ERRORES_REGISTRO,
  INCIDENCIAS_POR_TIPO,
  INCIDENCIAS_INCOMPLETAS,
  NOMBRES_CLIENTES,
  dniFromIndex,
  calcularTotalEnvio,
  pick,
  randomInt,
  randomDate,
  addDays,
  daysBetween,
  resolveEstadoOperativo,
  resolveEstadoMedicion,
};
