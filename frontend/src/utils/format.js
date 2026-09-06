export const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatDateTime = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatCurrency = (amount) => {
  const n = parseFloat(amount);
  if (Number.isNaN(n)) return 'S/ 0.00';
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n);
};
