import { get } from "../api.js";

// Agrupa las imágenes pedidas por muchos componentes en pocas llamadas a la API.
const MAXIMO_POR_LOTE = 30;
const ESPERA_MS = 30;

/** Devuelve una función clave -> promesa de url o null, con su propia caché y sus lotes. */
function crearLector(ruta, parametro, { recordarAusentes }) {
  const conocidas = new Map(); // clave -> url, o null si no hay imagen
  const pendientes = new Map(); // clave -> lista de resolvers
  let temporizador = null;

  function resolver(clave, url, recordar) {
    if (recordar) conocidas.set(clave, url);
    pendientes.get(clave)?.forEach((fn) => fn(url));
    pendientes.delete(clave);
  }

  async function enviarLote(claves) {
    try {
      const imagenes = await get(ruta, { [parametro]: claves.join(",") });
      for (const clave of claves) {
        const url = imagenes[clave] ?? null;
        resolver(clave, url, url !== null || recordarAusentes);
      }
    } catch {
      // Sin imagen no se rompe nada: se usa la generada y se reintenta al recargar.
      for (const clave of claves) resolver(clave, null, false);
    }
  }

  function vaciar() {
    temporizador = null;
    const claves = [...pendientes.keys()];
    for (let i = 0; i < claves.length; i += MAXIMO_POR_LOTE) {
      enviarLote(claves.slice(i, i + MAXIMO_POR_LOTE));
    }
  }

  return (clave) => {
    if (!clave) return Promise.resolve(null);
    if (conocidas.has(clave)) return Promise.resolve(conocidas.get(clave));
    return new Promise((resolve) => {
      const lista = pendientes.get(clave);
      if (lista) lista.push(resolve);
      else pendientes.set(clave, [resolve]);
      temporizador ??= setTimeout(vaciar, ESPERA_MS);
    });
  };
}

export const pedirPortada = crearLector("art", "uris", { recordarAusentes: true });

// Una foto ausente puede estar resolviéndose aún en el servidor: no se da por definitiva.
export const pedirFotoArtista = crearLector("art/artists", "ids", { recordarAusentes: false });

// Spotify sirve la misma foto de artista en 320 y 640 px, cambiando este prefijo.
const FOTO_NORMAL = "/image/ab67616100005174";
const FOTO_GRANDE = "/image/ab6761610000e5eb";

/** Para imágenes grandes. Las portadas de álbum no cambian: ya tienen su propio tamaño. */
export const versionGrande = (url) => url?.replace(FOTO_NORMAL, FOTO_GRANDE) ?? null;

/** La versión normal de una foto grande, o null si la url no era grande. */
export const versionNormal = (url) => (url?.includes(FOTO_GRANDE) ? url.replace(FOTO_GRANDE, FOTO_NORMAL) : null);

/** La foto del artista si existe; si no, la portada de la canción. */
export async function pedirImagen(uri, artistId) {
  return (await pedirFotoArtista(artistId)) ?? pedirPortada(uri);
}
