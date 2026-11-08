import { describe, expect, it } from "vitest";
import { interpretarHash, rutaComparar } from "../hooks/useHashRoute.js";
import { diasDeDiferencia, elegirPareja, ventaja } from "./comparar.js";
import { nombreDeArchivo, recortar, textoDelRango } from "./tarjeta.js";

const perfiles = [
  { id: 1, nombre: "Omar", reproducciones: 200 },
  { id: 4, nombre: "Vacío", reproducciones: 0 },
  { id: 7, nombre: "Genesis", reproducciones: 35 },
  { id: 9, nombre: "Ana", reproducciones: 10 },
];

describe("ruta de comparar", () => {
  it("lee los dos perfiles de la URL y descarta lo que no es un número", () => {
    expect(interpretarHash("#/comparar?a=1&b=7")).toEqual({ vista: "comparar", a: 1, b: 7 });
    expect(interpretarHash("#/comparar")).toEqual({ vista: "comparar", a: null, b: null });
    expect(interpretarHash("#/comparar?a=x&b=7")).toEqual({ vista: "comparar", a: null, b: 7 });
    expect(rutaComparar(1, 7)).toBe("#/comparar?a=1&b=7");
  });
});

describe("elegirPareja", () => {
  it("respeta la URL si los dos perfiles tienen datos", () => {
    expect(elegirPareja(perfiles, 1, 9, 7)).toEqual({ a: 9, b: 7 });
  });

  it("sin URL usa el perfil activo y el primer otro con datos", () => {
    expect(elegirPareja(perfiles, 7, null, null)).toEqual({ a: 7, b: 1 });
  });

  it("ignora perfiles sin historial o inexistentes", () => {
    expect(elegirPareja(perfiles, 1, 4, 99)).toEqual({ a: 1, b: 7 });
  });

  it("nunca devuelve el mismo perfil dos veces", () => {
    expect(elegirPareja(perfiles, 1, 7, 7)).toEqual({ a: 7, b: 1 });
    expect(elegirPareja(perfiles, 7, null, 7)).toEqual({ a: 1, b: 7 });
  });

  it("sin dos perfiles con datos no hay pareja", () => {
    expect(elegirPareja(perfiles.slice(0, 2), 1, null, null)).toBeNull();
    expect(elegirPareja(null, null, null, null)).toBeNull();
  });
});

describe("ventaja entre descubrimientos", () => {
  it("cuenta días entre fechas en cualquier orden", () => {
    expect(diasDeDiferencia("2022-07-12", "2025-02-22")).toBe(956);
    expect(diasDeDiferencia("2025-02-22", "2022-07-12")).toBe(956);
  });

  it("elige la unidad legible", () => {
    expect(ventaja(1)).toBe("1 día");
    expect(ventaja(24)).toBe("24 días");
    expect(ventaja(45)).toBe("1 mes");
    expect(ventaja(200)).toBe("7 meses");
    expect(ventaja(365)).toBe("1 año");
    expect(ventaja(956)).toBe("2,6 años");
  });
});

describe("tarjeta para compartir", () => {
  it("el título del rango es lo más corto posible y no repite el año", () => {
    expect(textoDelRango("2024-01-01", "2024-12-31")).toBe("2024");
    expect(textoDelRango("2024-03-01", "2024-03-15")).toBe("1 – 15 mar 2024");
    expect(textoDelRango("2024-03-01", "2024-05-31")).toBe("1 mar – 31 may 2024");
    expect(textoDelRango("2025-11-07", "2026-11-06")).toBe("7 nov 2025 – 6 nov 2026");
    expect(textoDelRango("2024-03-01", "2024-03-01")).toBe("1 mar 2024");
  });

  it("el nombre de archivo no lleva tildes, espacios ni símbolos", () => {
    expect(nombreDeArchivo("Génesis María", "2024-01-01", "2024-12-31")).toBe("wrapped-genesis-maria-2024-01-01-a-2024-12-31.png");
    expect(nombreDeArchivo("", "2024-01-01", "2024-12-31")).toBe("wrapped-2024-01-01-a-2024-12-31.png");
  });

  it("recorta con puntos suspensivos solo lo que no cabe", () => {
    const medir = (t) => t.length * 10;
    expect(recortar(medir, "Corto", 100)).toBe("Corto");
    expect(recortar(medir, "Un título demasiado largo", 100)).toBe("Un título…");
  });
});
