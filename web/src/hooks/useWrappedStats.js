import { useCallback, useEffect, useMemo, useState } from "react";
import { get } from "../api.js";
import { crearLru } from "../lib/lru.js";
import { derivarWrapped } from "../lib/wrapped.js";

const cache = crearLru(20);

/** Estadísticas del rango. Siempre coinciden con from/to: cambiar el rango cancela lo anterior. */
export function useWrappedStats(from, to) {
  const clave = from && to ? `${from}|${to}` : null;
  const [estado, setEstado] = useState({ clave: null, data: null, error: null });
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (!clave) return undefined;
    const guardado = cache.get(clave);
    if (guardado) {
      setEstado({ clave, data: guardado, error: null });
      return undefined;
    }
    const control = new AbortController();
    get("range", { from, to, limit: 10 }, { signal: control.signal }).then(
      (data) => {
        cache.set(clave, data);
        setEstado({ clave, data, error: null });
      },
      (error) => {
        if (error.name !== "AbortError") setEstado({ clave, data: null, error });
      }
    );
    return () => control.abort();
  }, [clave, from, to, intento]);

  const reintentar = useCallback(() => {
    setEstado({ clave: null, data: null, error: null });
    setIntento((n) => n + 1);
  }, []);

  // Si la respuesta guardada es de otro rango, todavía estamos cargando.
  const vigente = estado.clave === clave;
  const data = vigente ? estado.data : null;
  const derivado = useMemo(() => (data ? derivarWrapped(data) : null), [data]);

  return {
    data,
    derivado,
    error: vigente ? estado.error : null,
    loading: Boolean(clave) && !(vigente && (estado.data || estado.error)),
    reintentar,
  };
}
