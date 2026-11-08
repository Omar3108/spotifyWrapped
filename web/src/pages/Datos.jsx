import { CrearPerfil } from "../components/datos/CrearPerfil.jsx";
import { TarjetaPerfil } from "../components/datos/TarjetaPerfil.jsx";
import { PASOS } from "../components/SinDatos.jsx";
import { enviar } from "../api.js";
import { useCarga } from "../hooks/useCarga.js";
import { resolverPerfil, usePerfilElegido } from "../lib/perfil.js";

/**
 * Gestión de perfiles y datos. Solo se muestra en el equipo local (lo decide Shell y lo exige nginx).
 * Cada acción vuelve a pedir la lista de perfiles, así el resto de la página ve el cambio al instante.
 */
export default function Datos({ perfiles, recargar }) {
  const elegido = usePerfilElegido();
  const activo = resolverPerfil(elegido, perfiles);
  const { estado: carga, iniciar, descartar, ocupada } = useCarga({ alTerminar: recargar });

  const crear = async (nombre) => {
    await enviar("POST", "perfiles", { nombre });
    recargar();
  };

  const accion = async (tipo, perfil, nombre) => {
    if (tipo === "renombrar") await enviar("PATCH", `perfiles/${perfil.id}`, { nombre });
    if (tipo === "limpiar") await enviar("DELETE", `perfiles/${perfil.id}/datos`);
    if (tipo === "borrar") await enviar("DELETE", `perfiles/${perfil.id}`);
    recargar();
  };

  const sinPerfiles = perfiles && perfiles.length === 0;

  return (
    <main className="datos">
      <header className="dt-encabezado">
        <p className="eyebrow">Gestión</p>
        <h1>Perfiles y datos</h1>
        <p className="dt-intro">
          Cada perfil es un historial de Spotify con su propio Wrapped. Subir un historial reemplaza el anterior de ese
          perfil. Esta sección solo funciona desde este equipo: quien entre por el enlace público verá los Wrapped, pero no
          podrá cambiar nada.
        </p>
      </header>

      {!perfiles && <div className="skeleton" aria-busy="true" />}

      {sinPerfiles && <CrearPerfil onCrear={crear} destacado />}

      {perfiles?.length > 0 && (
        <ul className="dt-lista">
          {perfiles.map((p) => (
            <TarjetaPerfil
              key={p.id}
              perfil={p}
              activo={p.id === activo?.id}
              carga={carga}
              hayCargaEnCurso={ocupada}
              onSubir={iniciar}
              onCerrarCarga={descartar}
              onAccion={accion}
            />
          ))}
        </ul>
      )}

      {perfiles?.length > 0 && <CrearPerfil onCrear={crear} />}

      <details className="dt-ayuda" open={sinPerfiles || undefined}>
        <summary>¿Cómo pido el historial a Spotify?</summary>
        <ol>{PASOS.map((p) => <li key={p}>{p}</li>)}</ol>
        <p className="dt-nota">
          El .zip se lee en el servidor y no se guarda: de cada reproducción solo se conservan canción, artista, álbum,
          fecha y cómo empezó y terminó. La dirección IP que trae el archivo se descarta.
        </p>
      </details>
    </main>
  );
}
