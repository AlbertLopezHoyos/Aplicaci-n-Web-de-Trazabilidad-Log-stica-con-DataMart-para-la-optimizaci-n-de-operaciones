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

const COLORS = ['#0B3D6E', '#2563eb', '#22c55e', '#f59e0b', '#ef4444', '#6b7280'];

export const EnviosPorEstadoChart = ({ data = [] }) => (
  <div className="h-72">
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="cantidad"
          nameKey="estado"
          cx="50%"
          cy="50%"
          outerRadius={90}
          label={({ estado, cantidad }) => `${estado}: ${cantidad}`}
        >
          {data.map((entry, i) => (
            <Cell key={entry.codigo} fill={entry.color_hex || COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  </div>
);

export const TendenciaMensualChart = ({ data = [] }) => (
  <div className="h-72">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="total" name="Total envíos" stroke="#0B3D6E" strokeWidth={2} />
        <Line type="monotone" dataKey="entregados" name="Entregados" stroke="#22c55e" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

export const IncidenciasChart = ({ data = [] }) => (
  <div className="h-64">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="tipo" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="cantidad" fill="#f97316" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);
