/** Activo sin BD solo en desarrollo local */
export const isDemoMode = import.meta.env.DEV && import.meta.env.VITE_DEMO_MODE === 'true';

export const DEMO_USER = {
  id_usuario: 1,
  nombres: 'Carlos',
  apellidos: 'Salazar Mendoza',
  email: 'admin@salazarlogistica.pe',
  rol: { id_rol: 1, nombre: 'Administrador' },
};
