import { useSyncExternalStore } from "react";

/**
 * Rutas propias con el hash, sin tocar los anclas de la portada (#artistas, #anio...).
 *   #/explorar          #/explorar/123
 *   #/mi-epoca          #/mi-epoca?from=2023-01-01&to=2023-12-31
 *   #/datos             gestión de perfiles y datos (solo en local)
 *   #/comparar?a=1&b=2  dos perfiles frente a frente
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
  const comparar = hash.match(/^#\/comparar\/?(?:\?(.*))?$/);
  if (comparar) {
    const q = new URLSearchParams(comparar[1] ?? "");
    const id = (clave) => (/^\d+$/.test(q.get(clave) ?? "") ? Number(q.get(clave)) : null);
    return { vista: "comparar", a: id("a"), b: id("b") };
  }
  return { vista: "portada", ancla: hash.startsWith("#") ? hash.slice(1) : "" };
}

export const rutaEpoca = (from, to) => `#/mi-epoca?from=${from}&to=${to}`;
export const rutaCancion = (trackId) => `#/explorar/${trackId}`;
export const rutaComparar = (a, b) => `#/comparar?a=${a}&b=${b}`;

const suscribir = (aviso) => {
  window.addEventListener("hashchange", aviso);
  return () => window.removeEventListener("hashchange", aviso);
};

const leerHash = () => window.location.hash;

export function useHashRoute() {
  return interpretarHash(useSyncExternalStore(suscribir, leerHash));
}
