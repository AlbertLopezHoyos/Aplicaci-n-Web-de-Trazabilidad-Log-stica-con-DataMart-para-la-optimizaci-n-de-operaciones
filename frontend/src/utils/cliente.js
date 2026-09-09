/** Indica si el objeto cliente ya viene anonimizado desde la API. */
export const esClienteAnonimizado = (c) =>
  Boolean(c?.datos_anonimizados || c?.alias_academico);

/** Nombre o alias visible del cliente. */
export const nombreCliente = (c) => {
  if (!c) return '—';
  if (esClienteAnonimizado(c)) {
    return c.alias_academico || c.razon_social || c.nombre_completo || '—';
  }
  return c.nombre_completo || c.razon_social || '—';
};

/** Etiqueta para listados y selects (sin DNI en modo anonimizado). */
export const labelCliente = (c) => {
  if (!c) return '—';
  const nombre = nombreCliente(c);
  if (esClienteAnonimizado(c)) return nombre;
  const dni = c.dni ? `DNI ${c.dni}` : '';
  return dni ? `${nombre} (${dni})` : nombre;
};

export const docCliente = (c) => {
  if (!c) return '—';
  if (esClienteAnonimizado(c)) return c.dni || '********';
  return c.dni || '—';
};

export const telefonoCliente = (c) => {
  if (!c) return '—';
  if (esClienteAnonimizado(c)) return c.telefono || '*** *** ***';
  return c.telefono || '—';
};
