/** Activo sin BD: VITE_DEMO_MODE=true en .env local */
export const isDemoMode =
  import.meta.env.VITE_DEMO_MODE === 'true' &&
  !(import.meta.env.PROD && typeof window !== 'undefined' && window.location.hostname.includes('vercel.app'));

export const DEMO_USER = {
  id_usuario: 1,
  nombres: 'Carlos',
  apellidos: 'Salazar Mendoza',
  email: 'admin@salazarlogistica.pe',
  rol: { id_rol: 1, nombre: 'Administrador' },
};
