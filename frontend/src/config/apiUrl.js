/** En producción usa /api (proxy Vercel → Render, sin CORS) */
export const resolveApiUrl = () => {
  if (import.meta.env.PROD) return '/api';
  return import.meta.env.VITE_API_URL || '/api';
};

/** Vercel corta rewrites largos (~10s). Este origen habla con Render directo. */
export const RENDER_API_ORIGIN = 'https://aplicaci-n-web-de-trazabilidad-log-stica.onrender.com/api';

export const resolveAleatorizarUrl = () => (
  import.meta.env.PROD
    ? `${RENDER_API_ORIGIN}/observacion/posprueba/aleatorizar`
    : '/observacion/posprueba/aleatorizar'
);
