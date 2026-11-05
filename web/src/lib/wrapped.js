import { diasEntre, etiquetaPeriodo, mesLargo } from "./dates.js";

export function franjaDelDia(hora) {
  if (hora < 6) return "de madrugada";
  if (hora < 12) return "por la mañana";
  if (hora < 19) return "por la tarde";
  return "por la noche";
}

/** Une los meses consecutivos con el mismo artista líder. */
export function erasDeArtistas(porMes) {
  const eras = [];
  for (const mes of porMes) {
    if (!mes.artistaLider) continue;
    const ultima = eras.at(-1);
    if (ultima?.artista === mes.artistaLider) {
      ultima.hasta = mes.periodo;
      ultima.meses += 1;
    } else {
      eras.push({ artista: mes.artistaLider, desde: mes.periodo, hasta: mes.periodo, meses: 1 });
    }
  }
  return eras;
}

const mayor = (serie) =>
  serie.reduce((a, b) => (b.minutos > (a?.minutos ?? -1) ? b : a), null);

/** Convierte la respuesta de /range en lo que muestran las escenas. Sin cálculos en los componentes. */
export function derivarWrapped(stats) {
  const dias = diasEntre(stats.from, stats.to);
  const conActividad = stats.porHora.some((h) => h.reproducciones > 0);
  const horaPico = conActividad ? mayor(stats.porHora) : null;
  const mesPico = stats.porMes.some((m) => m.reproducciones > 0) ? mayor(stats.porMes) : null;
  const serie = stats.porDia.length > 0 ? stats.porDia : stats.porMes;

  return {
    dias,
    minutosPorDia: stats.minutos / dias,
    diasDeMusica: stats.minutos / 60 / 24,
    horaPico: horaPico ? Number(horaPico.periodo) : null,
    franja: horaPico ? franjaDelDia(Number(horaPico.periodo)) : null,
    mesPico: mesPico ? mesLargo(mesPico.periodo) : null,
    evolucion: serie.map((p) => ({ ...p, etiqueta: etiquetaPeriodo(p.periodo), minutos: Math.round(p.minutos) })),
    granularidad: stats.porDia.length > 0 ? "día" : "mes",
    horas: stats.porHora.map((h) => ({ etiqueta: `${h.periodo}:00`, minutos: Math.round(h.minutos) })),
    eras: erasDeArtistas(stats.porMes),
  };
}

/** Título de la escena inicial: un año completo se lee mejor como un solo número. */
export function tituloDelRango(from, to) {
  const anio = from.slice(0, 4);
  if (from === `${anio}-01-01` && to === `${anio}-12-31`) return { anio };
  return null;
}
