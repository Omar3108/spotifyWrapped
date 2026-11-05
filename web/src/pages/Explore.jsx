import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SongDetails } from "../components/music-explorer/SongDetails.jsx";
import { SongSearch } from "../components/music-explorer/SongSearch.jsx";
import { Sugerencias } from "../components/music-explorer/Sugerencias.jsx";
import { useApi } from "../hooks.js";
import { rutaCancion } from "../hooks/useHashRoute.js";
import { soloFecha } from "../lib/dates.js";
import { Flip, quiereMovimiento, useGSAP } from "../lib/gsap.js";
import "../styles/explore.css";

export default function Explore({ trackId }) {
  const raiz = useRef(null);
  const estadoFlip = useRef(null);
  const [previa, setPrevia] = useState(null);

  const resumen = useApi("summary");
  const r = resumen.data;
  const paramsTop = useMemo(
    () => (r ? { from: soloFecha(r.primeraReproduccion), to: soloFecha(r.ultimaReproduccion), limit: 8 } : null),
    [r]
  );
  const top = useApi(!trackId && r ? "range" : null, paramsTop);

  // Guarda la posición de la portada elegida antes de que React cambie la vista.
  const seleccionar = useCallback((cancion) => {
    const objetivo = `[data-flip-id="cancion-${cancion.trackId}"]`;
    estadoFlip.current = quiereMovimiento() && document.querySelector(objetivo) ? Flip.getState(objetivo) : null;
    setPrevia(cancion);
    window.location.hash = rutaCancion(cancion.trackId);
  }, []);

  useGSAP(
    () => {
      const estado = estadoFlip.current;
      if (!estado || !trackId) return;
      estadoFlip.current = null;
      Flip.from(estado, {
        targets: `[data-flip-id="cancion-${trackId}"]`,
        duration: 0.55,
        ease: "power3.inOut",
        absolute: true,
        zIndex: 5,
      });
    },
    { scope: raiz, dependencies: [trackId] }
  );

  useEffect(() => {
    if (!trackId) setPrevia(null);
  }, [trackId]);

  return (
    <main ref={raiz} className="explorar">
      <header className="explorar-cabecera">
        <h1>Busca cualquier canción de tu historial</h1>
        <SongSearch onSelect={seleccionar} />
      </header>

      {trackId ? (
        <SongDetails key={trackId} trackId={trackId} previa={previa?.trackId === trackId ? previa : null} />
      ) : (
        <Sugerencias estado={top} onSelect={seleccionar} />
      )}
    </main>
  );
}
