import { useRef } from "react";
import { numero } from "../../format.js";
import { useGSAP } from "../../lib/gsap.js";
import { Cover } from "../Cover.jsx";
import { revelar } from "./animaciones.js";

export function WrappedArtists({ artistas }) {
  const raiz = useRef(null);
  const [primero, ...resto] = artistas;
  const maximo = primero?.reproducciones ?? 1;

  useGSAP(() => {
    revelar(".wx-lider > *", raiz.current);
    revelar(".wx-fila", raiz.current, { x: -18, y: 0, stagger: 0.06, delay: 0.25 });
    revelar(".wx-fila-relleno", raiz.current, {
      y: 0, autoAlpha: 1, scaleX: 0, duration: 0.9, stagger: 0.06, delay: 0.35,
      ease: "power3.inOut", clearProps: "transform",
    });
  }, { scope: raiz });

  return (
    <section ref={raiz} id="wx-artistas" className="wx-escena" aria-labelledby="wx-artistas-titulo">
      <h2 id="wx-artistas-titulo" className="wx-antetitulo">Tus artistas</h2>
      {primero && (
        <div className="wx-artistas">
          <div className="wx-lider">
            <Cover uri={primero.coverUri} nombre={primero.nombre} className="wx-lider-portada" />
            <p className="wx-lider-nombre">{primero.nombre}</p>
            <p className="wx-lider-dato">
              {numero(primero.reproducciones)} reproducciones, {numero(primero.minutos)} minutos
            </p>
          </div>
          <ol className="wx-ranking" start={2}>
            {resto.map((a, i) => (
              <li key={a.nombre} className="wx-fila">
                <span className="wx-fila-pos">{i + 2}</span>
                <Cover uri={a.coverUri} nombre={a.nombre} className="wx-fila-portada" />
                <span className="wx-fila-cuerpo">
                  <span className="wx-fila-texto">
                    <strong>{a.nombre}</strong>
                    <span className="tabular">{numero(a.reproducciones)}</span>
                  </span>
                  <span className="wx-fila-barra" aria-hidden="true">
                    <span className="wx-fila-relleno" style={{ "--p": a.reproducciones / maximo }} />
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
