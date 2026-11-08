import { useSyncExternalStore } from "react";

// Perfil elegido por la persona (para la interfaz) y perfil activo ya validado contra la lista
// del servidor (para las peticiones). Si el elegido ya no existe, el activo es otro.
const CLAVE = "wrapped.perfil";
const HOSTS_LOCALES = ["localhost", "127.0.0.1", "[::1]", "wrapped.local"];

const oyentes = new Set();
let elegido = leerInicial();
let activo = null;
let version = null;

function entero(texto) {
  return typeof texto === "string" && /^\d+$/.test(texto) ? Number(texto) : null;
}

/** Orden: enlace directo (?p=2), último perfil usado, nada. */
function leerInicial() {
  try {
    const p = entero(new URLSearchParams(window.location.search).get("p"));
    if (p !== null) return p;
  } catch {
    /* sin acceso a la URL */
  }
  try {
    return entero(window.localStorage.getItem(CLAVE));
  } catch {
    return null;
  }
}

function recordar(id) {
  try {
    window.localStorage.setItem(CLAVE, String(id));
  } catch {
    /* modo privado o almacenamiento bloqueado: la elección vale solo para esta visita */
  }
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("p", String(id));
    window.history.replaceState(window.history.state, "", url);
  } catch {
    /* ignorado */
  }
}

export function elegirPerfil(id) {
  if (id === elegido) return;
  elegido = id;
  recordar(id);
  oyentes.forEach((aviso) => aviso());
}

const suscribir = (aviso) => {
  oyentes.add(aviso);
  return () => oyentes.delete(aviso);
};

export const usePerfilElegido = () => useSyncExternalStore(suscribir, () => elegido);

/** El elegido si existe en la lista; si no, el primero. Sin perfiles, null. */
export function resolverPerfil(id, perfiles) {
  if (!perfiles?.length) return null;
  return perfiles.find((p) => p.id === id) ?? perfiles[0];
}

/** Lo llama la raíz cuando conoce el perfil activo; api.js y la caché lo leen. */
export function fijarActivo(id, versionDatos) {
  activo = id ?? null;
  version = versionDatos ?? null;
}

export const perfilActivo = () => activo;
export const versionDatos = () => version;

/** La gestión de datos solo se ofrece desde el propio equipo: nginx lo exige de todos modos. */
export const esLocal = () => HOSTS_LOCALES.includes(window.location.hostname);
