import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toastError } from '../utils/alerts';
import BrandLogo from '../components/BrandLogo';

const LoginPage = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
          ? 'No se pudo conectar con el servidor. Verifique su conexión e intente de nuevo.'
          : 'Credenciales inválidas');
      toastError('Acceso denegado', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-graphite-900 via-graphite-900 to-salazar-950 p-12 text-white lg:flex">
        <div className="inline-flex w-fit items-center rounded-xl bg-white px-5 py-3 shadow-lg">
          <BrandLogo variant="full" className="h-10 w-auto" />
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight">
            Trazabilidad logística
            <br />
            <span className="text-salazar-300">inteligente</span>
          </h1>
          <p className="mt-4 max-w-md text-graphite-200">
            Control de envíos, seguimiento en tiempo real, gestión de incidencias y
            análisis con DataMart para la operación de transporte, reparto y mudanzas.
          </p>
        </div>
        <div className="text-xs text-graphite-400">
          <p className="font-medium text-graphite-300">Experiencia y calidad a su disposición</p>
          <p className="mt-1">Jr. San Diego 615, Surquillo — Lima, Perú</p>
        </div>
      </div>

      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <BrandLogo variant="full" className="h-9 w-auto" />
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

          <p className="mt-10 text-center text-xs text-slate-400">
            Grupo Logístico Salazar S.A.C. · Sistema interno de trazabilidad
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
