import { numero } from "../format.js";
import { cargarImagen, colorDePortada } from "./colores.js";
import { pedirImagen, versionGrande } from "./covers.js";
import { fechaMedia } from "./dates.js";
import { tituloDelRango } from "./wrapped.js";

// Formato de historia (9:16), el que aceptan Instagram, WhatsApp y TikTok sin recortar.
export const ANCHO = 1080;
export const ALTO = 1920;
const MARGEN = 88;
const FONDO_POR_DEFECTO = "#07170e";
const ACENTO_POR_DEFECTO = "#1ed760";
const TENUE = "rgba(255, 255, 255, 0.72)";
const FUENTE = "Inter, system-ui, sans-serif";

/** Título de la tarjeta: un año completo se lee como un número; otro rango, como fechas. */
export function textoDelRango(from, to) {
  return tituloDelRango(from, to)?.anio ?? `${fechaMedia(from)} – ${fechaMedia(to)}`;
}

/** Nombre de archivo seguro: sin tildes, espacios ni símbolos. */
export function nombreDeArchivo(nombre, from, to) {
  const limpio = (nombre ?? "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `wrapped${limpio ? `-${limpio}` : ""}-${from}-a-${to}.png`;
}

/** Recorta con "…" hasta que el texto quepa en `ancho` con la fuente actual del contexto. */
export function recortar(medir, texto, ancho) {
  if (medir(texto) <= ancho) return texto;
  let fin = texto.length;
  while (fin > 1 && medir(`${texto.slice(0, fin).trimEnd()}…`) > ancho) fin -= 1;
  return `${texto.slice(0, fin).trimEnd()}…`;
}

function fuente(ctx, peso, tamano) {
  ctx.font = `${peso} ${tamano}px ${FUENTE}`;
}

function texto(ctx, contenido, x, y, { peso = 700, tamano = 40, color = "#fff", ancho = ANCHO - 2 * MARGEN, alinear = "left" } = {}) {
  fuente(ctx, peso, tamano);
  ctx.fillStyle = color;
  ctx.textAlign = alinear;
  ctx.fillText(recortar((t) => ctx.measureText(t).width, contenido, ancho), x, y);
}

/** El nombre del artista principal: baja de tamaño antes de recortarse. */
function titular(ctx, contenido, x, y, ancho) {
  let tamano = 92;
  fuente(ctx, 900, tamano);
  while (tamano > 56 && ctx.measureText(contenido).width > ancho) {
    tamano -= 4;
    fuente(ctx, 900, tamano);
  }
  texto(ctx, contenido, x, y, { peso: 900, tamano, ancho });
}

function rectanguloRedondeado(ctx, x, y, lado, radio) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, lado, lado, radio);
  else ctx.rect(x, y, lado, lado);
}

/** Igual que Cover: degradado según el nombre e iniciales, para cuando no hay imagen. */
function imagenGenerada(ctx, nombre, x, y, lado) {
  let h = 0;
  for (const c of nombre ?? "") h = (h * 31 + c.codePointAt(0)) % 360;
  const g = ctx.createLinearGradient(x, y, x + lado, y + lado);
  g.addColorStop(0, `hsl(${h} 46% 22%)`);
  g.addColorStop(1, `hsl(${h + 24} 38% 9%)`);
  ctx.fillStyle = g;
  ctx.fill();
  const iniciales = (nombre ?? "").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => [...p][0]).join("").toUpperCase();
  fuente(ctx, 900, lado * 0.32);
  ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(iniciales, x + lado / 2, y + lado / 2);
  ctx.textBaseline = "alphabetic";
}

async function imagenDe(uri, artistId) {
  try {
    const url = await pedirImagen(uri, artistId);
    if (!url) return null;
    try {
      return await cargarImagen(versionGrande(url));
    } catch {
      return await cargarImagen(url); // la versión de 640 px no existe para todas las fotos
    }
  } catch {
    return null;
  }
}

function lista(ctx, titulo, filas, x, y, ancho, acento) {
  texto(ctx, titulo.toUpperCase(), x, y, { peso: 800, tamano: 28, color: acento, ancho });
  filas.slice(0, 5).forEach((fila, i) => {
    const base = y + 74 + i * 66;
    texto(ctx, String(i + 1), x, base, { peso: 800, tamano: 34, color: TENUE, ancho: 40 });
    texto(ctx, fila, x + 44, base, { peso: 700, tamano: 36, ancho: ancho - 44 });
  });
}

/**
 * Dibuja la tarjeta de un rango de Mi época y la devuelve como PNG.
 * Las imágenes de Spotify llegan con CORS, así que el lienzo se puede exportar; si alguna falla se usa la generada.
 */
export async function crearTarjeta({ stats, derivado, nombre }) {
  const artista = stats.topArtistas[0];
  const [color, imagen] = await Promise.all([
    artista ? colorDePortada(artista.coverUri ?? null, artista.artistId) : null,
    artista ? imagenDe(artista.coverUri, artista.artistId) : null,
    document.fonts?.load(`900 92px Inter`).catch(() => null),
    document.fonts?.load(`700 36px Inter`).catch(() => null),
  ]);
  const acento = color?.acento ?? ACENTO_POR_DEFECTO;

  const lienzo = document.createElement("canvas");
  lienzo.width = ANCHO;
  lienzo.height = ALTO;
  const ctx = lienzo.getContext("2d");

  ctx.fillStyle = color?.fondo ?? FONDO_POR_DEFECTO;
  ctx.fillRect(0, 0, ANCHO, ALTO);
  const sombra = ctx.createLinearGradient(0, 0, 0, ALTO);
  sombra.addColorStop(0, "rgba(0, 0, 0, 0)");
  sombra.addColorStop(1, "rgba(0, 0, 0, 0.5)");
  ctx.fillStyle = sombra;
  ctx.fillRect(0, 0, ANCHO, ALTO);

  texto(ctx, "MI WRAPPED", MARGEN, 136, { peso: 900, tamano: 30, color: acento });
  if (nombre) texto(ctx, nombre, ANCHO - MARGEN, 136, { peso: 700, tamano: 30, color: TENUE, alinear: "right", ancho: 420 });
  texto(ctx, textoDelRango(stats.from, stats.to), MARGEN, 236, { peso: 900, tamano: 76 });

  const lado = 600;
  const xImagen = (ANCHO - lado) / 2;
  const yImagen = 320;
  if (artista) {
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
    ctx.shadowBlur = 60;
    ctx.shadowOffsetY = 24;
    rectanguloRedondeado(ctx, xImagen, yImagen, lado, 28);
    ctx.fillStyle = "#000";
    ctx.fill();
    ctx.restore();

    ctx.save();
    rectanguloRedondeado(ctx, xImagen, yImagen, lado, 28);
    ctx.clip();
    if (imagen) ctx.drawImage(imagen, xImagen, yImagen, lado, lado);
    else imagenGenerada(ctx, artista.nombre, xImagen, yImagen, lado);
    ctx.restore();

    texto(ctx, "Tu artista número uno", MARGEN, 1016, { peso: 600, tamano: 32, color: TENUE });
    titular(ctx, artista.nombre, MARGEN, 1108, ANCHO - 2 * MARGEN);
  }

  const columna = (ANCHO - 2 * MARGEN - 48) / 2;
  lista(ctx, "Artistas", stats.topArtistas.map((a) => a.nombre), MARGEN, 1222, columna, acento);
  lista(ctx, "Canciones", stats.topCanciones.map((c) => c.nombre), MARGEN + columna + 48, 1222, columna, acento);

  ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
  ctx.fillRect(MARGEN, 1636, ANCHO - 2 * MARGEN, 2);
  texto(ctx, "Minutos escuchados", MARGEN, 1700, { peso: 600, tamano: 32, color: TENUE });
  texto(ctx, numero(Math.round(stats.minutos)), MARGEN, 1820, { peso: 900, tamano: 118, color: acento, ancho: 620 });
  if (derivado?.franja) {
    texto(ctx, "Sobre todo", ANCHO - MARGEN, 1756, { peso: 600, tamano: 28, color: TENUE, alinear: "right", ancho: 300 });
    texto(ctx, derivado.franja, ANCHO - MARGEN, 1806, { peso: 800, tamano: 36, alinear: "right", ancho: 300 });
  }

  return new Promise((resolve, reject) => {
    lienzo.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("No se pudo crear la imagen"))), "image/png");
  });
}

/** Compartir con archivos solo existe en móviles y en algunos navegadores de escritorio. */
export function puedeCompartir(archivo) {
  try {
    return Boolean(navigator.canShare?.({ files: [archivo] }));
  } catch {
    return false;
  }
}

export function descargar(blob, nombreArchivo) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
