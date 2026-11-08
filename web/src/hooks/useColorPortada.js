import { useEffect, useState } from "react";
import { colorDePortada } from "../lib/colores.js";

/**
 * Color de fondo y acento de una portada, o de la foto del artista si se pasa artistId.
 * Devuelve undefined mientras se decide, null si no hay color y { fondo, acento } si lo
 * hay. Con uri undefined espera; con uri null ya se sabe que no hay portada.
 */
export function useColorPortada(uri, artistId) {
  const [estado, setEstado] = useState({ clave: null, color: undefined });
  const clave = `${artistId ?? ""}|${uri}`;

  useEffect(() => {
    if (!uri) return undefined;
    let vigente = true;
    colorDePortada(uri, artistId).then((color) => vigente && setEstado({ clave, color }));
    return () => {
      vigente = false;
    };
  }, [uri, artistId, clave]);

  if (!uri) return uri === undefined ? undefined : null;
  return estado.clave === clave ? estado.color : undefined;
}
