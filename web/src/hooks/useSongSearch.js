import { useEffect, useState } from "react";
import { get } from "../api.js";

export const DEBOUNCE_MS = 280;
export const LARGO_MINIMO = 2;

/**
 * Busca con debounce y cancela la petición anterior. Conserva los últimos
 * resultados mientras llega la respuesta, para que la lista no parpadee.
 * estado: "inactivo" | "cargando" | "listo" | "error"
 */
export function useSongSearch(texto) {
  const consulta = texto.trim();
  const activa = consulta.length >= LARGO_MINIMO;
  const [respuesta, setRespuesta] = useState({ consulta: "", resultados: [], estado: "inactivo" });

  useEffect(() => {
    if (!activa) {
      setRespuesta({ consulta: "", resultados: [], estado: "inactivo" });
      return undefined;
    }
    const control = new AbortController();
    setRespuesta((r) => ({ ...r, estado: "cargando" }));
    const temporizador = setTimeout(async () => {
      try {
        const resultados = await get("tracks/search", { q: consulta, limit: 12 }, { signal: control.signal });
        setRespuesta({ consulta, resultados, estado: "listo" });
      } catch (error) {
        if (error.name !== "AbortError") {
          setRespuesta({ consulta, resultados: [], estado: "error" });
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(temporizador);
      control.abort();
    };
  }, [consulta, activa]);

  return activa ? respuesta : { consulta: "", resultados: [], estado: "inactivo" };
}
