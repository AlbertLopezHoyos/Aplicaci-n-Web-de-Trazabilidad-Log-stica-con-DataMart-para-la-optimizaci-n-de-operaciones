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

module.exports = {
  REF_DATE,
  ORIGENES_LIMA,
  DESTINOS_PERU,
  TIPOS_CARGA,
  AREAS,
  FUENTES,
  TIPOS_INC,
  pick,
  randomInt,
  randomDate,
  addDays,
  daysBetween,
  resolveEstadoOperativo,
};
