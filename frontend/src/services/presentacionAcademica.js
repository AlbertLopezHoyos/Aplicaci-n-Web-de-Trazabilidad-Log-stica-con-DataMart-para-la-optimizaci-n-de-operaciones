const STORAGE_KEY = 'presentacion_academica';

/** Estado sincronizado con localStorage para el interceptor de axios. */
let activo = false;

try {
  activo = localStorage.getItem(STORAGE_KEY) === '1';
} catch {
  activo = false;
}

export const isPresentacionAcademica = () => activo;

export const setPresentacionAcademica = (valor) => {
  activo = Boolean(valor);
  try {
    localStorage.setItem(STORAGE_KEY, activo ? '1' : '0');
  } catch {
    /* ignore */
  }
};

export const readPresentacionAcademica = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};
