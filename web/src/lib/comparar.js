/**
 * Decide qué dos perfiles comparar. Solo valen perfiles con historial.
 * Orden: los de la URL; si falta alguno, el activo; el otro, el primer perfil con datos distinto.
 * Devuelve null si no hay dos perfiles con datos.
 */
export function elegirPareja(perfiles, activoId, a, b) {
  const conDatos = (perfiles ?? []).filter((p) => p.reproducciones > 0);
  if (conDatos.length < 2) return null;
  const existe = (id) => conDatos.some((p) => p.id === id);

  const primero = existe(a) ? a : existe(activoId) && activoId !== b ? activoId : conDatos.find((p) => p.id !== b).id;
  const segundo = existe(b) && b !== primero ? b : conDatos.find((p) => p.id !== primero).id;
  return { a: primero, b: segundo };
}

/** Días entre dos fechas YYYY-MM-DD, siempre positivo. */
export function diasDeDiferencia(x, y) {
  const ms = Math.abs(Date.parse(`${x}T00:00:00Z`) - Date.parse(`${y}T00:00:00Z`));
  return Math.round(ms / 86_400_000);
}

/** "3 días", "5 meses", "2 años": lo bastante preciso para leerlo de un vistazo. */
export function ventaja(dias) {
  if (dias < 31) return dias === 1 ? "1 día" : `${dias} días`;
  if (dias < 365) {
    const meses = Math.round(dias / 30.44);
    return meses === 1 ? "1 mes" : `${meses} meses`;
  }
  const anios = Math.round((dias / 365.25) * 10) / 10;
  const texto = anios.toLocaleString("es", { maximumFractionDigits: 1 });
  return anios === 1 ? "1 año" : `${texto} años`;
}
