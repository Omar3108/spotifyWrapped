import { describe, expect, it } from "vitest";
import { interpretarHash, rutaCancion, rutaEpoca } from "../hooks/useHashRoute.js";
import { duracion, fechaHora, porcentaje } from "../format.js";
import { crearLru } from "./lru.js";
import { derivarWrapped, erasDeArtistas, franjaDelDia, tituloDelRango } from "./wrapped.js";

describe("interpretarHash", () => {
  it("mantiene los anclas de la portada", () => {
    expect(interpretarHash("")).toEqual({ vista: "portada", ancla: "" });
    expect(interpretarHash("#artistas")).toEqual({ vista: "portada", ancla: "artistas" });
  });

  it("reconoce Explorar con y sin canción", () => {
    expect(interpretarHash("#/explorar")).toEqual({ vista: "explorar", trackId: null });
    expect(interpretarHash(rutaCancion(2255))).toEqual({ vista: "explorar", trackId: 2255 });
  });

  it("reconoce Mi época con su rango", () => {
    expect(interpretarHash("#/mi-epoca").vista).toBe("mi-epoca");
    expect(interpretarHash(rutaEpoca("2023-01-01", "2023-12-31")))
      .toEqual({ vista: "mi-epoca", from: "2023-01-01", to: "2023-12-31" });
  });

  it("una ruta desconocida cae en la portada", () => {
    expect(interpretarHash("#/otra").vista).toBe("portada");
  });
});

describe("formatos", () => {
  it("elige la unidad de tiempo", () => {
    expect(duracion(90_000)).toBe("2 min");
    expect(duracion(2 * 3_600_000 + 5 * 60_000)).toBe("2 h 5 min");
    expect(duracion(50 * 3_600_000)).toBe("2 d 2 h");
  });

  it("muestra la hora tal como está guardada", () => {
    expect(fechaHora("2020-02-12T09:13:07")).toMatch(/09:13/);
    expect(fechaHora("2020-02-12T23:59:00")).toMatch(/12/);
    expect(fechaHora(null)).toBe("—");
  });

  it("da más precisión a los porcentajes pequeños", () => {
    expect(porcentaje(0.2324)).toBe("0,23 %");
    expect(porcentaje(12.34)).toBe("12,3 %");
  });
});

describe("crearLru", () => {
  it("descarta la entrada menos usada", () => {
    const c = crearLru(2);
    c.set("a", 1);
    c.set("b", 2);
    c.get("a");
    c.set("c", 3);
    expect(c.get("b")).toBeUndefined();
    expect(c.get("a")).toBe(1);
    expect(c.size).toBe(2);
  });
});

describe("derivarWrapped", () => {
  const punto = (periodo, minutos, artistaLider = null) => ({
    periodo, minutos, reproducciones: minutos ? 1 : 0, artistaLider,
  });
  const horas = Array.from({ length: 24 }, (_, h) => punto(String(h).padStart(2, "0"), h === 22 ? 50 : 1));
  const base = {
    from: "2023-01-01", to: "2023-03-31", minutos: 1440, porHora: horas,
    porMes: [punto("2023-01", 10, "A"), punto("2023-02", 90, "A"), punto("2023-03", 20, "B")], porDia: [],
  };

  it("calcula medias y picos", () => {
    const d = derivarWrapped(base);
    expect(d.dias).toBe(90);
    expect(d.minutosPorDia).toBe(16);
    expect(d.diasDeMusica).toBe(1);
    expect(d.horaPico).toBe(22);
    expect(d.franja).toBe("por la noche");
    expect(d.mesPico).toMatch(/febrero/);
  });

  it("usa la serie diaria cuando existe", () => {
    expect(derivarWrapped(base).granularidad).toBe("mes");
    const d = derivarWrapped({ ...base, porDia: [punto("2023-01-01", 5)] });
    expect(d.granularidad).toBe("día");
    expect(d.evolucion).toHaveLength(1);
  });

  it("no inventa picos sin actividad", () => {
    const d = derivarWrapped({ ...base, porHora: [punto("00", 0)], porMes: [punto("2023-01", 0)] });
    expect(d.horaPico).toBeNull();
    expect(d.mesPico).toBeNull();
  });

  it("une meses consecutivos del mismo artista", () => {
    expect(erasDeArtistas(base.porMes)).toEqual([
      { artista: "A", desde: "2023-01", hasta: "2023-02", meses: 2 },
      { artista: "B", desde: "2023-03", hasta: "2023-03", meses: 1 },
    ]);
  });

  it("clasifica las franjas", () => {
    expect(franjaDelDia(3)).toBe("de madrugada");
    expect(franjaDelDia(11)).toBe("por la mañana");
    expect(franjaDelDia(18)).toBe("por la tarde");
    expect(franjaDelDia(19)).toBe("por la noche");
  });

  it("solo titula con el año si está completo", () => {
    expect(tituloDelRango("2023-01-01", "2023-12-31")).toEqual({ anio: "2023" });
    expect(tituloDelRango("2023-01-02", "2023-12-31")).toBeNull();
  });
});
