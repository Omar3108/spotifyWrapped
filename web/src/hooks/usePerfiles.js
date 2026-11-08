import { useCallback, useEffect, useState } from "react";
import { get } from "../api.js";

/** Lista de perfiles. `recargar` la vuelve a pedir tras crear, renombrar, borrar o cargar datos. */
export function usePerfiles() {
  const [estado, setEstado] = useState({ perfiles: null, error: null });
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vigente = true;
    get("perfiles").then(
      (perfiles) => vigente && setEstado({ perfiles, error: null }),
      (error) => vigente && setEstado((e) => ({ perfiles: e.perfiles, error }))
    );
    return () => {
      vigente = false;
    };
  }, [intento]);

  const recargar = useCallback(() => setIntento((n) => n + 1), []);
  return { ...estado, recargar };
}
