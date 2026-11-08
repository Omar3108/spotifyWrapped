import { pedirImagen } from "./covers.js";

const LADO_MUESTRA = 32;
const GRUPOS_DE_TONO = 12;
const PESO_GRIS = 0.15; // Un gris cuenta poco: un 15 % de color saturado ya le gana.

// Con esta luminancia como máximo, --muted (#a7a7ad) mantiene 4,5:1 sobre el fondo.
const LUMINANCIA_MAXIMA_FONDO = 0.045;
const LUMINANCIA_MINIMA_ACENTO = 0.42;
const SATURACION_MAXIMA_FONDO = 0.62;
const CLARIDAD_MAXIMA = 0.36;
const CLARIDAD_MAXIMA_GRIS = 0.17; // Un gris más claro se ve lavado junto a los fondos con color.

function aHsl([r, g, b]) {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h;
  if (max === rn) h = ((gn - bn) / d + 6) % 6;
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return [h * 60, s, l];
}

function aRgb([h, s, l]) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const canal = (n) => {
    const k = (n + h / 30) % 12;
    return Math.round((l - c / 2 * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255);
  };
  return [canal(0), canal(8), canal(4)];
}

const aHex = (rgb) => `#${rgb.map((c) => c.toString(16).padStart(2, "0")).join("")}`;

/** Luminancia relativa de WCAG. */
export function luminancia(rgb) {
  const [r, g, b] = rgb.map((c) => {
    const n = c / 255;
    return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contraste(a, b) {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (oscuro + 0.05);
}

export function hexARgb(hex) {
  return [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
}

/**
 * Color dominante de una lista de píxeles RGBA. Agrupa por tono y pondera por saturación,
 * así que un fondo blanco o negro no tapa el color que da carácter a la imagen.
 */
export function colorDominante(pixeles) {
  const grupos = new Map();
  const total = [0, 0, 0, 0];

  for (let i = 0; i < pixeles.length; i += 4) {
    if (pixeles[i + 3] < 128) continue;
    const rgb = [pixeles[i], pixeles[i + 1], pixeles[i + 2]];
    total[0] += rgb[0];
    total[1] += rgb[1];
    total[2] += rgb[2];
    total[3] += 1;

    const [h, s, l] = aHsl(rgb);
    if (l < 0.08 || l > 0.92) continue;
    const gris = s < 0.12;
    const clave = gris ? "gris" : Math.floor(h / (360 / GRUPOS_DE_TONO));
    const peso = gris ? PESO_GRIS : s;
    const grupo = grupos.get(clave) ?? { peso: 0, r: 0, g: 0, b: 0 };
    grupo.peso += peso;
    grupo.r += rgb[0] * peso;
    grupo.g += rgb[1] * peso;
    grupo.b += rgb[2] * peso;
    grupos.set(clave, grupo);
  }

  if (total[3] === 0) return null;
  // Imagen casi toda negra o blanca: basta el promedio.
  if (grupos.size === 0) return total.slice(0, 3).map((c) => Math.round(c / total[3]));

  const mejor = [...grupos.values()].reduce((a, b) => (b.peso > a.peso ? b : a));
  return [mejor.r, mejor.g, mejor.b].map((c) => Math.round(c / mejor.peso));
}

/** Versión oscura del color, limitada por luminancia: a igual L, un amarillo pesa más que un azul. */
export function fondoLegible(rgb) {
  const [h, s, l] = aHsl(rgb);
  const saturacion = Math.min(s, SATURACION_MAXIMA_FONDO);
  const techo = s < 0.12 ? CLARIDAD_MAXIMA_GRIS : CLARIDAD_MAXIMA;
  let claridad = Math.min(Math.max(l, 0.16), techo);
  while (luminancia(aRgb([h, saturacion, claridad])) > LUMINANCIA_MAXIMA_FONDO) claridad -= 0.005;
  return aHex(aRgb([h, saturacion, claridad]));
}

/** Versión clara del mismo tono, para sustituir al verde sobre el fondo. */
export function acentoLegible(rgb) {
  const [h, s] = aHsl(rgb);
  const saturacion = s < 0.12 ? s : Math.max(s, 0.6);
  let claridad = 0.7;
  while (luminancia(aRgb([h, saturacion, claridad])) < LUMINANCIA_MINIMA_ACENTO) claridad += 0.005;
  return aHex(aRgb([h, saturacion, claridad]));
}

export function cargarImagen(url) {
  return new Promise((resolve, reject) => {
    const imagen = new Image();
    imagen.crossOrigin = "anonymous"; // Sin esto el canvas queda bloqueado para lectura.
    imagen.onload = () => resolve(imagen);
    imagen.onerror = reject;
    imagen.src = url;
  });
}

async function calcular(uri, artistId) {
  const url = await pedirImagen(uri, artistId);
  if (!url) return null;
  const imagen = await cargarImagen(url);
  const lienzo = document.createElement("canvas");
  lienzo.width = LADO_MUESTRA;
  lienzo.height = LADO_MUESTRA;
  const ctx = lienzo.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(imagen, 0, 0, LADO_MUESTRA, LADO_MUESTRA);
  const rgb = colorDominante(ctx.getImageData(0, 0, LADO_MUESTRA, LADO_MUESTRA).data);
  return rgb && { fondo: fondoLegible(rgb), acento: acentoLegible(rgb) };
}

const calculados = new Map(); // imagen -> promesa de { fondo, acento } o null

/** El color es decoración: si algo falla se resuelve null y la vista conserva su fondo. */
export function colorDePortada(uri, artistId) {
  const clave = `${artistId ?? ""}|${uri}`;
  if (!calculados.has(clave)) {
    const promesa = calcular(uri, artistId).catch(() => null).then((color) => {
      if (!color) calculados.delete(clave); // Se reintenta en la próxima visita.
      return color;
    });
    calculados.set(clave, promesa);
  }
  return calculados.get(clave);
}
