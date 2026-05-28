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
    const clientes = await clienteService.list(req.query.search);
    return success(res, clientes);
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

module.exports = { getEstados, getClientes, createCliente };
