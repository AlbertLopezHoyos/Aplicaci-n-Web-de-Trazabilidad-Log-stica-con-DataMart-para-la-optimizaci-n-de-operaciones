/** Tarifa referencial para estimar el total del envío (editable en formulario) */
export const calcularTotalEnvio = (pesoKg, numeroPaquetes) => {
  const peso = parseFloat(pesoKg) || 0;
  const paquetes = parseInt(numeroPaquetes, 10) || 1;
  const tarifaBase = 35;
  const porKg = 2.2;
  const porPaquete = 8;
  const subtotal = tarifaBase + peso * porKg + paquetes * porPaquete;
  return Math.round(subtotal * 100) / 100;
};
