import { useEffect, useMemo, useRef } from "react";
import { useApi } from "./hooks.js";
import { Panel } from "./components/ui.jsx";
import { Artistas } from "./components/portada/Artistas.jsx";
import { Evolucion } from "./components/portada/Evolucion.jsx";
import { Habitos } from "./components/portada/Habitos.jsx";
import { Hero } from "./components/portada/Hero.jsx";
import { Musica } from "./components/portada/Musica.jsx";
import { Records } from "./components/portada/Records.jsx";
import { crearPresets, soloFecha } from "./lib/dates.js";
import { ScrollTrigger } from "./lib/gsap.js";
import "./styles/portada.css";

export default function App() {
  const resumen = useApi("summary");
  const r = resumen.data;
  const primero = soloFecha(r?.primeraReproduccion);
  const ultimo = soloFecha(r?.ultimaReproduccion);

  // Artistas, canciones y álbumes salen de /range con todo el historial: trae portadas e ids.
  const rango = useApi(primero ? "range" : null, { from: primero, to: ultimo, limit: 20 });
  const porAnio = useApi("top-artist-by-year");
  const horas = useApi("hourly-pattern");
  const semana = useApi("weekday-pattern");
  const rachas = useApi("longest-streaks", { limit: 1 });
  const sesiones = useApi("longest-sessions", { limit: 1 });
  const skip = useApi("skip-rate");

  const presets = useMemo(() => (primero ? crearPresets(primero, ultimo).anios : []), [primero, ultimo]);
  const rg = rango.data;

  // Los datos llegan de forma asíncrona y cambian la altura de la página:
  // sin recalcular, los ScrollTrigger quedarían con posiciones obsoletas.
  const principal = useRef(null);
  useEffect(() => {
    const el = principal.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    let temporizador;
    const observador = new ResizeObserver(() => {
      clearTimeout(temporizador);
      temporizador = setTimeout(() => ScrollTrigger.refresh(), 150);
    });
    observador.observe(el);
    return () => {
      clearTimeout(temporizador);
      observador.disconnect();
    };
  }, []);

  return (
    <div className="app portada">
      <Hero resumen={r} albumes={rg?.topAlbumes ?? []} />

      <main ref={principal} className="pt-main">
        <Panel state={rango} vacio={rg && rg.topArtistas.length === 0}>
          {rg && <Artistas artistas={rg.topArtistas} />}
        </Panel>

        <Panel state={rango} vacio={rg && rg.topCanciones.length === 0}>
          {rg && <Musica canciones={rg.topCanciones} albumes={rg.topAlbumes} />}
        </Panel>

        <Panel state={porAnio} vacio={porAnio.data?.length === 0}>
          {porAnio.data && <Evolucion datos={porAnio.data} presets={presets} />}
        </Panel>

        <Panel state={horas} vacio={!horas.data?.length}>
          {horas.data && semana.data && <Habitos horas={horas.data} semana={semana.data} />}
        </Panel>

        <Records racha={rachas.data?.[0]} sesion={sesiones.data?.[0]} skip={skip.data} />
      </main>

      <footer className="footer">Hecho con tu historial de Spotify</footer>
    </div>
  );
}
