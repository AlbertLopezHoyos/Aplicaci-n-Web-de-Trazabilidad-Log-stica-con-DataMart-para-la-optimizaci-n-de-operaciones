const Pagination = ({ page, total, limit, onPageChange }) => {
  const totalPages = Math.ceil(total / limit) || 1;
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-slate-100 pt-4">
      <p className="text-sm text-slate-500">
        Página {page} de {totalPages} · {total} registros
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="btn-secondary disabled:opacity-40"
        >
          Anterior
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="btn-secondary disabled:opacity-40"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
};

export default Pagination;
