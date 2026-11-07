import { useRef } from "react";
import { fechaMedia, soloFecha } from "../../lib/dates.js";
import { CON_MOVIMIENTO, ESCRITORIO, ScrollTrigger, gsap, useGSAP } from "../../lib/gsap.js";
import { AnimatedNumber } from "../AnimatedNumber.jsx";
import { Cover } from "../Cover.jsx";

const COLUMNAS = 5;
const POR_MITAD = 8; // lo bastante alto para cubrir la pantalla en móvil sin dejar huecos
const MOVIL = "(max-width: 860px) and (prefers-reduced-motion: no-preference)";
// Segundos que tarda cada columna en recorrer una mitad. Distintas, para que no se sincronicen.
const DURACIONES = [96, 120, 78, 108, 88];

/** Cada columna arranca en un punto distinto de la lista y la repite hasta llenar su mitad. */
function repartir(albumes) {
  if (!albumes.length) return Array.from({ length: COLUMNAS }, () => []);
  return Array.from({ length: COLUMNAS }, (_, c) =>
    Array.from({ length: POR_MITAD }, (_, k) => albumes[(c * 4 + k) % albumes.length])
  );
}

function Pista({ items }) {
  // La mitad B es una copia idéntica: al llegar a -50% el bucle reinicia sin que se note.
  return (
    <div className="pt-col-pista">
      {[0, 1].map((m) => (
        <div key={m} className="pt-mitad" aria-hidden={m === 1 ? "true" : undefined}>
          {items.map((a, k) => <Cover key={`${a.coverUri}-${k}`} uri={a.coverUri} nombre={a.nombre} />)}
        </div>
      ))}
    </div>
  );
}

export function Hero({ resumen, albumes }) {
  const raiz = useRef(null);
  const columnas = repartir(albumes);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(CON_MOVIMIENTO, () => {
        // Entrada: primero el título y el rango (jerarquía), las tarjetas llegan en su propio efecto.
        gsap.timeline({ defaults: { ease: "power4.out" } })
          .from(".pt-linea > span", { yPercent: 110, duration: 1.1, stagger: 0.12 })
          .from(".pt-hero-rango", { autoAlpha: 0, y: 14, duration: 0.6 }, "-=0.5");

        // Salida: el contenido sube y se apaga, el fondo se desvanece. fromTo con immediateRender
        // en false para no pisar la opacidad que la entrada ya está animando.
        // El contenido se apaga en el 65% inicial del recorrido; el fondo tarda todo el recorrido.
        gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: { trigger: raiz.current, start: "top top", end: "bottom 15%", scrub: 0.5 },
        })
          .to(".pt-hero-contenido", { y: -70, duration: 0.65 }, 0)
          .fromTo(".pt-hero-eyebrow, .pt-hero h1, .pt-hero-rango, .pt-cifra",
            { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.55, stagger: 0.015, immediateRender: false }, 0)
          .to(".pt-fondo-marco", { autoAlpha: 0, duration: 1 }, 0);
      });

      // Bucle de las columnas: baja despacio. Solo se anima lo que se ve en cada tamaño.
      const bucle = (cuantas) => () => {
        const pistas = [...raiz.current.querySelectorAll(".pt-col-pista")].slice(0, cuantas);
        const tweens = pistas.map((pista, i) => {
          const t = gsap.fromTo(pista, { yPercent: -50 }, { yPercent: 0, duration: DURACIONES[i], ease: "none", repeat: -1 });
          t.progress((i * 0.37) % 1);
          return t;
        });
        // Fuera de pantalla no hay nada que animar.
        ScrollTrigger.create({
          trigger: raiz.current, start: "top bottom", end: "bottom top",
          onToggle: (self) => tweens.forEach((t) => (self.isActive ? t.play() : t.pause())),
        });
      };
      mm.add(ESCRITORIO, bucle(COLUMNAS));
      mm.add(MOVIL, bucle(3));
    },
    { scope: raiz }
  );

  // Las portadas llegan de otra petición: el fondo aparece cuando están.
  useGSAP(
    () => {
      if (!albumes.length) return;
      const mm = gsap.matchMedia();
      mm.add(CON_MOVIMIENTO, () => {
        gsap.from(".pt-fondo", { autoAlpha: 0, duration: 1.8, ease: "power2.out", clearProps: "opacity,visibility" });
      });
    },
    { scope: raiz, dependencies: [albumes.length] }
  );

  // Igual con las cifras: no existen hasta que llega el resumen.
  useGSAP(
    () => {
      if (!resumen) return;
      const mm = gsap.matchMedia();
      mm.add(CON_MOVIMIENTO, () => {
        gsap.from(".pt-cifra", {
          autoAlpha: 0, y: 24, duration: 0.8, stagger: 0.09, delay: 0.35, ease: "power3.out",
          clearProps: "transform,opacity,visibility",
        });
      });
    },
    { scope: raiz, dependencies: [Boolean(resumen)] }
  );

  const r = resumen;
  return (
    <header ref={raiz} className="pt-hero" id="inicio-portada">
      <div className="pt-fondo-marco" aria-hidden="true">
        <div className="pt-fondo">
          {columnas.map((items, i) => (
            <div key={i} className="pt-col"><Pista items={items} /></div>
          ))}
        </div>
      </div>

      <div className="pt-hero-contenido">
        <p className="eyebrow pt-hero-eyebrow">Tu historial de Spotify</p>
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
    </header>
  );
}
