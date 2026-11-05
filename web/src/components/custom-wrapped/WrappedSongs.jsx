import { useRef } from "react";
import { numero } from "../../format.js";
import { rutaCancion } from "../../hooks/useHashRoute.js";
import { ESCRITORIO, gsap, useGSAP } from "../../lib/gsap.js";
import { Cover } from "../Cover.jsx";
import { revelar } from "./animaciones.js";

const MINIMO_PARA_FIJAR = 5;

function Cancion({ c, posicion, grande = false }) {
  return (
    <li className={`wx-cancion ${grande ? "grande" : ""}`}>
      <a href={rutaCancion(c.trackId)}>
        <Cover uri={c.coverUri} nombre={c.nombre} />
        <span className="wx-cancion-pie">
          <span className="wx-cancion-pos tabular">{posicion}</span>
          <span className="wx-cancion-texto">
            <strong>{c.nombre}</strong>
            <span>{c.artistName}, {numero(c.reproducciones)} veces</span>
          </span>
        </span>
      </a>
    </li>
  );
}

export function WrappedSongs({ canciones }) {
  const raiz = useRef(null);
  const [primera, ...resto] = canciones;
  const columnaA = resto.filter((_, i) => i % 2 === 0);
  const columnaB = resto.filter((_, i) => i % 2 === 1);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    const fijar = canciones.length >= MINIMO_PARA_FIJAR;

    // El único pin de la experiencia, solo en escritorio y con movimiento activado.
    mm.add(ESCRITORIO, () => {
      if (!fijar) return;
      gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: ".wx-canciones",
          start: "top 64px",
          end: "+=70%",
          pin: true,
          scrub: 0.6,
        },
      })
        .fromTo(".wx-columna-a", { yPercent: 10 }, { yPercent: -12 }, 0)
        .fromTo(".wx-columna-b", { yPercent: -8 }, { yPercent: 12 }, 0)
        .fromTo(".wx-cancion.grande .cover", { scale: 0.94 }, { scale: 1 }, 0);
    });

    // En móvil, y si hay pocas canciones, basta una entrada normal.
    mm.add("(max-width: 860px)", () => {
      revelar(".wx-cancion", raiz.current, { stagger: 0.07 });
    });
    if (!fijar) {
      mm.add("(min-width: 861px)", () => {
        revelar(".wx-cancion", raiz.current, { stagger: 0.07 });
      });
    }
  }, { scope: raiz });

  return (
    <section ref={raiz} id="wx-canciones" className="wx-escena" aria-labelledby="wx-canciones-titulo">
      <div className="wx-canciones">
        <h2 id="wx-canciones-titulo" className="wx-antetitulo">Tus canciones</h2>
        {primera && (
          <div className="wx-canciones-rejilla">
            <ol className="wx-columna-principal"><Cancion c={primera} posicion={1} grande /></ol>
            <ol className="wx-columna-a">
              {columnaA.map((c, i) => <Cancion key={c.trackId} c={c} posicion={i * 2 + 2} />)}
            </ol>
            <ol className="wx-columna-b">
              {columnaB.map((c, i) => <Cancion key={c.trackId} c={c} posicion={i * 2 + 3} />)}
            </ol>
          </div>
        )}
      </div>
    </section>
  );
}
