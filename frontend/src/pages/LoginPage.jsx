import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Truck, Mail, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toastError } from '../utils/alerts';

const LoginPage = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@salazarlogistica.pe');
  const [password, setPassword] = useState('Admin123!');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message
        || (err.request && !err.response
          ? 'No se pudo conectar con la API. Espere 1 min (Render despierta) e intente de nuevo.'
          : 'Credenciales inválidas');
      toastError('Acceso denegado', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 flex-col justify-between bg-salazar-900 p-12 text-white lg:flex">
        <div>
          <div className="flex items-center gap-3">
            <Truck className="h-10 w-10 text-accent-orange" />
            <div>
              <p className="text-xl font-bold">Grupo Logístico Salazar S.A.C.</p>
              <p className="text-sm text-salazar-200">Transporte · Reparto · Mudanzas</p>
            </div>
          </div>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight">
            Trazabilidad logística
            <br />
            <span className="text-accent-orange">inteligente</span>
          </h1>
          <p className="mt-4 max-w-md text-salazar-100">
            Sistema empresarial para control de envíos, seguimiento en tiempo real,
            gestión de incidencias y preparación analítica con DataMart — Lima 2026.
          </p>
        </div>
        <p className="text-xs text-salazar-300">Proyecto de tesis · Optimización operativa</p>
      </div>

      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2 text-salazar-800">
              <Truck className="h-8 w-8" />
              <span className="font-bold">Salazar Logística</span>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-salazar-900">Iniciar sesión</h2>
          <p className="mt-1 text-sm text-slate-500">Ingrese sus credenciales corporativas</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Correo</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  className="input-field pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  className="input-field pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ingresar al sistema'}
            </button>
          </form>

          {import.meta.env.DEV && (
            <div className="mt-8 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
              <p className="font-semibold text-salazar-800">Credenciales demo:</p>
              <p className="mt-1">Admin: admin@salazarlogistica.pe / Admin123!</p>
              <p>Operador: operador@salazarlogistica.pe / Operador123!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
