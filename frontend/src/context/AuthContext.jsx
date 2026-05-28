import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { isDemoMode, DEMO_USER } from '../services/demoMode';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    if (isDemoMode) return DEMO_USER;
    try {
      return JSON.parse(localStorage.getItem('user'));
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(!isDemoMode);

  const loadUser = useCallback(async () => {
    if (isDemoMode) {
      setUser(DEMO_USER);
      setLoading(false);
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.data);
      localStorage.setItem('user', JSON.stringify(data.data));
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email, password) => {
    if (isDemoMode) {
      setUser(DEMO_USER);
      return { usuario: DEMO_USER, token: 'demo' };
    }
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.data.token);
    localStorage.setItem('user', JSON.stringify(data.data.usuario));
    setUser(data.data.usuario);
    return data.data;
  };

  const logout = async () => {
    if (isDemoMode) {
      setUser(DEMO_USER);
      return;
    }
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore */
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const isAdmin = user?.rol?.nombre === 'Administrador';

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isDemoMode, loadUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
};
