const { EstadoEnvio } = require('../models');
const clienteService = require('../services/cliente.service');
const { success } = require('../utils/response');

const getEstados = async (req, res, next) => {
  try {
    const estados = await EstadoEnvio.findAll({ where: { activo: true }, order: [['orden', 'ASC']] });
    return success(res, estados);
  } catch (err) {
    next(err);
  }
};

const getClientes = async (req, res, next) => {
  try {
    const result = await clienteService.list({
      search: req.query.search,
      page: req.query.page,
      limit: req.query.limit,
    });
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

const createCliente = async (req, res, next) => {
  try {
    const cliente = await clienteService.create(req.body);
    return success(res, cliente, 'Cliente registrado', 201);
  } catch (err) {
    next(err);
  }
};

const updateCliente = async (req, res, next) => {
  try {
    const cliente = await clienteService.update(req.params.id, req.body);
    return success(res, cliente, 'Cliente actualizado');
  } catch (err) {
    next(err);
  }
};

const checkClienteDni = async (req, res, next) => {
  try {
    const cliente = await clienteService.findByDni(req.query.dni);
    return success(res, { exists: Boolean(cliente), cliente });
  } catch (err) {
    next(err);
  }
};

module.exports = { getEstados, getClientes, createCliente, updateCliente, checkClienteDni };
