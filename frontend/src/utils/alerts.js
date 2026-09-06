import Swal from 'sweetalert2';

export const toastSuccess = (title, text = '') =>
  Swal.fire({ icon: 'success', title, text, timer: 2200, showConfirmButton: false });

export const toastError = (title, text = '') =>
  Swal.fire({ icon: 'error', title, text });

export const toastInfo = (title, text = '') =>
  Swal.fire({ icon: 'info', title, text, timer: 2800, showConfirmButton: false });

export const confirmAction = async (title, text) => {
  const result = await Swal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#0B3D6E',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Sí, continuar',
    cancelButtonText: 'Cancelar',
  });
  return result.isConfirmed;
};
