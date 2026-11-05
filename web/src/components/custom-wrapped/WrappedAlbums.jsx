import { useRef } from "react";
import { numero } from "../../format.js";
import { useGSAP } from "../../lib/gsap.js";
import { Cover } from "../Cover.jsx";
import { revelar } from "./animaciones.js";

function Album({ a, clase = "" }) {
  return (
    <li className={`wx-album ${clase}`}>
      <Cover uri={a.coverUri} nombre={a.nombre} />
      <strong>{a.nombre}</strong>
      <span>{a.artistName}</span>
      <small className="tabular">{numero(a.reproducciones)} reproducciones</small>
    </li>
  );
}

export function WrappedAlbums({ albumes }) {
  const raiz = useRef(null);
  const [primero, ...resto] = albumes;

  useGSAP(() => {
    revelar(".wx-album", raiz.current, { scale: 0.96, stagger: 0.05 });
  }, { scope: raiz });

  return (
    <section ref={raiz} id="wx-albumes" className="wx-escena" aria-labelledby="wx-albumes-titulo">
      <h2 id="wx-albumes-titulo" className="wx-antetitulo">Tus álbumes</h2>
      {primero ? (
        <div className="wx-albumes">
          <ol><Album a={primero} clase="grande" /></ol>
          <ol className="wx-albumes-resto">
            {resto.map((a) => <Album key={`${a.nombre}|${a.artistName}`} a={a} />)}
          </ol>
        </div>
      ) : (
        <p className="wx-tiempo-frase">Este período no tiene datos de álbumes.</p>
      )}
    </section>
  );
}
