import gsap from "gsap";
import { Flip } from "gsap/Flip";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

// Único punto de registro de plugins, compartido por la portada y las demás vistas.
gsap.registerPlugin(useGSAP, Flip, ScrollToPlugin, ScrollTrigger);

export const CON_MOVIMIENTO = "(prefers-reduced-motion: no-preference)";
export const SIN_MOVIMIENTO = "(prefers-reduced-motion: reduce)";
export const ESCRITORIO = "(min-width: 861px) and (prefers-reduced-motion: no-preference)";

export const quiereMovimiento = () =>
  typeof window !== "undefined" && window.matchMedia(CON_MOVIMIENTO).matches;

// Solo en desarrollo: las pruebas e2e lo usan para detectar instancias sin limpiar.
if (import.meta.env.DEV && typeof window !== "undefined") {
  window.__scrollTriggers = () => ScrollTrigger.getAll().length;
}

export { Flip, ScrollTrigger, gsap, useGSAP };
