/** Muestra loading / error antes de renderizar el contenido. */
export function Panel({ state, children, vacio = false, mensajeVacio = "No hay datos todavía." }) {
  if (state.loading) return <div className="skeleton" aria-busy="true" />;
  if (state.error) return <div className="panel-error">No se pudo cargar: {state.error.message}</div>;
  if (vacio) return <div className="panel-empty">{mensajeVacio}</div>;
  return children;
}
