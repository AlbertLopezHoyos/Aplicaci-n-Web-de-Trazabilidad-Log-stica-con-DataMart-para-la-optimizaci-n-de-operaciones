import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';

import { fixMojibake } from '../utils/textEncoding';

const COLORS = ['#0B3D6E', '#2563eb', '#22c55e', '#f59e0b', '#ef4444', '#6b7280'];

const tooltipStyle = {
  borderRadius: 8,
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 12px rgba(11, 61, 110, 0.12)',
  fontSize: 12,
};

const ChartEmpty = ({ label = 'Sin datos para mostrar' }) => (
  <div className="flex h-full min-h-[240px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 text-sm text-slate-500">
    {label}
  </div>
);

export const EnviosPorEstadoChart = ({ data = [] }) => {
  const chartData = data.map((d) => ({ ...d, estado: fixMojibake(d.estado) }));
  if (!chartData.length) return <ChartEmpty />;
  return (
    <div className="h-full min-h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="cantidad"
            nameKey="estado"
            cx="50%"
            cy="50%"
            innerRadius={52}
            outerRadius={88}
            paddingAngle={2}
            label={({ estado, cantidad, percent }) =>
              percent > 0.06 ? `${estado}: ${cantidad}` : ''
            }
          >
            {chartData.map((entry, i) => (
              <Cell key={entry.codigo || i} fill={entry.color_hex || COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export const TendenciaMensualChart = ({ data = [] }) => {
  if (!data.length) return <ChartEmpty />;
  return (
    <div className="h-full min-h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="mes" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line
            type="monotone"
            dataKey="total"
            name="Total envíos"
            stroke="#0B3D6E"
            strokeWidth={2.5}
            dot={{ r: 3, fill: '#0B3D6E' }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="entregados"
            name="Entregados"
            stroke="#22c55e"
            strokeWidth={2.5}
            dot={{ r: 3, fill: '#22c55e' }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export const IncidenciasChart = ({ data = [] }) => {
  if (!data.length) return <ChartEmpty label="Sin incidencias registradas" />;
  return (
    <div className="h-full min-h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="tipo" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(11, 61, 110, 0.06)' }} />
          <Bar dataKey="cantidad" fill="#f97316" radius={[6, 6, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
