/** Tipos de carga operativos (formulario web). Los 5500 sintéticos conservan su catálogo anterior. */
const ORIGEN_ENVIO_FIJO = 'Lima';

const TIPOS_CARGA_OPERATIVOS = Object.freeze(['frágil', 'general', 'vulnerable']);

const ESPECIFICACIONES_EJEMPLO = Object.freeze({
  frágil: ['Vidrio y cerámica', 'Electrodomésticos delicados', 'Equipos electrónicos'],
  general: ['Documentos', 'Repuestos varios', 'Encomienda estándar', ''],
  vulnerable: ['Medicamentos', 'Productos químicos ligeros', 'Alimentos perecederos'],
});

const esTipoCargaValido = (valor) => TIPOS_CARGA_OPERATIVOS.includes(String(valor || '').trim());

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const especificacionAleatoria = (tipo) => pick(ESPECIFICACIONES_EJEMPLO[tipo] || ['']);

module.exports = {
  ORIGEN_ENVIO_FIJO,
  TIPOS_CARGA_OPERATIVOS,
  ESPECIFICACIONES_EJEMPLO,
  esTipoCargaValido,
  pick,
  especificacionAleatoria,
};
