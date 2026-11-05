import { useRef } from "react";
import { numero } from "../../format.js";
import { rutaCancion } from "../../hooks/useHashRoute.js";
import { useGSAP } from "../../lib/gsap.js";
import { Cover } from "../Cover.jsx";
import { revelar } from "../custom-wrapped/animaciones.js";

function Cancion({ c, posicion }) {
  const cuerpo = (
    <>
      <span className="pt-fila-pos tabular">{posicion}</span>
      <Cover uri={c.coverUri} nombre={c.nombre} />
      <span className="pt-cancion-texto">
        <strong>{c.nombre}</strong>
        <span>{c.artistName}, {numero(c.reproducciones)} veces</span>
      </span>
    </>
  );
  return (
    <li className="pt-cancion">
      {c.trackId ? <a href={rutaCancion(c.trackId)}>{cuerpo}</a> : <div>{cuerpo}</div>}
    </li>
  );
}

export function Musica({ canciones, albumes }) {
  const raiz = useRef(null);

  useGSAP(
    () => {
      revelar(".pt-cancion", ".pt-canciones", { stagger: 0.05 });
      revelar(".pt-album", ".pt-estante", { x: 40, y: 0, stagger: 0.07 });
    },
    { scope: raiz }
  );

  return (
    <section ref={raiz} id="canciones" className="pt-seccion" aria-labelledby="canciones-titulo">
      <h2 id="canciones-titulo">Lo que más repetiste</h2>

      <h3 className="pt-subtitulo">Canciones</h3>
      <ol className="pt-canciones">
        {canciones.slice(0, 10).map((c, i) => <Cancion key={`${c.nombre}-${c.artistName}`} c={c} posicion={i + 1} />)}
      </ol>

      <h3 className="pt-subtitulo">Álbumes</h3>
      <ol className="pt-estante" tabIndex={0} aria-label="Álbumes más escuchados">
        {albumes.slice(0, 10).map((a, i) => (
          <li key={`${a.nombre}-${a.artistName}`} className="pt-album">
            <Cover uri={a.coverUri} nombre={a.nombre} />
            <span className="pt-album-pos tabular">{i + 1}</span>
            <strong>{a.nombre}</strong>
            <span>{a.artistName}</span>
            <small>{numero(a.reproducciones)} reproducciones</small>
          </li>
        ))}
      </ol>
    </section>
  );
}
