import { CON_MOVIMIENTO, gsap } from "../../lib/gsap.js";

/**
 * Entrada escalonada que se dispara una sola vez. `once` destruye el ScrollTrigger
 * al llegar a `end`, por eso `end` va justo después de `start`: si no, las últimas
 * escenas, que nunca alcanzan su final, dejarían instancias vivas.
 * Sin movimiento no se crea nada y el contenido ya está visible en el HTML.
 * Debe llamarse dentro de useGSAP: el contexto revierte todo al desmontar.
 */
export function revelar(selector, trigger, opciones = {}) {
  const mm = gsap.matchMedia();
  mm.add(CON_MOVIMIENTO, () => {
    gsap.from(selector, {
      y: 28,
      autoAlpha: 0,
      duration: 0.6,
      stagger: 0.05,
      ease: "power3.out",
      clearProps: "transform,opacity,visibility",
      scrollTrigger: { trigger, start: "top 72%", end: "+=1", once: true },
      ...opciones,
    });
  });
  return mm;
}
