import axios from 'axios';
import { isDemoMode } from './demoMode';
import { handleMockRequest } from './mockData';
import { resolveApiUrl } from '../config/apiUrl';

const api = axios.create({
  baseURL: resolveApiUrl(),
  headers: { 'Content-Type': 'application/json' },
  timeout: 120000,
});

api.interceptors.request.use(async (config) => {
  if (isDemoMode) {
    config.adapter = async (cfg) => {
      const mock = await handleMockRequest(cfg);
      return {
        data: mock.data,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: cfg,
        request: {},
      };
    };
    return config;
  }
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (isDemoMode) return Promise.reject(error);
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
