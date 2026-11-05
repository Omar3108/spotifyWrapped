// Fechas de calendario como cadenas YYYY-MM-DD. played_at se guarda en hora de
// Caracas sin zona, así que aquí nunca hay conversión de zona horaria.
// No usar new Date("YYYY-MM-DD"): se interpreta como UTC y puede restar un día.

const PATRON = /^(\d{4})-(\d{2})-(\d{2})$/;

const aUtc = (fecha) => {
  const [, a, m, d] = fecha.match(PATRON);
  return new Date(Date.UTC(+a, +m - 1, +d));
};

const aTexto = (date) => date.toISOString().slice(0, 10);

export function esFechaValida(fecha) {
  if (typeof fecha !== "string" || !PATRON.test(fecha)) return false;
  return aTexto(aUtc(fecha)) === fecha;
}

export const sumarDias = (fecha, dias) => {
  const d = aUtc(fecha);
  d.setUTCDate(d.getUTCDate() + dias);
  return aTexto(d);
};

/** Resta o suma meses. Si el día no existe en el mes destino, usa el último del mes. */
export const sumarMeses = (fecha, meses) => {
  const d = aUtc(fecha);
  const dia = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + meses);
  const ultimo = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(dia, ultimo));
  return aTexto(d);
};

export const diasEntre = (desde, hasta) =>
  Math.round((aUtc(hasta) - aUtc(desde)) / 86_400_000) + 1;

const max = (a, b) => (a > b ? a : b);
const min = (a, b) => (a < b ? a : b);

/** Extrae YYYY-MM-DD de un timestamp ISO de la API sin pasar por Date. */
export const soloFecha = (iso) => (iso ? `${iso}`.slice(0, 10) : null);

export function fechaLarga(fecha) {
  return aUtc(fecha).toLocaleDateString("es", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });
}

export function fechaMedia(fecha) {
  return aUtc(fecha).toLocaleDateString("es", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  });
}

/** Para "YYYY-MM" o "YYYY-MM-DD". */
export function etiquetaPeriodo(periodo) {
  if (periodo.length === 10) {
    return aUtc(periodo).toLocaleDateString("es", { day: "numeric", month: "short", timeZone: "UTC" });
  }
  if (periodo.length === 7) {
    return aUtc(`${periodo}-01`).toLocaleDateString("es", { month: "short", year: "2-digit", timeZone: "UTC" });
  }
  return periodo;
}

export function mesLargo(periodo) {
  return aUtc(`${periodo}-01`).toLocaleDateString("es", { month: "long", year: "numeric", timeZone: "UTC" });
}

/** Devuelve un mensaje de error, o null si el rango es válido. */
export function validarRango(from, to, primero, ultimo) {
  if (!from || !to) return "Elige la fecha inicial y la final.";
  if (!esFechaValida(from) || !esFechaValida(to)) return "Alguna de las fechas no es válida.";
  if (from > to) return "La fecha inicial debe ser anterior a la final.";
  if (primero && to < primero) return `Tu historial empieza el ${fechaLarga(primero)}.`;
  if (ultimo && from > ultimo) return `Tu historial termina el ${fechaLarga(ultimo)}.`;
  return null;
}

/**
 * Accesos rápidos. "Últimos 30 días" y "12 meses" se cuentan desde la última
 * reproducción, porque el historial exportado termina antes de hoy.
 */
export function crearPresets(primero, ultimo) {
  const relativos = [
    { id: "todo", etiqueta: "Todo el historial", from: primero, to: ultimo },
    { id: "12m", etiqueta: "Últimos 12 meses", from: max(primero, sumarDias(sumarMeses(ultimo, -12), 1)), to: ultimo },
    { id: "30d", etiqueta: "Últimos 30 días", from: max(primero, sumarDias(ultimo, -29)), to: ultimo },
  ];
  const anios = [];
  for (let a = +ultimo.slice(0, 4); a >= +primero.slice(0, 4); a--) {
    anios.push({
      id: String(a),
      etiqueta: String(a),
      from: max(primero, `${a}-01-01`),
      to: min(ultimo, `${a}-12-31`),
    });
  }
  return { relativos, anios };
}

/** Posición del rango dentro del historial, en porcentajes, para la barra del selector. */
export function posicionEnHistorial(from, to, primero, ultimo) {
  const total = diasEntre(primero, ultimo);
  const inicio = max(from, primero);
  const fin = min(to, ultimo);
  if (inicio > fin || total <= 0) return { izquierda: 0, ancho: 0 };
  const izquierda = ((diasEntre(primero, inicio) - 1) / total) * 100;
  const ancho = (diasEntre(inicio, fin) / total) * 100;
  return { izquierda, ancho };
}
