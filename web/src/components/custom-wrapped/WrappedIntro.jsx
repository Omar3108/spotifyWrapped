import { useRef } from "react";
import { diasEntre, fechaLarga, fechaMedia } from "../../lib/dates.js";
import { CON_MOVIMIENTO, gsap, useGSAP } from "../../lib/gsap.js";
import { numero } from "../../format.js";
import { tituloDelRango } from "../../lib/wrapped.js";

export function WrappedIntro({ from, to }) {
  const raiz = useRef(null);
  const anio = tituloDelRango(from, to)?.anio;
  const lineas = anio ? [anio] : from === to ? [fechaMedia(from)] : [fechaMedia(from), fechaMedia(to)];
  const dias = diasEntre(from, to);

  // Sin ScrollTrigger: esta escena es la que se ve al llegar.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(CON_MOVIMIENTO, () => {
        gsap.timeline({ defaults: { ease: "power4.out" } })
          .from(".wx-titulo-linea > span", { yPercent: 110, duration: 1.1, stagger: 0.14 })
          .from(".wx-intro-sub", { autoAlpha: 0, y: 16, duration: 0.6 }, "-=0.45");
      });
    },
    { scope: raiz }
  );

  return (
    <section ref={raiz} id="wx-intro" className="wx-escena wx-intro" aria-labelledby="wx-intro-titulo">
      <h2 id="wx-intro-titulo" aria-label={`Tu época: del ${fechaLarga(from)} al ${fechaLarga(to)}`}
        className={anio ? "wx-titulo anio" : "wx-titulo"}>
        {lineas.map((l) => (
          <span key={l} className="wx-titulo-linea"><span>{l}</span></span>
        ))}
      </h2>
      <p className="wx-intro-sub">
        Esto fue lo que sonó en {dias === 1 ? "un día" : `${numero(dias)} días`} de tu vida.
      </p>
    </section>
  );
}
