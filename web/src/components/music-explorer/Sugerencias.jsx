import { numero } from "../../format.js";
import { Panel } from "../ui.jsx";
import { Cover } from "../Cover.jsx";

/** Estado inicial: tus canciones más escuchadas, listas para abrir. */
export function Sugerencias({ estado, onSelect }) {
  const canciones = estado.data?.topCanciones ?? [];
  return (
    <section className="sugerencias" aria-label="Tus canciones más escuchadas">
      <h2>Tus más escuchadas</h2>
      <Panel state={estado} vacio={canciones.length === 0} mensajeVacio="Todavía no hay reproducciones.">
        <ul>
          {canciones.map((c) => (
            <li key={c.trackId}>
              <button
                type="button"
                onClick={() => onSelect({
                  trackId: c.trackId, trackName: c.nombre, artistName: c.artistName, spotifyUri: c.coverUri,
                })}
              >
                <Cover uri={c.coverUri} nombre={c.nombre} flipId={`cancion-${c.trackId}`} />
                <strong>{c.nombre}</strong>
                <span>{c.artistName}</span>
                <small>{numero(c.reproducciones)} reproducciones</small>
              </button>
            </li>
          ))}
        </ul>
      </Panel>
    </section>
  );
}
