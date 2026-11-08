import { useSyncExternalStore } from "react";

/**
 * Rutas propias con el hash, sin tocar los anclas de la portada (#artistas, #anio...).
 *   #/explorar          #/explorar/123
 *   #/mi-epoca          #/mi-epoca?from=2023-01-01&to=2023-12-31
 *   #/datos             gestión de perfiles y datos (solo en local)
 */
export function interpretarHash(hash) {
  const explorar = hash.match(/^#\/explorar(?:\/(\d+))?\/?$/);
  if (explorar) {
    return { vista: "explorar", trackId: explorar[1] ? Number(explorar[1]) : null };
  }
  const epoca = hash.match(/^#\/mi-epoca\/?(?:\?(.*))?$/);
  if (epoca) {
    const q = new URLSearchParams(epoca[1] ?? "");
    return { vista: "mi-epoca", from: q.get("from"), to: q.get("to") };
  }
  if (/^#\/datos\/?$/.test(hash)) return { vista: "datos" };
  return { vista: "portada", ancla: hash.startsWith("#") ? hash.slice(1) : "" };
}

export const rutaEpoca = (from, to) => `#/mi-epoca?from=${from}&to=${to}`;
export const rutaCancion = (trackId) => `#/explorar/${trackId}`;

const suscribir = (aviso) => {
  window.addEventListener("hashchange", aviso);
  return () => window.removeEventListener("hashchange", aviso);
};

const leerHash = () => window.location.hash;

export function useHashRoute() {
  return interpretarHash(useSyncExternalStore(suscribir, leerHash));
}
