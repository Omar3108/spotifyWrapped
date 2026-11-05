import { WrappedAlbums } from "./WrappedAlbums.jsx";
import { WrappedArtists } from "./WrappedArtists.jsx";
import { WrappedEvolution } from "./WrappedEvolution.jsx";
import { WrappedIntro } from "./WrappedIntro.jsx";
import { WrappedNav } from "./WrappedNav.jsx";
import { WrappedSongs } from "./WrappedSongs.jsx";
import { WrappedSummary } from "./WrappedSummary.jsx";
import { WrappedTime } from "./WrappedTime.jsx";

export const ESCENAS = [
  { id: "wx-intro", nombre: "Inicio", fondo: "#07170e" },
  { id: "wx-tiempo", nombre: "Tu tiempo", fondo: "#0b0b0d" },
  { id: "wx-artistas", nombre: "Artistas", fondo: "#06261a" },
  { id: "wx-canciones", nombre: "Canciones", fondo: "#0d0d10" },
  { id: "wx-albumes", nombre: "Álbumes", fondo: "#0b1f24" },
  { id: "wx-evolucion", nombre: "Evolución", fondo: "#0b0b0d" },
  { id: "wx-resumen", nombre: "Resumen", fondo: "#07241a" },
];

/**
 * Se monta con key = rango, así que cambiar de fechas destruye la experiencia
 * entera y cada escena limpia sus propias animaciones.
 */
export function WrappedExperience({ stats, derivado }) {
  return (
    <div className="wx" id="wx">
      <WrappedNav escenas={ESCENAS} />
      <WrappedIntro from={stats.from} to={stats.to} />
      <WrappedTime stats={stats} derivado={derivado} />
      <WrappedArtists artistas={stats.topArtistas} />
      <WrappedSongs canciones={stats.topCanciones} />
      <WrappedAlbums albumes={stats.topAlbumes} />
      <WrappedEvolution stats={stats} derivado={derivado} />
      <WrappedSummary stats={stats} derivado={derivado} />
    </div>
  );
}
