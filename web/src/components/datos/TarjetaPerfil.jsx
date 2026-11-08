import { useRef, useState } from "react";
import { fechaHoraDeServidor, numero } from "../../format.js";
import { fechaMedia, soloFecha } from "../../lib/dates.js";
import { elegirPerfil } from "../../lib/perfil.js";
import { ProgresoCarga } from "./ProgresoCarga.jsx";

const inicial = (nombre) => ([...(nombre ?? "")][0] ?? "?").toUpperCase();
const mismoNombre = (a, b) => a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();
const megas = (bytes) => `${(bytes / 1024 / 1024).toFixed(bytes > 10 * 1024 * 1024 ? 0 : 1)} MB`;

/**
 * Un perfil con sus acciones. Subir sobre un perfil con datos, limpiar y borrar piden confirmación;
 * borrar pide además escribir el nombre, porque no hay vuelta atrás.
 */
export function TarjetaPerfil({ perfil, activo, carga, hayCargaEnCurso, onSubir, onCerrarCarga, onAccion }) {
  const [modo, setModo] = useState(null); // null | renombrar | limpiar | borrar | reemplazar
  const [texto, setTexto] = useState("");
  const [pendientes, setPendientes] = useState([]);
  const [error, setError] = useState(null);
  const [trabajando, setTrabajando] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const selector = useRef(null);

  const tieneDatos = perfil.reproducciones > 0;
  const cargaPropia = carga.perfil === perfil.id && carga.fase !== "inactiva";
  const bloqueado = hayCargaEnCurso || trabajando;

  const cerrar = () => {
    setModo(null);
    setTexto("");
    setPendientes([]);
    setError(null);
  };

  const elegirArchivos = (lista) => {
    const archivos = [...lista];
    if (archivos.length === 0) return;
    if (!tieneDatos) {
      onSubir(perfil.id, archivos);
      return;
    }
    setPendientes(archivos);
    setError(null);
    setModo("reemplazar");
  };

  const ejecutar = async (accion) => {
    setTrabajando(true);
    setError(null);
    try {
      await accion();
      cerrar();
    } catch (e) {
      setError(e.message);
    } finally {
      setTrabajando(false);
    }
  };

  const confirmarReemplazo = () => {
    onSubir(perfil.id, pendientes);
    cerrar();
  };

  return (
    <li
      className={`dt-tarjeta ${arrastrando ? "arrastrando" : ""}`}
      onDragOver={(e) => {
        if (bloqueado) return;
        e.preventDefault();
        setArrastrando(true);
      }}
      onDragLeave={() => setArrastrando(false)}
      onDrop={(e) => {
        e.preventDefault();
        setArrastrando(false);
        if (!bloqueado) elegirArchivos(e.dataTransfer.files);
      }}
    >
      <div className="dt-cabecera">
        <span className="dt-letra" aria-hidden="true">{inicial(perfil.nombre)}</span>
        <div className="dt-datos">
          <h2>
            {perfil.nombre}
            {activo && <span className="dt-etiqueta">Perfil activo</span>}
          </h2>
          {tieneDatos ? (
            <p className="tabular">
              {numero(perfil.reproducciones)} reproducciones · {fechaMedia(soloFecha(perfil.primeraReproduccion))} a{" "}
              {fechaMedia(soloFecha(perfil.ultimaReproduccion))}
            </p>
          ) : (
            <p>Sin datos todavía</p>
          )}
          {perfil.datosActualizados && <p className="dt-nota">Datos cargados el {fechaHoraDeServidor(perfil.datosActualizados)}</p>}
        </div>
        {tieneDatos && (
          <a className="dt-enlace" href="#inicio" onClick={() => elegirPerfil(perfil.id)}>Ver su Wrapped</a>
        )}
      </div>

      <input
        ref={selector}
        type="file"
        hidden
        multiple
        accept=".zip,.json,application/zip,application/json"
        onChange={(e) => {
          elegirArchivos(e.target.files);
          e.target.value = "";
        }}
      />
      <div className="dt-acciones">
        <button type="button" className="dt-boton primario" disabled={bloqueado} onClick={() => selector.current?.click()}>
          {tieneDatos ? "Reemplazar historial" : "Subir historial"}
        </button>
        <button type="button" className="dt-boton" disabled={bloqueado}
          onClick={() => { cerrar(); setTexto(perfil.nombre); setModo("renombrar"); }}>Renombrar</button>
        {tieneDatos && (
          <button type="button" className="dt-boton" disabled={bloqueado}
            onClick={() => { cerrar(); setModo("limpiar"); }}>Limpiar datos</button>
        )}
        <button type="button" className="dt-boton peligro" disabled={bloqueado}
          onClick={() => { cerrar(); setModo("borrar"); }}>Borrar perfil</button>
      </div>
      {!tieneDatos && !cargaPropia && !modo && (
        <p className="dt-nota">Arrastra aquí el .zip de Spotify, o elígelo con el botón.</p>
      )}

      {modo === "renombrar" && (
        <form className="dt-panel" onSubmit={(e) => { e.preventDefault(); ejecutar(() => onAccion("renombrar", perfil, texto)); }}>
          <label>
            Nuevo nombre
            <input value={texto} maxLength={60} autoFocus onChange={(e) => setTexto(e.target.value)} />
          </label>
          <div className="dt-fila">
            <button type="submit" className="dt-boton primario" disabled={trabajando || !texto.trim()}>Guardar</button>
            <button type="button" className="dt-boton" onClick={cerrar}>Cancelar</button>
          </div>
        </form>
      )}

      {modo === "reemplazar" && (
        <div className="dt-panel">
          <p>
            <strong>Esto reemplaza</strong> las {numero(perfil.reproducciones)} reproducciones actuales de {perfil.nombre} por
            las de {pendientes.length === 1 ? pendientes[0].name : `${pendientes.length} archivos`} (
            {megas(pendientes.reduce((s, f) => s + f.size, 0))}). Si algo falla, se conserva el historial actual.
          </p>
          <div className="dt-fila">
            <button type="button" className="dt-boton primario" onClick={confirmarReemplazo}>Reemplazar</button>
            <button type="button" className="dt-boton" onClick={cerrar}>Cancelar</button>
          </div>
        </div>
      )}

      {modo === "limpiar" && (
        <div className="dt-panel">
          <p>
            Se borrarán las {numero(perfil.reproducciones)} reproducciones de {perfil.nombre}. El perfil se conserva y
            podrás volver a subir su historial.
          </p>
          <div className="dt-fila">
            <button type="button" className="dt-boton peligro" disabled={trabajando}
              onClick={() => ejecutar(() => onAccion("limpiar", perfil))}>Limpiar datos</button>
            <button type="button" className="dt-boton" onClick={cerrar}>Cancelar</button>
          </div>
        </div>
      )}

      {modo === "borrar" && (
        <form className="dt-panel" onSubmit={(e) => { e.preventDefault(); ejecutar(() => onAccion("borrar", perfil)); }}>
          <label>
            <span>Se borrará el perfil y todo su historial. Escribe <strong>{perfil.nombre}</strong> para confirmar.</span>
            <input value={texto} autoFocus autoComplete="off" onChange={(e) => setTexto(e.target.value)} />
          </label>
          <div className="dt-fila">
            <button type="submit" className="dt-boton peligro" disabled={trabajando || !mismoNombre(texto, perfil.nombre)}>
              Borrar perfil
            </button>
            <button type="button" className="dt-boton" onClick={cerrar}>Cancelar</button>
          </div>
        </form>
      )}

      {error && <p className="dt-error" role="alert">{error}</p>}
      {cargaPropia && <ProgresoCarga estado={carga} onCerrar={onCerrarCarga} />}
    </li>
  );
}
