import { useEffect, useRef, useState } from "react";
import { LARGO_MINIMO, useSongSearch } from "../../hooks/useSongSearch.js";
import { SongResults } from "./SongResults.jsx";

const ID_LISTA = "resultados-busqueda";

/** Combobox con el patrón ARIA: el foco se queda en el campo y las flechas mueven la opción activa. */
export function SongSearch({ onSelect }) {
  const [texto, setTexto] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(-1);
  const campo = useRef(null);
  const contenedor = useRef(null);
  const { consulta, resultados, estado } = useSongSearch(texto);

  const hayConsulta = texto.trim().length >= LARGO_MINIMO;
  const visible = abierto && hayConsulta;

  useEffect(() => {
    setActivo(-1);
  }, [resultados]);

  useEffect(() => {
    const fuera = (e) => {
      if (!contenedor.current?.contains(e.target)) setAbierto(false);
    };
    document.addEventListener("pointerdown", fuera);
    return () => document.removeEventListener("pointerdown", fuera);
  }, []);

  const elegir = (cancion) => {
    setAbierto(false);
    onSelect(cancion);
    campo.current?.blur();
  };

  const alPulsar = (e) => {
    if (e.key === "Escape") {
      if (visible) setAbierto(false);
      else setTexto("");
      return;
    }
    if (!visible || resultados.length === 0) {
      if (e.key === "ArrowDown") setAbierto(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActivo((i) => (i + 1) % resultados.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActivo((i) => (i <= 0 ? resultados.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      elegir(resultados[Math.max(activo, 0)]);
    }
  };

  return (
    <div className="buscador" ref={contenedor}>
      <label className="sr-only" htmlFor="busqueda-cancion">Canción o artista</label>
      <input
        id="busqueda-cancion"
        ref={campo}
        type="search"
        role="combobox"
        aria-expanded={visible}
        aria-controls={ID_LISTA}
        aria-autocomplete="list"
        aria-activedescendant={visible && activo >= 0 ? `opcion-${resultados[activo]?.trackId}` : undefined}
        autoComplete="off"
        spellCheck="false"
        placeholder="Canción o artista"
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        onKeyDown={alPulsar}
      />
      <div id={ID_LISTA} hidden={!visible} className="buscador-panel">
        {visible && (
          <SongResults
            consulta={consulta || texto.trim()}
            resultados={resultados}
            estado={estado}
            activo={activo}
            onHover={setActivo}
            onSelect={elegir}
          />
        )}
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {estado === "listo" ? `${resultados.length} resultados` : ""}
      </p>
    </div>
  );
}
