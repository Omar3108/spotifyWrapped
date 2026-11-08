import { useCallback, useEffect, useRef, useState } from "react";
import { get, subirZip } from "../api.js";
import { empaquetar } from "../lib/zip.js";

const INACTIVA = { perfil: null, fase: "inactiva", progreso: 0, mensaje: null };
const INTERVALO_MS = 1000;

const esZip = (f) => /\.zip$/i.test(f.name);
const esJson = (f) => /\.json$/i.test(f.name);

/** Un .zip tal cual, o varios .json que se empaquetan aquí. Cualquier otra mezcla se rechaza con un motivo. */
export function validarArchivos(archivos) {
  if (archivos.length === 0) return "No se eligió ningún archivo.";
  if (archivos.length === 1 && esZip(archivos[0])) return null;
  if (archivos.every(esJson)) return null;
  if (archivos.some(esZip)) return "Sube un solo .zip, o varios .json, pero no los dos a la vez.";
  return "Sube el .zip que envía Spotify, o sus archivos .json.";
}

/**
 * Estado de la carga de historial. fases: inactiva, empaquetando, subiendo, procesando, guardando, lista, error.
 * `alTerminar` se llama cuando el servidor confirma el guardado, para que la lista de perfiles se vuelva a pedir.
 */
export function useCarga({ alTerminar }) {
  const [estado, setEstado] = useState(INACTIVA);
  const vivo = useRef(true);
  const temporizador = useRef(null);
  const alTerminarRef = useRef(alTerminar);
  alTerminarRef.current = alTerminar;

  const poner = useCallback((cambios) => vivo.current && setEstado((e) => ({ ...e, ...cambios })), []);

  const esperarGuardado = useCallback(
    (perfil) => {
      const consultar = async () => {
        try {
          const c = await get("gestion/carga");
          if (!vivo.current) return;
          if (c.fase === "lista") {
            poner({ perfil, fase: "lista", mensaje: c.mensaje });
            alTerminarRef.current?.();
            return;
          }
          if (c.fase === "error") {
            poner({ perfil, fase: "error", mensaje: c.mensaje });
            return;
          }
          poner({ perfil, fase: c.fase === "leyendo" ? "procesando" : "guardando", progreso: 1 });
        } catch {
          /* un fallo puntual de red no corta la espera */
        }
        temporizador.current = setTimeout(consultar, INTERVALO_MS);
      };
      consultar();
    },
    [poner]
  );

  // Si se recarga la página con un guardado a medias, se retoma el seguimiento.
  useEffect(() => {
    vivo.current = true;
    get("gestion/carga")
      .then((c) => {
        if (vivo.current && (c.fase === "guardando" || c.fase === "leyendo")) {
          poner({ perfil: c.perfil, fase: "guardando", progreso: 1 });
          esperarGuardado(c.perfil);
        }
      })
      .catch(() => {});
    return () => {
      vivo.current = false;
      clearTimeout(temporizador.current);
    };
  }, [esperarGuardado, poner]);

  const iniciar = useCallback(
    async (perfil, archivos) => {
      const invalido = validarArchivos(archivos);
      if (invalido) {
        setEstado({ perfil, fase: "error", progreso: 0, mensaje: invalido });
        return;
      }
      try {
        let zip = archivos[0];
        if (!esZip(zip)) {
          setEstado({ perfil, fase: "empaquetando", progreso: 0, mensaje: null });
          zip = await empaquetar(archivos, (hechos, total) => poner({ progreso: hechos / total }));
        }
        setEstado({ perfil, fase: "subiendo", progreso: 0, mensaje: null });
        await subirZip(perfil, zip, {
          alAvanzar: (p) => poner({ progreso: p }),
          alSubir: () => poner({ fase: "procesando", progreso: 1 }),
        });
        poner({ fase: "guardando", progreso: 1 });
        esperarGuardado(perfil);
      } catch (error) {
        setEstado({ perfil, fase: "error", progreso: 0, mensaje: error.message });
      }
    },
    [esperarGuardado, poner]
  );

  const descartar = useCallback(() => setEstado(INACTIVA), []);
  const ocupada = ["empaquetando", "subiendo", "procesando", "guardando"].includes(estado.fase);
  return { estado, iniciar, descartar, ocupada };
}
