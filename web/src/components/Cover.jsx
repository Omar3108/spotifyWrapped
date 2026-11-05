import { useEffect, useState } from "react";
import { pedirPortada } from "../lib/covers.js";

function iniciales(nombre) {
  const palabras = (nombre ?? "").replace(/[^\p{L}\p{N} ]/gu, "").trim().split(/\s+/);
  return [...(palabras[0] ?? "")].slice(0, 1).concat([...(palabras[1] ?? "")].slice(0, 1)).join("").toUpperCase();
}

/** Tono estable a partir del nombre, siempre dentro de la gama oscura del proyecto. */
function tono(nombre) {
  let h = 0;
  for (const c of nombre ?? "") h = (h * 31 + c.codePointAt(0)) % 360;
  return 110 + (h % 70);
}

/**
 * Portada real si Spotify la tiene; si no, una generada a partir del nombre.
 * La generada se ve desde el primer momento, así que nunca hay huecos ni saltos
 * de layout, y las estadísticas no dependen de esta carga.
 */
export function Cover({ uri, nombre, className = "", flipId }) {
  const [src, setSrc] = useState(null);
  const [cargada, setCargada] = useState(false);

  useEffect(() => {
    let vigente = true;
    setSrc(null);
    setCargada(false);
    pedirPortada(uri).then((url) => vigente && setSrc(url));
    return () => {
      vigente = false;
    };
  }, [uri]);

  const h = tono(nombre);
  return (
    <span
      className={`cover ${className}`}
      data-flip-id={flipId}
      aria-hidden="true"
      style={{ background: `linear-gradient(145deg, hsl(${h} 46% 22%), hsl(${h + 24} 38% 9%))` }}
    >
      <span className="cover-iniciales">{iniciales(nombre)}</span>
      {src && (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          className={cargada ? "lista" : ""}
          onLoad={() => setCargada(true)}
          onError={() => setSrc(null)}
        />
      )}
    </span>
  );
}
