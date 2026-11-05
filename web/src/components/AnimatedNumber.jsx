import { useRef } from "react";
import { CON_MOVIMIENTO, gsap, useGSAP } from "../lib/gsap.js";
import { numero } from "../format.js";

/**
 * Contador que escribe directamente en el DOM, sin re-render de React por frame.
 * El HTML ya trae el valor final, así que sin movimiento o sin JS se lee bien.
 * `disparo` permite arrancarlo al entrar en pantalla (config de ScrollTrigger).
 */
export function AnimatedNumber({ value, decimals = 0, duration = 1.3, disparo = null }) {
  const ref = useRef(null);

  useGSAP(
    () => {
      const el = ref.current;
      const mm = gsap.matchMedia();
      mm.add(CON_MOVIMIENTO, () => {
        const contador = { v: 0 };
        el.textContent = numero(0, decimals);
        gsap.to(contador, {
          v: value,
          duration,
          ease: "power3.out",
          scrollTrigger: disparo ? { end: "+=1", ...disparo, once: true } : undefined,
          onUpdate: () => {
            el.textContent = numero(contador.v, decimals);
          },
          onComplete: () => {
            el.textContent = numero(value, decimals);
          },
        });
        return () => {
          el.textContent = numero(value, decimals);
        };
      });
    },
    { dependencies: [value, decimals], revertOnUpdate: true }
  );

  return <span ref={ref} className="tabular">{numero(value, decimals)}</span>;
}
