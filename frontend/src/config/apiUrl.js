const RENDER_API = 'https://aplicaci-n-web-de-trazabilidad-log-stica.onrender.com/api';

export const resolveApiUrl = () => {
  const fromEnv = import.meta.env.VITE_API_URL;
  if (fromEnv && fromEnv !== 'https://api.example.com') {
    return fromEnv;
  }
  if (import.meta.env.PROD && typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
    return RENDER_API;
  }
  return fromEnv || '/api';
};
