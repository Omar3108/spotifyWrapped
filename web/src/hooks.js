import { useEffect, useState } from "react";
import { get } from "./api.js";

/**
 * Pide un endpoint de la API. Si `path` es null, no hace nada.
 * Devuelve { data, error, loading }. Se vuelve a pedir cuando cambian path o params.
 */
export function useApi(path, params) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const key = path ? `${path}?${JSON.stringify(params ?? {})}` : null;

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    get(path, params).then(
      (data) => !cancelled && setState({ data, error: null, loading: false }),
      (error) => !cancelled && setState({ data: null, error, loading: false })
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state;
}
