/** Etiqueta de cliente para listados y selects */
export const labelCliente = (c) => {
  if (!c) return '—';
  const nombre = c.nombre_completo || c.razon_social;
  const dni = c.dni ? `DNI ${c.dni}` : '';
  return dni ? `${nombre} (${dni})` : nombre;
};

export const docCliente = (c) => {
  if (!c) return '—';
  return c.dni || '—';
};
