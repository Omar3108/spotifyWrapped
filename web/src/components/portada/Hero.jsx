import { useRef } from "react";
import { fechaMedia, soloFecha } from "../../lib/dates.js";
import { CON_MOVIMIENTO, gsap, useGSAP } from "../../lib/gsap.js";
import { AnimatedNumber } from "../AnimatedNumber.jsx";
import { Cover } from "../Cover.jsx";

const COLUMNAS = 3;

/** Reparte las portadas en columnas alternas para que el mosaico quede desfasado. */
function columnas(albumes) {
  const cols = Array.from({ length: COLUMNAS }, () => []);
  albumes.slice(0, 9).forEach((a, i) => cols[i % COLUMNAS].push(a));
  return cols;
}

export function Hero({ resumen, albumes }) {
  const raiz = useRef(null);
  const cols = columnas(albumes);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(CON_MOVIMIENTO, () => {
        // Jerarquía: primero el título, luego el rango y las cifras.
        gsap.timeline({ defaults: { ease: "power4.out" } })
          .from(".pt-linea > span", { yPercent: 110, duration: 1.1, stagger: 0.12 })
          .from(".pt-hero-rango", { autoAlpha: 0, y: 14, duration: 0.6 }, "-=0.5")
          .from(".pt-cifra", { autoAlpha: 0, y: 20, duration: 0.6, stagger: 0.08 }, "-=0.4");

        // Profundidad: cada columna del mosaico se mueve a distinto ritmo al salir del hero.
        gsap.utils.toArray(".pt-mosaico-col").forEach((col, i) => {
          gsap.fromTo(col, { yPercent: i % 2 ? 6 : -4 }, {
            yPercent: i % 2 ? -10 : 12, ease: "none",
            scrollTrigger: { trigger: raiz.current, start: "top top", end: "bottom top", scrub: 0.6 },
          });
        });
      });
    },
    { scope: raiz }
  );

  // El mosaico entra cuando llegan las portadas, que dependen de otra petición.
  useGSAP(
    () => {
      if (!albumes.length) return;
      const mm = gsap.matchMedia();
      mm.add(CON_MOVIMIENTO, () => {
        gsap.from(".pt-mosaico .cover", {
          autoAlpha: 0, scale: 0.92, duration: 0.8, stagger: 0.07, ease: "power3.out",
          clearProps: "transform,opacity,visibility",
        });
      });
    },
    { scope: raiz, dependencies: [albumes.length] }
  );

  const r = resumen;
  return (
    <header ref={raiz} className="pt-hero" id="inicio-portada">
      <div className="pt-hero-texto">
        <p className="eyebrow">Tu historial de Spotify</p>
        <h1 aria-label="Mi Wrapped">
          <span className="pt-linea"><span>Mi</span></span>
          <span className="pt-linea"><span className="pt-verde">Wrapped</span></span>
        </h1>
        <p className="pt-hero-rango">
          {r ? `${fechaMedia(soloFecha(r.primeraReproduccion))} a ${fechaMedia(soloFecha(r.ultimaReproduccion))}` : " "}
        </p>
        {r && (
          <dl className="pt-cifras">
            <div className="pt-cifra destacada">
              <dt>Minutos escuchados</dt>
              <dd><AnimatedNumber value={r.totalMinutos} /></dd>
            </div>
            <div className="pt-cifra">
              <dt>Días de música</dt>
              <dd><AnimatedNumber value={r.totalDias} decimals={1} /></dd>
            </div>
            <div className="pt-cifra">
              <dt>Reproducciones</dt>
              <dd><AnimatedNumber value={r.totalReproducciones} /></dd>
            </div>
            <div className="pt-cifra">
              <dt>Canciones distintas</dt>
              <dd><AnimatedNumber value={r.cancionesDistintas} /></dd>
            </div>
          </dl>
        )}
      </div>
      <div className="pt-mosaico" aria-hidden="true">
        {cols.map((col, i) => (
          <div key={i} className="pt-mosaico-col">
            {col.map((a) => <Cover key={a.coverUri} uri={a.coverUri} nombre={a.nombre} />)}
          </div>
        ))}
      </div>
    </header>
  );
}
