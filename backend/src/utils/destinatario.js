const normalizarDni = (valor) => String(valor || '').replace(/\D/g, '').slice(0, 8);

const validarDestinatario = (data) => {
  const nombre = String(data.nombre_destinatario || '').trim();
  const dni = normalizarDni(data.dni_destinatario);
  const telefono = String(data.telefono_destinatario || '').trim();

  if (!nombre) {
    throw Object.assign(new Error('Nombre del destinatario requerido'), { statusCode: 400 });
  }
  if (!/^\d{8}$/.test(dni)) {
    throw Object.assign(new Error('DNI del destinatario debe tener 8 dígitos'), { statusCode: 400 });
  }
  if (!telefono || telefono.length < 7) {
    throw Object.assign(new Error('Teléfono del destinatario requerido'), { statusCode: 400 });
  }

  return {
    nombre_destinatario: nombre,
    dni_destinatario: dni,
    telefono_destinatario: telefono,
  };
};

const generarDestinatarioAleatorio = (seed = 1) => {
  const nombres = [
    'Ana Pérez López', 'Luis Gómez Ruiz', 'Carmen Vargas Silva', 'Pedro Huamán Quispe',
    'Lucía Mendoza Ríos', 'Jorge Medina Ponce', 'Silvia Acosta Vega', 'Diego Paredes Silva',
  ];
  const nombre = nombres[Math.abs(seed) % nombres.length];
  const dni = String(10000000 + (Math.abs(seed * 7919) % 89999999)).slice(0, 8);
  const telefono = `9${String(10000000 + (Math.abs(seed * 3571) % 89999999)).slice(0, 8)}`;
  return { nombre_destinatario: nombre, dni_destinatario: dni, telefono_destinatario: telefono };
};

module.exports = { normalizarDni, validarDestinatario, generarDestinatarioAleatorio };
