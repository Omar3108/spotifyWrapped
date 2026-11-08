import { perfilActivo } from "./lib/perfil.js";

// Base de la API Spring Boot. Se puede cambiar con VITE_API_BASE en un archivo .env
const BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8080/api/wrapped";

// Estas rutas no dependen del perfil activo: la lista de perfiles, las portadas, la gestión y la comparación.
const SIN_PERFIL = /^(perfiles|art|gestion|compare)(\/|$)/;

// Las escrituras llevan esta cabecera: la API la exige y un formulario de otra web no puede añadirla.
const CABECERA_GESTION = { "X-Wrapped-Gestion": "1" };

export async function get(path, params = {}, { signal } = {}) {
  const perfil = perfilActivo();
  const todos = SIN_PERFIL.test(path) || perfil === null ? params : { ...params, perfil };
  const qs = new URLSearchParams(todos).toString();
  const res = await fetch(`${BASE}/${path}${qs ? `?${qs}` : ""}`, { signal });
  if (!res.ok) throw new Error(`Error ${res.status} al consultar ${path}`);
  return res.json();
}

/** El mensaje de un error de la API ya viene en español y se puede mostrar tal cual. */
async function errorDe(res) {
  try {
    const cuerpo = await res.json();
    if (cuerpo?.message) return new Error(cuerpo.message);
  } catch {
    /* la respuesta no era JSON */
  }
  if (res.status === 403) return new Error("La gestión solo está disponible desde el equipo local.");
  if (res.status === 413) return new Error("El archivo es demasiado grande.");
  return new Error(`Error ${res.status}`);
}

/** Escritura JSON en /gestion. Devuelve el cuerpo, o null si no hay (204). */
export async function enviar(metodo, path, cuerpo) {
  const res = await fetch(`${BASE}/gestion/${path}`, {
    method: metodo,
    headers: { ...CABECERA_GESTION, ...(cuerpo ? { "Content-Type": "application/json" } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  if (!res.ok) throw await errorDe(res);
  return res.status === 204 ? null : res.json();
}

/**
 * Sube el .zip tal cual. Usa XMLHttpRequest porque fetch no informa del progreso de subida.
 * `alAvanzar(0..1)` durante la subida; `alSubir()` cuando termina y el servidor empieza a leerlo.
 */
export function subirZip(perfilId, zip, { alAvanzar = () => {}, alSubir = () => {} } = {}) {
  return new Promise((resolver, rechazar) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BASE}/gestion/perfiles/${perfilId}/carga`);
    xhr.setRequestHeader("X-Wrapped-Gestion", "1");
    xhr.setRequestHeader("Content-Type", "application/zip");
    xhr.upload.onprogress = (e) => e.lengthComputable && alAvanzar(e.loaded / e.total);
    xhr.upload.onload = () => alSubir();
    xhr.onerror = () => rechazar(new Error("No se pudo conectar con el servidor."));
    xhr.onload = () => {
      let cuerpo = null;
      try {
        cuerpo = JSON.parse(xhr.responseText);
      } catch {
        /* sin cuerpo JSON */
      }
      if (xhr.status === 202) return resolver(cuerpo);
      if (cuerpo?.message) return rechazar(new Error(cuerpo.message));
      if (xhr.status === 413) return rechazar(new Error("El archivo es demasiado grande."));
      return rechazar(new Error(`Error ${xhr.status}`));
    };
    xhr.send(zip);
  });
}
