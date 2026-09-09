/**
 * Capa de anonimización para sustentación académica.
 *
 * No modifica razon_social, dni ni telefono en la base de datos.
 * Genera alias académicos estables por id_cliente a partir de los envíos
 * asociados (muestra REAL preprueba/posprueba vs. datos SINTETICO).
 */
const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');

const DNI_MASCARADO = '********';
const TELEFONO_MASCARADO = '*** *** ***';
const CACHE_TTL_MS = 60_000;

let cacheMapa = null;
let cacheExpira = 0;

const resolverTipoCliente = ({ pre, pos, sint }) => {
  const tienePre = Number(pre) > 0;
  const tienePos = Number(pos) > 0;
  const tieneSint = Number(sint) > 0;
  if (tienePre && tienePos) return 'Muestra preprueba y posprueba';
  if (tienePre) return 'Muestra preprueba';
  if (tienePos) return 'Muestra posprueba';
  if (tieneSint) return 'Sintético (DataMart)';
  return 'Operacional';
};

const asignarAliasSecuencial = (filas, prefijo, mapa) => {
  const ordenadas = [...filas].sort((a, b) => a.id_cliente - b.id_cliente);
  ordenadas.forEach((fila, indice) => {
    const alias = `Cliente ${prefijo}-${String(indice + 1).padStart(3, '0')}`;
    mapa.set(fila.id_cliente, {
      alias,
      tipo_cliente: resolverTipoCliente(fila),
      total_envios: Number(fila.total_envios) || 0,
      es_sintetico: prefijo === 'SINT',
      es_muestra: prefijo === 'PRE' || prefijo === 'POS' || prefijo === 'ACAD',
    });
  });
};

/**
 * Mapa id_cliente → { alias, tipo_cliente, total_envios }.
 * Un mismo id_cliente siempre recibe el mismo alias mientras el mapa exista.
 */
const cargarMapaAlias = async () => {
  const ahora = Date.now();
  if (cacheMapa && ahora < cacheExpira) return cacheMapa;

  const filas = await sequelize.query(
    `SELECT c.id_cliente,
            SUM(CASE WHEN e.origen_dato = 'REAL' AND e.grupo_muestra = 'PREPRUEBA' THEN 1 ELSE 0 END) AS pre,
            SUM(CASE WHEN e.origen_dato = 'REAL' AND e.grupo_muestra = 'POSPRUEBA' THEN 1 ELSE 0 END) AS pos,
            SUM(CASE WHEN e.origen_dato = 'SINTETICO' THEN 1 ELSE 0 END) AS sint,
            COUNT(e.id_envio) AS total_envios
     FROM clientes c
     JOIN envios e ON e.id_cliente = c.id_cliente AND e.activo = 1
     GROUP BY c.id_cliente`,
    { type: QueryTypes.SELECT }
  );

  const preOnly = [];
  const posOnly = [];
  const ambos = [];
  const sintOnly = [];
  const operacional = [];

  filas.forEach((fila) => {
    const tienePre = Number(fila.pre) > 0;
    const tienePos = Number(fila.pos) > 0;
    const tieneSint = Number(fila.sint) > 0;
    if (tienePre && tienePos) ambos.push(fila);
    else if (tienePre) preOnly.push(fila);
    else if (tienePos) posOnly.push(fila);
    else if (tieneSint) sintOnly.push(fila);
    else operacional.push(fila);
  });

  const mapa = new Map();
  asignarAliasSecuencial(preOnly, 'PRE', mapa);
  asignarAliasSecuencial(posOnly, 'POS', mapa);
  asignarAliasSecuencial(ambos, 'ACAD', mapa);
  asignarAliasSecuencial(sintOnly, 'SINT', mapa);
  asignarAliasSecuencial(operacional, 'GEN', mapa);

  cacheMapa = mapa;
  cacheExpira = ahora + CACHE_TTL_MS;
  return mapa;
};

const invalidarCache = () => {
  cacheMapa = null;
  cacheExpira = 0;
};

const aliasPorDefecto = (idCliente) => `Cliente GEN-${String(idCliente).padStart(3, '0')}`;

/** Vista anonimizada de un cliente para la sustentación. */
const presentarCliente = (cliente, mapa) => {
  if (!cliente) return cliente;
  const row = cliente?.toJSON ? cliente.toJSON() : { ...cliente };
  const meta = mapa.get(row.id_cliente);
  const alias = meta?.alias || aliasPorDefecto(row.id_cliente);

  return {
    id_cliente: row.id_cliente,
    alias_academico: alias,
    nombre_completo: alias,
    razon_social: alias,
    dni: DNI_MASCARADO,
    telefono: TELEFONO_MASCARADO,
    activo: row.activo,
    tipo_cliente: meta?.tipo_cliente || 'Operacional',
    total_envios: meta?.total_envios ?? 0,
    es_sintetico: meta?.es_sintetico ?? false,
    es_muestra: meta?.es_muestra ?? false,
    datos_anonimizados: true,
  };
};

const anonimizarEnvio = (envio, mapa) => {
  if (!envio) return envio;
  const plain = envio?.toJSON ? envio.toJSON() : { ...envio };
  if (plain.cliente) plain.cliente = presentarCliente(plain.cliente, mapa);
  plain.datos_anonimizados = true;
  return plain;
};

const anonimizarIncidencia = (incidencia, mapa) => {
  if (!incidencia) return incidencia;
  const plain = incidencia?.toJSON ? incidencia.toJSON() : { ...incidencia };
  if (plain.envio?.cliente) {
    plain.envio = { ...plain.envio, cliente: presentarCliente(plain.envio.cliente, mapa) };
  }
  return plain;
};

const anonimizarListaEnvios = async (resultado) => {
  const mapa = await cargarMapaAlias();
  if (Array.isArray(resultado?.data)) {
    return { ...resultado, data: resultado.data.map((e) => anonimizarEnvio(e, mapa)) };
  }
  return resultado;
};

const anonimizarEnvioUnico = async (envio) => {
  const mapa = await cargarMapaAlias();
  return anonimizarEnvio(envio, mapa);
};

const anonimizarListaIncidencias = async (resultado) => {
  const mapa = await cargarMapaAlias();
  if (!Array.isArray(resultado?.data)) return resultado;
  return { ...resultado, data: resultado.data.map((i) => anonimizarIncidencia(i, mapa)) };
};

const anonimizarNombreCliente = async (idCliente, nombreOriginal) => {
  const mapa = await cargarMapaAlias();
  return mapa.get(idCliente)?.alias || aliasPorDefecto(idCliente);
};

module.exports = {
  DNI_MASCARADO,
  TELEFONO_MASCARADO,
  cargarMapaAlias,
  invalidarCache,
  presentarCliente,
  anonimizarEnvio,
  anonimizarIncidencia,
  anonimizarListaEnvios,
  anonimizarEnvioUnico,
  anonimizarListaIncidencias,
  anonimizarNombreCliente,
};
