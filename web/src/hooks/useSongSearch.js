import { useEffect, useState } from "react";
import { get } from "../api.js";

export const DEBOUNCE_MS = 280;
export const LARGO_MINIMO = 2;
const INACTIVA = { consulta: "", resultados: [], artistas: [], estado: "inactivo" };

/**
 * Busca con debounce y cancela la petición anterior. Conserva los últimos
 * resultados mientras llega la respuesta, para que la lista no parpadee.
 * estado: "inactivo" | "cargando" | "listo" | "error"
 */
export function useSongSearch(texto) {
  const consulta = texto.trim();
  const activa = consulta.length >= LARGO_MINIMO;
  const [respuesta, setRespuesta] = useState(INACTIVA);

  useEffect(() => {
    if (!activa) {
      setRespuesta(INACTIVA);
      return undefined;
    }
    const control = new AbortController();
    setRespuesta((r) => ({ ...r, estado: "cargando" }));
    const temporizador = setTimeout(async () => {
      try {
        const opciones = { signal: control.signal };
        // Los artistas son un añadido: si fallan, la búsqueda de canciones sigue sirviendo.
        const [resultados, artistas] = await Promise.all([
          get("tracks/search", { q: consulta, limit: 12 }, opciones),
          get("artists/search", { q: consulta }, opciones).catch(() => []),
        ]);
        setRespuesta({ consulta, resultados, artistas, estado: "listo" });
      } catch (error) {
        if (error.name !== "AbortError") {
          setRespuesta({ consulta, resultados: [], artistas: [], estado: "error" });
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(temporizador);
      control.abort();
    };
  }, [consulta, activa]);

  return activa ? respuesta : INACTIVA;
}
