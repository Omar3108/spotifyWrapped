import { describe, expect, it } from "vitest";
import { acentoLegible, colorDominante, contraste, fondoLegible, hexARgb, luminancia } from "./colores.js";

const MUTED = [0xa7, 0xa7, 0xad];

/** Construye píxeles RGBA a partir de pares [rgb, cuántos]. */
function imagen(...partes) {
  return Uint8ClampedArray.from(partes.flatMap(([rgb, n]) => Array.from({ length: n }, () => [...rgb, 255]).flat()));
}

describe("colorDominante", () => {
  it("devuelve el color de una imagen sólida", () => {
    expect(colorDominante(imagen([[200, 30, 40], 10]))).toEqual([200, 30, 40]);
  });

  it("elige el tono con más peso en una imagen de dos colores", () => {
    expect(colorDominante(imagen([[200, 30, 40], 70], [[30, 40, 200], 30]))).toEqual([200, 30, 40]);
  });

  it("no deja que un fondo blanco o negro tape el color", () => {
    expect(colorDominante(imagen([[255, 255, 255], 60], [[0, 0, 0], 20], [[30, 40, 200], 20]))).toEqual([30, 40, 200]);
  });

  it("un poco de color saturado le gana al gris", () => {
    expect(colorDominante(imagen([[128, 128, 128], 80], [[200, 30, 40], 20]))).toEqual([200, 30, 40]);
  });

  it("una imagen en escala de grises da un gris", () => {
    const [r, g, b] = colorDominante(imagen([[90, 90, 90], 50], [[150, 150, 150], 50]));
    expect(r).toBe(g);
    expect(g).toBe(b);
  });

  it("una imagen toda negra usa el promedio y una transparente no da color", () => {
    expect(colorDominante(imagen([[4, 4, 4], 10]))).toEqual([4, 4, 4]);
    expect(colorDominante(new Uint8ClampedArray([9, 9, 9, 0]))).toBeNull();
  });
});

describe("legibilidad", () => {
  const casos = [
    [255, 230, 0], [230, 20, 20], [20, 20, 230], [20, 220, 90], [255, 255, 255],
    [0, 0, 0], [128, 128, 128], [255, 0, 200], [0, 230, 230],
  ];

  it.each(casos)("fondo y acento son legibles con rgb(%i, %i, %i)", (...rgb) => {
    const fondo = hexARgb(fondoLegible(rgb));
    expect(luminancia(fondo)).toBeLessThanOrEqual(0.045);
    expect(contraste(MUTED, fondo)).toBeGreaterThanOrEqual(4.5);
    expect(contraste([255, 255, 255], fondo)).toBeGreaterThanOrEqual(10);
    expect(contraste(hexARgb(acentoLegible(rgb)), fondo)).toBeGreaterThanOrEqual(4.5);
  });

  it("conserva el tono: un rojo sigue siendo rojo", () => {
    const [r, g, b] = hexARgb(fondoLegible([230, 20, 20]));
    expect(r).toBeGreaterThan(g * 2);
    expect(r).toBeGreaterThan(b * 2);
  });
});
