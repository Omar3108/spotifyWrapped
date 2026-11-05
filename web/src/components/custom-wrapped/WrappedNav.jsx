import { useEffect, useRef, useState } from "react";
import { ScrollTrigger, gsap, quiereMovimiento, useGSAP } from "../../lib/gsap.js";

const ALTO_NAV = 49;

/**
 * Controles de la experiencia: anterior/siguiente, puntos por escena y progreso.
 * La escena activa sale de un IntersectionObserver, que no hace trabajo mientras
 * se hace scroll. El progreso es el único ScrollTrigger global y escribe en el DOM
 * sin pasar por React. El fondo cambia de color solo al cambiar de escena.
 */
export function WrappedNav({ escenas }) {
  const raiz = useRef(null);
  const [activa, setActiva] = useState(0);
  const activaRef = useRef(0);

  useEffect(() => {
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (!e.isIntersecting) continue;
          const i = escenas.findIndex((x) => x.id === e.target.id);
          if (i >= 0) {
            activaRef.current = i;
            setActiva(i);
          }
        }
      },
      { rootMargin: "-48% 0px -48% 0px" }
    );
    escenas.forEach((e) => {
      const el = document.getElementById(e.id);
      if (el) observador.observe(el);
    });
    return () => observador.disconnect();
  }, [escenas]);

  const { contextSafe } = useGSAP(
    () => {
      const barra = gsap.quickSetter(".wx-progreso-relleno", "scaleX");
      ScrollTrigger.create({
        trigger: document.getElementById("wx"),
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => barra(self.progress),
      });
    },
    { scope: raiz }
  );

  useGSAP(
    () => {
      gsap.to(document.getElementById("wx"), {
        backgroundColor: escenas[activa].fondo,
        duration: quiereMovimiento() ? 0.7 : 0,
        ease: "power1.inOut",
        overwrite: "auto",
      });
    },
    { dependencies: [activa] }
  );

  const irA = contextSafe((i) => {
    const destino = escenas[Math.min(Math.max(i, 0), escenas.length - 1)];
    gsap.to(window, {
      scrollTo: { y: `#${destino.id}`, offsetY: ALTO_NAV, autoKill: true },
      duration: quiereMovimiento() ? 0.9 : 0,
      ease: "power2.inOut",
      overwrite: "auto",
    });
  });

  // Izquierda y derecha no chocan con el scroll normal. Se ignoran dentro de campos.
  useEffect(() => {
    const alPulsar = (e) => {
      if (e.target.closest?.("input, textarea, select")) return;
      if (e.key === "ArrowRight") irA(activaRef.current + 1);
      if (e.key === "ArrowLeft") irA(activaRef.current - 1);
    };
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, [irA]);

  return (
    <nav ref={raiz} className="wx-nav" aria-label="Escenas de tu época">
      <div className="wx-nav-caja">
        <button type="button" className="wx-flecha" aria-label="Escena anterior" disabled={activa === 0}
          onClick={() => irA(activa - 1)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
        </button>

        <ol className="wx-puntos">
          {escenas.map((e, i) => (
            <li key={e.id}>
              <button type="button" aria-label={e.nombre} aria-current={i === activa ? "step" : undefined}
                title={e.nombre} onClick={() => irA(i)} />
            </li>
          ))}
        </ol>

        <p className="wx-etiqueta" aria-live="polite">
          <span className="tabular">{activa + 1}/{escenas.length}</span> {escenas[activa].nombre}
        </p>

        <button type="button" className="wx-flecha" aria-label="Escena siguiente" disabled={activa === escenas.length - 1}
          onClick={() => irA(activa + 1)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
        </button>

        <span className="wx-progreso" aria-hidden="true"><span className="wx-progreso-relleno" /></span>
      </div>
    </nav>
  );
}
