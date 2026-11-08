import { useState } from "react";

/** Un perfil solo necesita un nombre. */
export function CrearPerfil({ onCrear, destacado }) {
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState(null);
  const [trabajando, setTrabajando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    setTrabajando(true);
    setError(null);
    try {
      await onCrear(nombre);
      setNombre("");
    } catch (err) {
      setError(err.message);
    } finally {
      setTrabajando(false);
    }
  };

  return (
    <form className={`dt-crear ${destacado ? "destacado" : ""}`} onSubmit={enviar}>
      <label htmlFor="dt-nuevo-perfil">{destacado ? "Nombre del primer perfil" : "Nuevo perfil"}</label>
      <div className="dt-fila">
        <input id="dt-nuevo-perfil" value={nombre} maxLength={60} placeholder="Por ejemplo, Omar"
          autoComplete="off" onChange={(e) => setNombre(e.target.value)} />
        <button type="submit" className="dt-boton primario" disabled={trabajando || !nombre.trim()}>Crear perfil</button>
      </div>
      {error && <p className="dt-error" role="alert">{error}</p>}
    </form>
  );
}
