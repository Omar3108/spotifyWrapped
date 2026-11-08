import { useMemo } from "react";
import { useColorPortada } from "../../hooks/useColorPortada.js";
import { WrappedAlbums } from "./WrappedAlbums.jsx";
import { WrappedArtists } from "./WrappedArtists.jsx";
import { WrappedEvolution } from "./WrappedEvolution.jsx";
import { WrappedIntro } from "./WrappedIntro.jsx";
import { WrappedNav } from "./WrappedNav.jsx";
import { WrappedSongs } from "./WrappedSongs.jsx";
import { WrappedSummary } from "./WrappedSummary.jsx";
import { WrappedTime } from "./WrappedTime.jsx";

const VERDE = "#1ed760";

export const ESCENAS = [
  { id: "wx-intro", nombre: "Inicio", fondo: "#07170e", acento: VERDE },
  { id: "wx-tiempo", nombre: "Tu tiempo", fondo: "#0b0b0d", acento: VERDE },
  { id: "wx-artistas", nombre: "Artistas", fondo: "#06261a", acento: VERDE },
  { id: "wx-canciones", nombre: "Canciones", fondo: "#0d0d10", acento: VERDE },
  { id: "wx-albumes", nombre: "Álbumes", fondo: "#0b1f24", acento: VERDE },
  { id: "wx-evolucion", nombre: "Evolución", fondo: "#0b0b0d", acento: VERDE },
  { id: "wx-resumen", nombre: "Resumen", fondo: "#07241a", acento: VERDE },
];

/**
 * Se monta con key = rango, así que cambiar de fechas destruye la experiencia
 * entera y cada escena limpia sus propias animaciones.
 */
export function WrappedExperience({ stats, derivado }) {
  // Las escenas con una imagen protagonista toman su color; sin él conservan el suyo.
  const artista = useColorPortada(stats.topArtistas[0]?.coverUri ?? null, stats.topArtistas[0]?.artistId);
  const cancion = useColorPortada(stats.topCanciones[0]?.coverUri ?? null);
  const album = useColorPortada(stats.topAlbumes[0]?.coverUri ?? null);

  const escenas = useMemo(() => {
    const colores = { "wx-artistas": artista, "wx-canciones": cancion, "wx-albumes": album };
    return ESCENAS.map((e) => ({ ...e, ...colores[e.id] }));
  }, [artista, cancion, album]);

  return (
    <div className="wx" id="wx">
      <WrappedNav escenas={escenas} />
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
