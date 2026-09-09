import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  isPresentacionAcademica,
  readPresentacionAcademica,
  setPresentacionAcademica,
} from '../services/presentacionAcademica';

const PresentacionContext = createContext(null);

export const PresentacionProvider = ({ children }) => {
  const { isAdmin } = useAuth();
  const [activo, setActivo] = useState(() => readPresentacionAcademica());

  useEffect(() => {
    if (!isAdmin && activo) {
      setPresentacionAcademica(false);
      setActivo(false);
    }
  }, [isAdmin, activo]);

  const togglePresentacion = useCallback(() => {
    if (!isAdmin) return;
    setActivo((prev) => {
      const next = !prev;
      setPresentacionAcademica(next);
      return next;
    });
  }, [isAdmin]);

  const presentacionActiva = isAdmin && (activo || isPresentacionAcademica());

  return (
    <PresentacionContext.Provider
      value={{
        presentacionActiva,
        togglePresentacion,
        puedeActivar: isAdmin,
      }}
    >
      {children}
    </PresentacionContext.Provider>
  );
};

export const usePresentacion = () => {
  const ctx = useContext(PresentacionContext);
  if (!ctx) {
    throw new Error('usePresentacion debe usarse dentro de PresentacionProvider');
  }
  return ctx;
};
