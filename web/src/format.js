const nf = new Intl.NumberFormat("es");

export const numero = (n, decimales = 0) =>
  n == null
    ? "—"
    : Number(n).toLocaleString("es", {
        maximumFractionDigits: decimales,
        minimumFractionDigits: decimales,
      });

export const fechaCorta = (iso) =>
  iso
    ? new Date(`${iso}`.slice(0, 10) + "T00:00:00").toLocaleDateString("es", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

export const DIAS = {
  Monday: "Lunes",
  Tuesday: "Martes",
  Wednesday: "Miércoles",
  Thursday: "Jueves",
  Friday: "Viernes",
  Saturday: "Sábado",
  Sunday: "Domingo",
};

export const ORDEN_DIAS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const horaTexto = (h) => `${String(h).padStart(2, "0")}:00`;

export { nf };

/** Tiempo escuchado en la unidad más legible: minutos, horas o días. */
export function duracion(ms) {
  const minutos = Math.round((ms ?? 0) / 60000);
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `${horas} h ${minutos % 60} min`;
  return `${Math.floor(horas / 24)} d ${horas % 24} h`;
}

/** played_at no lleva zona: se muestra tal cual está guardado, en hora de Caracas. */
export function fechaHora(iso) {
  if (!iso) return "—";
  const [a, m, d, h, min] = `${iso}`.split(/[-T:]/).map(Number);
  return new Date(Date.UTC(a, m - 1, d, h, min)).toLocaleString("es", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC",
  });
}

export const porcentaje = (valor) =>
  `${Number(valor ?? 0).toLocaleString("es", { maximumFractionDigits: valor < 1 ? 2 : 1 })} %`;

/**
 * Para las marcas que escribe el servidor (p. ej. users.datos_actualizados): la base corre en UTC y la API
 * las entrega sin zona. A diferencia de played_at, aquí sí hay que convertir a la hora de Caracas.
 */
export function fechaHoraDeServidor(iso) {
  if (!iso) return "—";
  return new Date(`${iso}`.slice(0, 19) + "Z").toLocaleString("es", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Caracas",
  });
}
