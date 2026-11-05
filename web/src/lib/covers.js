import { get } from "../api.js";

// Agrupa las portadas pedidas por muchos componentes en pocas llamadas a /art.
const MAXIMO_POR_LOTE = 30;
const ESPERA_MS = 30;

const conocidas = new Map(); // uri -> url, o null si no hay portada
const pendientes = new Map(); // uri -> lista de resolvers
let temporizador = null;

async function enviarLote(uris) {
  try {
    const portadas = await get("art", { uris: uris.join(",") });
    for (const uri of uris) resolver(uri, portadas[uri] ?? null, true);
  } catch {
    // Sin portada no se rompe nada: se usa la generada y se reintenta al recargar.
    for (const uri of uris) resolver(uri, null, false);
  }
}

function resolver(uri, url, recordar) {
  if (recordar) conocidas.set(uri, url);
  pendientes.get(uri)?.forEach((fn) => fn(url));
  pendientes.delete(uri);
}

function vaciar() {
  temporizador = null;
  const uris = [...pendientes.keys()];
  for (let i = 0; i < uris.length; i += MAXIMO_POR_LOTE) {
    enviarLote(uris.slice(i, i + MAXIMO_POR_LOTE));
  }
}

export function pedirPortada(uri) {
  if (!uri) return Promise.resolve(null);
  if (conocidas.has(uri)) return Promise.resolve(conocidas.get(uri));
  return new Promise((resolve) => {
    const lista = pendientes.get(uri);
    if (lista) lista.push(resolve);
    else pendientes.set(uri, [resolve]);
    temporizador ??= setTimeout(vaciar, ESPERA_MS);
  });
}
