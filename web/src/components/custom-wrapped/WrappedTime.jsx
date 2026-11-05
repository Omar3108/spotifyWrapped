import { useRef } from "react";
import { numero } from "../../format.js";
import { fechaLarga, soloFecha } from "../../lib/dates.js";
import { useGSAP } from "../../lib/gsap.js";
import { AnimatedNumber } from "../AnimatedNumber.jsx";
import { revelar } from "./animaciones.js";

export function WrappedTime({ stats, derivado }) {
  const raiz = useRef(null);
  const horasDia = derivado.minutosPorDia / 60;

  useGSAP(() => {
    revelar(".wx-tiempo-entra", raiz.current, { delay: 0.5 });
  }, { scope: raiz });

  return (
    <section ref={raiz} id="wx-tiempo" className="wx-escena wx-tiempo" aria-labelledby="wx-tiempo-titulo">
      <h2 id="wx-tiempo-titulo" className="wx-antetitulo">Le diste a la música</h2>
      <p className="wx-cifra">
        <AnimatedNumber value={Math.round(stats.minutos)} duration={1.8}
          disparo={{ trigger: "#wx-tiempo", start: "top 65%" }} />
      </p>
      <p className="wx-cifra-unidad">minutos</p>
      <p className="wx-tiempo-frase wx-tiempo-entra">
        Son {numero(derivado.diasDeMusica, 1)} días enteros, unas {numero(horasDia, 1)} horas por cada día de este período.
      </p>

      <dl className="wx-datos">
        <div className="wx-tiempo-entra"><dt>Reproducciones</dt><dd>{numero(stats.reproducciones)}</dd></div>
        <div className="wx-tiempo-entra"><dt>Canciones distintas</dt><dd>{numero(stats.cancionesDistintas)}</dd></div>
        <div className="wx-tiempo-entra"><dt>Artistas distintos</dt><dd>{numero(stats.artistasDistintos)}</dd></div>
        {stats.diaPico && (
          <div className="wx-tiempo-entra">
            <dt>Tu día más intenso</dt>
            <dd>
              {fechaLarga(soloFecha(stats.diaPico.dia))}
              <small>{numero(stats.diaPico.minutos)} minutos</small>
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}
