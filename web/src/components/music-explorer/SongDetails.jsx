import { useMemo, useRef, useState } from "react";
import { duracion, fechaHora, numero, porcentaje } from "../../format.js";
import { useApi } from "../../hooks.js";
import { CON_MOVIMIENTO, gsap, useGSAP } from "../../lib/gsap.js";
import { AnimatedNumber } from "../AnimatedNumber.jsx";
import { Cover } from "../Cover.jsx";
import { Panel } from "../ui.jsx";
import { SongTimeline } from "./SongTimeline.jsx";

export function SongDetails({ trackId, previa }) {
  const raiz = useRef(null);
  // "song" agrega todas las versiones; un número limita a esa versión.
  const [version, setVersion] = useState(null);
  const idConsulta = version ?? trackId;
  const scope = version ? "version" : "song";
  const params = useMemo(() => ({ scope }), [scope]);
  const estado = useApi(`tracks/${idConsulta}`, params);
  const d = estado.data;

  useGSAP(
    () => {
      if (!d) return;
      const mm = gsap.matchMedia();
      mm.add(CON_MOVIMIENTO, () => {
        gsap.from(".detalle-entra", {
          y: 18, autoAlpha: 0, duration: 0.5, stagger: 0.06, ease: "power3.out", clearProps: "all",
        });
      });
    },
    { scope: raiz, dependencies: [d?.scope, d?.trackId] }
  );

  const cabecera = d ?? previa;

  return (
    <article ref={raiz} className="detalle" aria-live="polite">
      <header className="detalle-hero">
        <Cover
          uri={cabecera?.spotifyUri}
          nombre={cabecera?.albumName ?? cabecera?.trackName ?? ""}
          flipId={`cancion-${trackId}`}
          className="detalle-portada"
        />
        <div>
          <h2>{cabecera?.trackName ?? "Cargando"}</h2>
          <p className="detalle-artista">{cabecera?.artistName}</p>
          {cabecera?.albumName && <p className="detalle-album">{cabecera.albumName}</p>}
        </div>
      </header>

      <Panel state={estado}>
        {d && (d.reproducciones === 0 ? (
          <p className="panel-empty">Esta pista no tiene reproducciones válidas registradas.</p>
        ) : (
          <>
            <div className="detalle-cifras">
              <p className="detalle-principal detalle-entra">
                <AnimatedNumber value={d.reproducciones} />
                <span>{d.reproducciones === 1 ? "reproducción" : "reproducciones"}</span>
              </p>
              <dl className="detalle-datos">
                <div className="detalle-entra"><dt>Tiempo escuchado</dt><dd>{duracion(d.msTotal)}</dd></div>
                <div className="detalle-entra"><dt>Parte de tu tiempo total</dt><dd>{porcentaje(d.porcentajeTiempo)}</dd></div>
                <div className="detalle-entra">
                  <dt>Su mejor año</dt>
                  <dd>{d.mejorAnio} <small>{numero(d.reproduccionesMejorAnio)} veces</small></dd>
                </div>
                <div className="detalle-entra"><dt>Primera vez</dt><dd>{fechaHora(d.primera)}</dd></div>
                <div className="detalle-entra"><dt>Última vez</dt><dd>{fechaHora(d.ultima)}</dd></div>
              </dl>
            </div>

            <SongTimeline trackId={idConsulta} scope={scope} />

            {d.versiones.length > 1 && (
              <Versiones versiones={d.versiones} elegida={version} onElegir={setVersion} />
            )}

            <p className="detalle-nota">
              Se cuenta una reproducción desde 30 segundos escuchados. El tiempo es la suma de lo que sonó
              de verdad. Fechas en hora de Caracas.
            </p>
          </>
        ))}
      </Panel>
    </article>
  );
}

function Versiones({ versiones, elegida, onElegir }) {
  const total = versiones.reduce((s, v) => s + v.reproducciones, 0);
  return (
    <section className="versiones detalle-entra">
      <h3>Spotify la tiene en {versiones.length} versiones</h3>
      <p>Mismo título y artista, publicados por separado. Aquí puedes ver cada una.</p>
      <div className="versiones-lista" role="group" aria-label="Elegir versión">
        <button type="button" aria-pressed={elegida === null} onClick={() => onElegir(null)}>
          <strong>Todas</strong>
          <span>{numero(total)}</span>
        </button>
        {versiones.map((v, i) => (
          <button key={v.trackId} type="button" aria-pressed={elegida === v.trackId} onClick={() => onElegir(v.trackId)}>
            <strong>{v.albumName ?? "Sin álbum"}<small>versión {i + 1}</small></strong>
            <span>{numero(v.reproducciones)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
