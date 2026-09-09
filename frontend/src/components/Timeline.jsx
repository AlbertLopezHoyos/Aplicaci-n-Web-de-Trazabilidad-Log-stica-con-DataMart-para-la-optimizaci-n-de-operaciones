import { formatDateTime } from '../utils/format';
import { CheckCircle2, Circle } from 'lucide-react';

const Timeline = ({ items = [] }) => {
  if (!items.length) {
    return <p className="text-sm text-slate-500">Sin historial de estados registrado.</p>;
  }

  const sorted = [...items].sort(
    (a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora)
  );

  return (
    <div className="relative space-y-0">
      {sorted.map((item, idx) => {
        const estado = item.estado || {};
        const color = estado.color_hex || '#833a3c';
        const isFirst = idx === 0;
        return (
          <div key={item.id_historial || idx} className="relative flex gap-4 pb-8 last:pb-0">
            {idx < sorted.length - 1 && (
              <div className="absolute left-[11px] top-7 h-full w-0.5 bg-slate-200" />
            )}
            <div className="relative z-10 mt-0.5">
              {isFirst ? (
                <CheckCircle2 className="h-6 w-6" style={{ color }} />
              ) : (
                <Circle className="h-6 w-6 text-slate-300" fill="white" />
              )}
            </div>
            <div className="flex-1 rounded-lg border border-slate-100 bg-slate-50/50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className="text-sm font-semibold"
                  style={{ color }}
                >
                  {estado.nombre || 'Estado'}
                </span>
                <span className="text-xs text-slate-500">{formatDateTime(item.fecha_hora)}</span>
              </div>
              {item.ubicacion && (
                <p className="mt-1 text-xs text-slate-600">📍 {item.ubicacion}</p>
              )}
              {item.comentario && (
                <p className="mt-2 text-sm text-slate-600">{item.comentario}</p>
              )}
              {item.usuario && (
                <p className="mt-1 text-xs text-slate-400">
                  Operador: {item.usuario.nombres} {item.usuario.apellidos}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Timeline;
