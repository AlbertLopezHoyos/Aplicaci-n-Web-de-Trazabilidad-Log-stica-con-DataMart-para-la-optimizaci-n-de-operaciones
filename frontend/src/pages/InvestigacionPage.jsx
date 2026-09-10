import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { ClipboardList, FlaskConical, ArrowRight, Info } from 'lucide-react';

const HERRAMIENTAS = [
  {
    to: '/observacion',
    icon: ClipboardList,
    titulo: 'Fichas de observación',
    descripcion:
      'Exporta las fichas por dimensión (TPRE, PER, PEEA, PIOIC) con los registros del postest en Excel.',
    detalle: '50 envíos · 1 al 20 set 2026',
    color: 'border-slate-200 bg-white hover:border-salazar-300 hover:shadow-md',
    iconWrap: 'bg-salazar-100 text-salazar-800',
  },
  {
    to: '/medicion',
    icon: FlaskConical,
    titulo: 'Medición de indicadores',
    descripcion:
      'Consulta y exporta los cuatro indicadores del postest calculados sobre la muestra de posprueba.',
    detalle: 'TPRE · PER · PEEA · PIOIC',
    color: 'border-slate-200 bg-white hover:border-salazar-300 hover:shadow-md',
    iconWrap: 'bg-slate-100 text-slate-700',
  },
];

const InvestigacionPage = () => (
  <div className="page-shell">
    <PageHeader
      title="Investigación"
      subtitle="Extracción de datos del postest para la tesis"
      compact
    />

    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
      <p className="flex items-start gap-2">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-salazar-700" />
        <span>
          Estas herramientas no forman parte de la operación diaria. Sirven para obtener las fichas
          y los indicadores del postest desde la misma base de datos del sistema.
        </span>
      </p>
    </div>

    <div className="grid gap-4 sm:grid-cols-2">
      {HERRAMIENTAS.map(({ to, icon: Icon, titulo, descripcion, detalle, color, iconWrap }) => (
        <Link
          key={to}
          to={to}
          className={`group flex flex-col rounded-xl border p-5 shadow-card transition ${color}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className={`rounded-xl p-3 ${iconWrap}`}>
              <Icon className="h-6 w-6" strokeWidth={2} />
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-slate-300 transition group-hover:text-salazar-700" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-salazar-900">{titulo}</h3>
          <p className="mt-1 flex-1 text-sm text-slate-600">{descripcion}</p>
          <p className="mt-3 text-xs font-medium text-salazar-700">{detalle}</p>
        </Link>
      ))}
    </div>
  </div>
);

export default InvestigacionPage;
