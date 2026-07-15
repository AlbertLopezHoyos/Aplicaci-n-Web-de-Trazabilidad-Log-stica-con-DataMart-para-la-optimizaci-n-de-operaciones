const RENDER_API = 'https://aplicaci-n-web-de-trazabilidad-log-stica.onrender.com/api';

/** En build de producción siempre usa la API en Render */
export const resolveApiUrl = () => {
  if (import.meta.env.PROD) return RENDER_API;
  return import.meta.env.VITE_API_URL || '/api';
};
