export const validarDestinatario = (data) => {
  const nombre = String(data?.nombre_destinatario ?? '').trim();
  const dni = String(data?.dni_destinatario ?? '').replace(/\D/g, '');
  const telefono = String(data?.telefono_destinatario ?? '').trim();

  if (!nombre) return 'El nombre de quien recibe es obligatorio.';
  if (nombre.length > 150) return 'El nombre del destinatario no puede superar 150 caracteres.';
  if (!/^\d{8}$/.test(dni)) return 'El DNI del destinatario debe tener exactamente 8 dígitos.';
  if (!telefono) return 'El teléfono de quien recibe es obligatorio.';
  if (telefono.length > 20) return 'El teléfono del destinatario no puede superar 20 caracteres.';

  return null;
};

export const sanitizarDestinatario = (data) => ({
  nombre_destinatario: String(data?.nombre_destinatario ?? '').trim(),
  dni_destinatario: String(data?.dni_destinatario ?? '').replace(/\D/g, '').slice(0, 8),
  telefono_destinatario: String(data?.telefono_destinatario ?? '').trim(),
});
