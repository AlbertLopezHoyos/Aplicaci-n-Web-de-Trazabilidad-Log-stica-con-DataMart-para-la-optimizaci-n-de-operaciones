import { ShieldCheck } from 'lucide-react';
import { usePresentacion } from '../context/PresentacionContext';

const PresentacionBanner = () => {
  const { presentacionActiva } = usePresentacion();

  if (!presentacionActiva) return null;

  return (
    <div
      className="flex items-center gap-2 border-b border-indigo-200 bg-indigo-50 px-4 py-2 text-sm text-indigo-900 md:px-6"
      role="status"
    >
      <ShieldCheck className="h-4 w-4 shrink-0 text-indigo-600" />
      <p>
        <span className="font-semibold">Datos personales ocultos.</span>
        {' '}
        Los clientes se muestran con alias; DNI y teléfono no se visualizan. La información operativa del envío se conserva.
      </p>
    </div>
  );
};

export default PresentacionBanner;
