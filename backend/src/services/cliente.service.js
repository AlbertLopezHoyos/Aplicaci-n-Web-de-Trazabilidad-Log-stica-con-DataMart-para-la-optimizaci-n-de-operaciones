const { Cliente } = require('../models');
const { Op } = require('sequelize');
const { sanitizeString } = require('../utils/sanitize');
const anonimizacion = require('./anonimizacion.service');

const toResponse = (cliente) => {
  const row = cliente?.toJSON ? cliente.toJSON() : cliente;
  if (!row) return row;
  return {
    ...row,
    nombre_completo: row.razon_social,
  };
};

const filtrarPorAlias = (clientes, termino, mapa) => {
  const q = termino.toLowerCase();
  return clientes.filter((c) => {
    const meta = mapa.get(c.id_cliente);
    const alias = meta?.alias || '';
    return alias.toLowerCase().includes(q) || String(c.id_cliente).includes(q);
  });
};

const list = async ({ search, page, limit, presentacionAcademica = false } = {}) => {
  if (presentacionAcademica) {
    const mapa = await anonimizacion.cargarMapaAlias();
    const clientes = await Cliente.findAll({
      where: { activo: true },
      order: [['id_cliente', 'ASC']],
    });

    let data = clientes.map((c) => anonimizacion.presentarCliente(c, mapa));
    const q = search?.trim();
    if (q) data = filtrarPorAlias(data, q, mapa);

    const pageNum = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(Math.max(Number(limit) || 25, 1), 100);
    const total = data.length;
    const offset = (pageNum - 1) * pageSize;

    return {
      data: data.slice(offset, offset + pageSize),
      total,
      page: pageNum,
      limit: pageSize,
      presentacion_academica: true,
    };
  }

  const where = { activo: true };
  const q = search?.trim();
  if (q) {
    where[Op.or] = [
      { razon_social: { [Op.like]: `%${q}%` } },
      { dni: { [Op.like]: `%${q}%` } },
    ];
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const pageSize = Math.min(Math.max(Number(limit) || (q ? 15 : 25), 1), 100);
  const offset = (pageNum - 1) * pageSize;

  const { count, rows } = await Cliente.findAndCountAll({
    where,
    order: [['razon_social', 'ASC']],
    limit: pageSize,
    offset,
  });

  let data = rows.map(toResponse);

  if (q && /^\d{8}$/.test(q.replace(/\D/g, ''))) {
    const exact = await findByDni(q, { presentacionAcademica: false });
    if (exact && !data.some((c) => c.id_cliente === exact.id_cliente)) {
      data = [exact, ...data].slice(0, pageSize);
    }
  }

  return {
    data,
    total: count,
    page: pageNum,
    limit: pageSize,
  };
};

const buildPayload = (data) => {
  const nombre = sanitizeString(data.nombre_completo || data.razon_social);
  if (!nombre) {
    throw Object.assign(new Error('Nombre completo requerido'), { statusCode: 400 });
  }
  const dni = String(data.dni || '').replace(/\D/g, '');
  if (!/^\d{8}$/.test(dni)) {
    throw Object.assign(new Error('DNI inválido: debe tener exactamente 8 dígitos'), { statusCode: 400 });
  }
  return {
    razon_social: nombre,
    dni,
    telefono: data.telefono?.trim() || null,
  };
};

const assertDniUnico = async (dni, excludeId = null) => {
  if (!dni) return;
  const where = { dni };
  if (excludeId) where.id_cliente = { [Op.ne]: excludeId };
  const dup = await Cliente.findOne({ where });
  if (dup) {
    throw Object.assign(
      new Error('Ya existe un cliente con ese DNI. Búsquelo por DNI o nombre en el buscador.'),
      { statusCode: 409 }
    );
  }
};

const findByDni = async (dni, { presentacionAcademica = false } = {}) => {
  const normalized = String(dni || '').replace(/\D/g, '');
  if (!/^\d{8}$/.test(normalized)) return null;
  const cliente = await Cliente.findOne({ where: { dni: normalized, activo: true } });
  if (!cliente) return null;
  if (presentacionAcademica) {
    const mapa = await anonimizacion.cargarMapaAlias();
    return anonimizacion.presentarCliente(cliente, mapa);
  }
  return toResponse(cliente);
};

const create = async (data) => {
  const payload = buildPayload(data);
  await assertDniUnico(payload.dni);
  const cliente = await Cliente.create(payload);
  anonimizacion.invalidarCache();
  return toResponse(cliente);
};

const update = async (id, data) => {
  const cliente = await Cliente.findByPk(id);
  if (!cliente) throw Object.assign(new Error('Cliente no encontrado'), { statusCode: 404 });
  const payload = buildPayload(data);
  await assertDniUnico(payload.dni, id);
  await cliente.update(payload);
  anonimizacion.invalidarCache();
  return toResponse(cliente);
};

module.exports = { list, create, update, findByDni };
