const StatusBadge = ({ estado }) => {
  if (!estado) return <span className="badge bg-slate-100 text-slate-600">—</span>;
  const name = typeof estado === 'string' ? estado : estado.nombre;
  const color = typeof estado === 'object' ? estado.color_hex : '#64748b';
  return (
    <span
      className="badge border"
      style={{
        backgroundColor: `${color}18`,
        color: color,
        borderColor: `${color}40`,
      }}
    >
      {name}
    </span>
  );
};

export default StatusBadge;
