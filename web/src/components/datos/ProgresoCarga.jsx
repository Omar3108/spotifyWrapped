const TEXTOS = {
  empaquetando: "Preparando los archivos…",
  subiendo: "Subiendo el historial…",
  procesando: "Leyendo el archivo en el servidor…",
  guardando: "Guardando en la base de datos…",
};

/** Avance de la carga de un perfil. Es una región en vivo: los lectores de pantalla oyen cada fase. */
export function ProgresoCarga({ estado, onCerrar }) {
  const { fase, progreso, mensaje } = estado;
  const enCurso = fase in TEXTOS;
  // Mientras el servidor trabaja no hay porcentaje real: la barra se muestra animada.
  const indeterminada = fase === "procesando" || fase === "guardando";

  return (
    <div className={`dt-progreso ${fase === "error" ? "es-error" : ""} ${fase === "lista" ? "es-lista" : ""}`}
      role="status" aria-live="polite">
      {enCurso && (
        <>
          <p>{TEXTOS[fase]}{!indeterminada && ` ${Math.round(progreso * 100)} %`}</p>
          <div className={`dt-barra ${indeterminada ? "indeterminada" : ""}`}>
            <span style={indeterminada ? undefined : { width: `${Math.round(progreso * 100)}%` }} />
          </div>
        </>
      )}
      {fase === "lista" && (
        <>
          <p><strong>Listo.</strong> {mensaje}</p>
          <button type="button" className="dt-enlace" onClick={onCerrar}>Cerrar</button>
        </>
      )}
      {fase === "error" && (
        <>
          <p><strong>No se pudo cargar.</strong> {mensaje}</p>
          <button type="button" className="dt-enlace" onClick={onCerrar}>Cerrar</button>
        </>
      )}
    </div>
  );
}
