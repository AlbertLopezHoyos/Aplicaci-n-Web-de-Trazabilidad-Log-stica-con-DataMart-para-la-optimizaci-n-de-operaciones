/** En producción usa /api (proxy Vercel → Render, sin CORS) */
export const resolveApiUrl = () => {
  if (import.meta.env.PROD) return '/api';
  return import.meta.env.VITE_API_URL || '/api';
};
