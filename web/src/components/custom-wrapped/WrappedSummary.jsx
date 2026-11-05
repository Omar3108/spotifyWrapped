import { useRef } from "react";
import { numero } from "../../format.js";
import { rutaCancion } from "../../hooks/useHashRoute.js";
import { fechaMedia } from "../../lib/dates.js";
import { useGSAP } from "../../lib/gsap.js";
import { Cover } from "../Cover.jsx";
import { revelar } from "./animaciones.js";

export function WrappedSummary({ stats, derivado }) {
  const raiz = useRef(null);
  const artista = stats.topArtistas[0];
  const cancion = stats.topCanciones[0];
  const album = stats.topAlbumes[0];
  const portadas = [...new Map(
    [...stats.topCanciones, ...stats.topAlbumes].map((x) => [x.coverUri, x])
  ).values()].slice(0, 4);

  useGSAP(() => {
    revelar(".wx-mosaico .cover", raiz.current, { scale: 0.9, y: 0, stagger: 0.08 });
    revelar(".wx-resumen-entra", raiz.current, { stagger: 0.07, delay: 0.2 });
  }, { scope: raiz });

  return (
    <section ref={raiz} id="wx-resumen" className="wx-escena wx-resumen" aria-labelledby="wx-resumen-titulo">
      <div className={`wx-mosaico n${portadas.length}`} aria-hidden="true">
        {portadas.map((p) => <Cover key={p.coverUri} uri={p.coverUri} nombre={p.nombre} />)}
      </div>

      <div className="wx-resumen-texto">
        <p className="wx-antetitulo wx-resumen-entra">{fechaMedia(stats.from)} a {fechaMedia(stats.to)}</p>
        <h2 id="wx-resumen-titulo" className="wx-resumen-entra">
          {numero(Math.round(stats.minutos))} minutos de música
        </h2>
        <dl className="wx-datos compacto">
          {artista && <div className="wx-resumen-entra"><dt>Artista</dt><dd>{artista.nombre}</dd></div>}
          {cancion && <div className="wx-resumen-entra"><dt>Canción</dt><dd>{cancion.nombre}</dd></div>}
          {album && <div className="wx-resumen-entra"><dt>Álbum</dt><dd>{album.nombre}</dd></div>}
          {derivado.franja && <div className="wx-resumen-entra"><dt>Tu momento</dt><dd>{derivado.franja}</dd></div>}
        </dl>
        <div className="wx-resumen-acciones wx-resumen-entra">
          <a className="boton-principal" href="#/mi-epoca" onClick={(e) => {
            e.preventDefault();
            document.getElementById("selector")?.scrollIntoView();
          }}>Elegir otra época</a>
          {cancion && <a className="boton-secundario" href={rutaCancion(cancion.trackId)}>Abrir tu canción número uno</a>}
        </div>
      </div>
    </section>
  );
}
