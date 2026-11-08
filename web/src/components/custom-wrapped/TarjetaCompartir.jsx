import { useEffect, useRef, useState } from "react";
import { crearTarjeta, descargar, nombreDeArchivo, puedeCompartir } from "../../lib/tarjeta.js";

/**
 * Botón que crea la tarjeta del rango como imagen y la muestra antes de guardarla o compartirla.
 * La imagen se genera en el navegador: no pasa por el servidor.
 */
export function TarjetaCompartir({ stats, derivado, nombre }) {
  const dialogo = useRef(null);
  const [estado, setEstado] = useState({ fase: "inactivo" });
  const archivo = nombreDeArchivo(nombre, stats.from, stats.to);

  // La URL de la vista previa se libera al cambiar de imagen o al desmontar.
  useEffect(() => () => estado.url && URL.revokeObjectURL(estado.url), [estado.url]);

  const abrir = async () => {
    dialogo.current?.showModal();
    if (estado.fase === "lista") return;
    setEstado({ fase: "creando" });
    try {
      const blob = await crearTarjeta({ stats, derivado, nombre });
      const file = new File([blob], archivo, { type: "image/png" });
      setEstado({ fase: "lista", blob, file, url: URL.createObjectURL(blob) });
    } catch (error) {
      setEstado({ fase: "error", mensaje: error.message });
    }
  };

  const compartir = async () => {
    try {
      await navigator.share({ files: [estado.file], title: "Mi Wrapped" });
    } catch (error) {
      if (error.name !== "AbortError") descargar(estado.blob, archivo);
    }
  };

  return (
    <>
      <button type="button" className="boton-secundario" onClick={abrir}>Crear tarjeta para compartir</button>
      <dialog ref={dialogo} className="tarjeta-dialogo" aria-labelledby="tarjeta-titulo"
        onClick={(e) => e.target === dialogo.current && dialogo.current.close()}>
        <div className="tarjeta-contenido">
          <h2 id="tarjeta-titulo">Tu tarjeta</h2>
          <div className="tarjeta-previa" aria-busy={estado.fase === "creando"}>
            {estado.fase === "lista" && <img src={estado.url} alt="Tarjeta con tu artista número uno, tus cinco artistas y canciones más escuchados y tus minutos" />}
            {estado.fase === "creando" && <p>Creando la imagen…</p>}
            {estado.fase === "error" && <p role="alert">No se pudo crear la imagen: {estado.mensaje}</p>}
          </div>
          <div className="tarjeta-acciones">
            {estado.fase === "lista" && puedeCompartir(estado.file) && (
              <button type="button" className="boton-principal" onClick={compartir}>Compartir</button>
            )}
            {estado.fase === "lista" && (
              <button type="button" className={puedeCompartir(estado.file) ? "boton-secundario" : "boton-principal"}
                onClick={() => descargar(estado.blob, archivo)}>Descargar PNG</button>
            )}
            <button type="button" className="boton-secundario" onClick={() => dialogo.current?.close()}>Cerrar</button>
          </div>
        </div>
      </dialog>
    </>
  );
}
