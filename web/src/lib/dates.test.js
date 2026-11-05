import { describe, expect, it } from "vitest";
import {
  crearPresets, diasEntre, esFechaValida, etiquetaPeriodo, fechaLarga, posicionEnHistorial,
  soloFecha, sumarDias, sumarMeses, validarRango,
} from "./dates.js";

const PRIMERO = "2017-04-26";
const ULTIMO = "2026-08-02";

describe("fechas de calendario", () => {
  it("no se desplaza un día por la zona horaria", () => {
    expect(fechaLarga("2023-01-01")).toContain("2023");
    expect(fechaLarga("2023-01-01")).toContain("1 de enero");
    expect(etiquetaPeriodo("2023-12-31")).toMatch(/31/);
  });

  it("valida fechas imposibles", () => {
    expect(esFechaValida("2024-02-29")).toBe(true);
    expect(esFechaValida("2023-02-29")).toBe(false);
    expect(esFechaValida("2023-13-01")).toBe(false);
    expect(esFechaValida("ayer")).toBe(false);
    expect(esFechaValida(null)).toBe(false);
  });

  it("suma días cruzando meses y años", () => {
    expect(sumarDias("2023-12-31", 1)).toBe("2024-01-01");
    expect(sumarDias("2024-03-01", -1)).toBe("2024-02-29");
  });

  it("suma meses sin saltarse el fin de mes", () => {
    expect(sumarMeses("2024-03-31", -1)).toBe("2024-02-29");
    expect(sumarMeses("2024-02-29", -12)).toBe("2023-02-28");
  });

  it("cuenta ambos extremos", () => {
    expect(diasEntre("2024-01-01", "2024-01-01")).toBe(1);
    expect(diasEntre("2024-01-01", "2024-12-31")).toBe(366);
  });

  it("extrae la fecha sin pasar por Date", () => {
    expect(soloFecha("2026-08-02T23:59:59")).toBe("2026-08-02");
    expect(soloFecha(null)).toBeNull();
  });
});

describe("validarRango", () => {
  it("acepta un rango dentro del historial, incluido un solo día", () => {
    expect(validarRango("2023-01-01", "2023-12-31", PRIMERO, ULTIMO)).toBeNull();
    expect(validarRango("2023-05-05", "2023-05-05", PRIMERO, ULTIMO)).toBeNull();
  });

  it("rechaza rangos invertidos, vacíos y fuera del historial", () => {
    expect(validarRango("2024-02-01", "2024-01-01", PRIMERO, ULTIMO)).toMatch(/anterior/);
    expect(validarRango("", "2024-01-01", PRIMERO, ULTIMO)).toMatch(/Elige/);
    expect(validarRango("2010-01-01", "2010-02-01", PRIMERO, ULTIMO)).toMatch(/empieza/);
    expect(validarRango("2030-01-01", "2030-02-01", PRIMERO, ULTIMO)).toMatch(/termina/);
  });
});

describe("crearPresets", () => {
  const { relativos, anios } = crearPresets(PRIMERO, ULTIMO);
  const preset = (id) => relativos.find((p) => p.id === id);

  it("cuenta desde la última reproducción, no desde hoy", () => {
    expect(preset("30d")).toMatchObject({ from: "2026-07-04", to: ULTIMO });
    expect(diasEntre(preset("30d").from, preset("30d").to)).toBe(30);
    expect(preset("12m")).toMatchObject({ from: "2025-08-03", to: ULTIMO });
  });

  it("recorta los años a los límites del historial", () => {
    expect(anios).toHaveLength(10);
    expect(anios[0]).toMatchObject({ id: "2026", from: "2026-01-01", to: ULTIMO });
    expect(anios.at(-1)).toMatchObject({ id: "2017", from: PRIMERO, to: "2017-12-31" });
    expect(anios[3]).toMatchObject({ from: "2023-01-01", to: "2023-12-31" });
  });

  it("no se sale del historial si es corto", () => {
    const corto = crearPresets("2026-07-20", ULTIMO);
    expect(corto.relativos.find((p) => p.id === "30d").from).toBe("2026-07-20");
  });
});

describe("posicionEnHistorial", () => {
  it("todo el historial ocupa el 100 %", () => {
    expect(posicionEnHistorial(PRIMERO, ULTIMO, PRIMERO, ULTIMO)).toEqual({ izquierda: 0, ancho: 100 });
  });

  it("un rango fuera del historial no se dibuja", () => {
    expect(posicionEnHistorial("2010-01-01", "2010-02-01", PRIMERO, ULTIMO).ancho).toBe(0);
  });
});
