import { useEffect, useId, useRef, useState } from "react";
import { elegirPerfil } from "../lib/perfil.js";
import { numero } from "../format.js";

const inicial = (nombre) => ([...(nombre ?? "")][0] ?? "?").toUpperCase();

/** Botón con la inicial del perfil activo. Abre la lista para cambiar y, en local, el acceso a gestionar. */
export function PerfilMenu({ perfiles, activo, local }) {
  const [abierto, setAbierto] = useState(false);
  const raiz = useRef(null);
  const idLista = useId();

  useEffect(() => {
    if (!abierto) return undefined;
    const fuera = (e) => !raiz.current?.contains(e.target) && setAbierto(false);
    const tecla = (e) => {
      if (e.key === "Escape") {
        setAbierto(false);
        raiz.current?.querySelector("button")?.focus();
      }
    };
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("pointerdown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto]);

  if (!perfiles?.length && !local) return null;

  const elegir = (id) => {
    // Una canción de un perfil puede no existir en otro: se vuelve al buscador.
    if (/^#\/explorar\/\d+/.test(window.location.hash)) window.location.hash = "#/explorar";
    elegirPerfil(id);
    setAbierto(false);
  };

  return (
    <div className="perfil" ref={raiz}>
      <button
        type="button"
        className="perfil-boton"
        aria-expanded={abierto}
        aria-controls={idLista}
        aria-label={activo ? `Perfil: ${activo.nombre}. Cambiar de perfil` : "Perfiles"}
        onClick={() => setAbierto((a) => !a)}
      >
        {activo ? inicial(activo.nombre) : "+"}
      </button>

      {abierto && (
        <div className="perfil-menu" id={idLista}>
          {perfiles?.length > 0 && (
            <ul>
              {perfiles.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="perfil-opcion"
                    aria-current={p.id === activo?.id ? "true" : undefined}
                    onClick={() => elegir(p.id)}
                  >
                    <span className="perfil-letra" aria-hidden="true">{inicial(p.nombre)}</span>
                    <span className="perfil-nombre">{p.nombre}</span>
                    <span className="perfil-meta tabular">
                      {p.reproducciones > 0 ? `${numero(p.reproducciones)} reproducciones` : "sin datos"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {local && (
            <a className="perfil-gestion" href="#/datos" onClick={() => setAbierto(false)}>
              Gestionar perfiles y datos
            </a>
          )}
        </div>
      )}
    </div>
  );
}
