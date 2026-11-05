import { useRef, useState } from "react";
import { numero } from "../../format.js";
import { CON_MOVIMIENTO, gsap, useGSAP } from "../../lib/gsap.js";
import { Cover } from "../Cover.jsx";
import { revelar } from "../custom-wrapped/animaciones.js";

const LIMITES = [5, 10, 20];

export function Artistas({ artistas }) {
  const raiz = useRef(null);
  const [limite, setLimite] = useState(10);
  const visibles = artistas.slice(0, limite);
  const podio = visibles.slice(0, 3);
  const resto = visibles.slice(3);
  const maximo = visibles[0]?.reproducciones ?? 1;

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(CON_MOVIMIENTO, () => {
        // El orden del ranking se lee de izquierda a derecha: el podio se destapa en ese sentido.
        gsap.from(".pt-podio-item", {
          clipPath: "inset(0 0 100% 0)", autoAlpha: 0, duration: 0.9, stagger: 0.12, ease: "power3.out",
          clearProps: "clipPath,opacity,visibility",
          scrollTrigger: { trigger: ".pt-podio", start: "top 78%", end: "+=1", once: true },
        });
      });
      revelar(".pt-fila", ".pt-resto", { x: -18, y: 0, stagger: 0.05 });
      revelar(".pt-barra-relleno", ".pt-resto", {
        y: 0, autoAlpha: 1, scaleX: 0, duration: 0.9, stagger: 0.05, delay: 0.2,
        ease: "power3.inOut", clearProps: "transform",
      });
    },
    { scope: raiz, dependencies: [limite], revertOnUpdate: true }
  );

  return (
    <section ref={raiz} id="artistas" className="pt-seccion" aria-labelledby="artistas-titulo">
      <div className="pt-cabecera">
        <h2 id="artistas-titulo">Tus artistas más escuchados</h2>
        <div className="pt-filtros" role="group" aria-label="Cantidad de artistas">
          {LIMITES.map((n) => (
            <button key={n} type="button" className="pt-filtro" aria-pressed={limite === n} onClick={() => setLimite(n)}>
              Top {n}
            </button>
          ))}
        </div>
      </div>

      <ol className="pt-podio">
        {podio.map((a, i) => (
          <li key={a.nombre} className={`pt-podio-item ${i === 0 ? "primero" : ""}`}>
            <Cover uri={a.coverUri} nombre={a.nombre} />
            <span className="pt-podio-pos tabular">{i + 1}</span>
            <strong>{a.nombre}</strong>
            <span className="pt-dato">{numero(a.reproducciones)} reproducciones, {numero(a.minutos)} minutos</span>
          </li>
        ))}
      </ol>

      {resto.length > 0 && (
        <ol className="pt-resto" start={4}>
          {resto.map((a, i) => (
            <li key={a.nombre} className="pt-fila">
              <span className="pt-fila-pos tabular">{i + 4}</span>
              <Cover uri={a.coverUri} nombre={a.nombre} />
              <span className="pt-fila-cuerpo">
                <span className="pt-fila-texto">
                  <strong>{a.nombre}</strong>
                  <span className="tabular">{numero(a.reproducciones)}</span>
                </span>
                <span className="pt-barra-relleno" style={{ "--p": a.reproducciones / maximo }} />
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
