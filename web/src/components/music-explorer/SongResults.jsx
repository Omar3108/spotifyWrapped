import { useRef } from "react";
import { numero } from "../../format.js";
import { CON_MOVIMIENTO, gsap, useGSAP } from "../../lib/gsap.js";
import { Cover } from "../Cover.jsx";

export function SongResults({ consulta, resultados, artistas, estado, activo, onHover, onSelect }) {
  const lista = useRef(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(CON_MOVIMIENTO, () => {
        gsap.from(".resultado", {
          y: 10, autoAlpha: 0, duration: 0.3, stagger: 0.03, ease: "power2.out", clearProps: "all",
        });
      });
    },
    { scope: lista, dependencies: [resultados] }
  );

  if (estado === "error") {
    return <p className="buscador-aviso">No se pudo buscar. Comprueba que la API esté en marcha.</p>;
  }
  if (estado === "listo" && resultados.length === 0) {
    return (
      <p className="buscador-aviso">
        Nada con «{consulta}» en tu historial. Prueba con parte del título o con el artista.
      </p>
    );
  }
  if (resultados.length === 0) {
    return <div className="buscador-cargando" aria-busy="true" />;
  }

  return (
    <>
      {artistas.length > 0 && (
        <ul aria-label="Artistas" className="artistas-busqueda">
          {artistas.map((a) => (
            <li key={a.artistId} className="artista-busqueda">
              <Cover artistId={a.artistId} nombre={a.artistName} className="resultado-portada" />
              <span className="resultado-texto">
                <strong>{a.artistName}</strong>
                <span>Artista</span>
              </span>
              <span className="resultado-meta">{numero(a.reproducciones)}</span>
            </li>
          ))}
        </ul>
      )}
      <ul ref={lista} role="listbox" aria-label="Resultados" className="resultados">
        {resultados.map((c, i) => (
          <li
            key={c.trackId}
            id={`opcion-${c.trackId}`}
            role="option"
            aria-selected={i === activo}
            className={`resultado ${i === activo ? "activo" : ""}`}
            onMouseEnter={() => onHover(i)}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSelect(c)}
          >
            <Cover uri={c.spotifyUri} nombre={c.albumName ?? c.trackName} flipId={`cancion-${c.trackId}`} className="resultado-portada" />
            <span className="resultado-texto">
              <strong>{c.trackName}</strong>
              <span>
                {c.artistName}
                {c.albumName && c.albumName !== c.trackName ? `, ${c.albumName}` : ""}
              </span>
            </span>
            <span className="resultado-meta">
              {numero(c.reproducciones)}
              {c.versiones > 1 && <small>{c.versiones} versiones</small>}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
