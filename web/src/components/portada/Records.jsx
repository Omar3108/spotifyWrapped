import { useRef } from "react";
import { numero } from "../../format.js";
import { fechaMedia, soloFecha } from "../../lib/dates.js";
import { useGSAP } from "../../lib/gsap.js";
import { AnimatedNumber } from "../AnimatedNumber.jsx";
import { revelar } from "../custom-wrapped/animaciones.js";

const DISPARO = { trigger: "#destacados", start: "top 80%" };

export function Records({ racha, sesion, skip }) {
  const raiz = useRef(null);

  useGSAP(() => { revelar(".pt-record", ".pt-records", { stagger: 0.1 }); }, { scope: raiz });

  return (
    <section ref={raiz} id="destacados" className="pt-seccion" aria-labelledby="destacados-titulo">
      <h2 id="destacados-titulo">Tus récords</h2>
      <div className="pt-records">
        <article className="pt-record principal">
          <h3>Racha más larga</h3>
          {racha ? (
            <>
              <p className="pt-record-cifra"><AnimatedNumber value={racha.diasConsecutivos} disparo={DISPARO} /> <small>días seguidos</small></p>
              <p>Del {fechaMedia(soloFecha(racha.inicioRacha))} al {fechaMedia(soloFecha(racha.finRacha))}</p>
            </>
          ) : <p>Sin datos</p>}
        </article>
        <article className="pt-record">
          <h3>Sesión más larga</h3>
          {sesion ? (
            <>
              <p className="pt-record-cifra"><AnimatedNumber value={sesion.minutosTotales} disparo={DISPARO} /> <small>min</small></p>
              <p>{numero(sesion.trackCount)} canciones sin parar</p>
            </>
          ) : <p>Sin datos</p>}
        </article>
        <article className="pt-record">
          <h3>Tasa de skip</h3>
          {skip ? (
            <>
              <p className="pt-record-cifra"><AnimatedNumber value={skip.porcentajeSkip} decimals={1} disparo={DISPARO} /><small>%</small></p>
              <p>{numero(skip.totalSkips)} canciones saltadas</p>
            </>
          ) : <p>Sin datos</p>}
        </article>
      </div>
    </section>
  );
}
