import { useEffect, useMemo, useState } from "react";
import { numero } from "../../format.js";
import { crearPresets, diasEntre, fechaMedia, posicionEnHistorial, validarRango } from "../../lib/dates.js";

export function DateRangeSelector({ primero, ultimo, from, to, onGenerar }) {
  const [inicio, setInicio] = useState(from ?? primero);
  const [fin, setFin] = useState(to ?? ultimo);
  const [mostrarError, setMostrarError] = useState(Boolean(from && to));

  useEffect(() => {
    if (from) setInicio(from);
    if (to) setFin(to);
  }, [from, to]);

  const presets = useMemo(() => crearPresets(primero, ultimo), [primero, ultimo]);
  const error = validarRango(inicio, fin, primero, ultimo);
  const posicion = !error ? posicionEnHistorial(inicio, fin, primero, ultimo) : null;

  const aplicar = (preset) => {
    setInicio(preset.from);
    setFin(preset.to);
    setMostrarError(false);
    onGenerar(preset.from, preset.to);
  };

  const enviar = (e) => {
    e.preventDefault();
    setMostrarError(true);
    if (!error) onGenerar(inicio, fin);
  };

  const esActivo = (p) => p.from === inicio && p.to === fin;

  return (
    <form className="rango" onSubmit={enviar} noValidate>
      <div className="rango-presets">
        <div role="group" aria-label="Períodos recientes">
          {presets.relativos.map((p) => (
            <button key={p.id} type="button" aria-pressed={esActivo(p)} onClick={() => aplicar(p)}>{p.etiqueta}</button>
          ))}
        </div>
        <div role="group" aria-label="Años">
          {presets.anios.map((p) => (
            <button key={p.id} type="button" aria-pressed={esActivo(p)} onClick={() => aplicar(p)}>{p.etiqueta}</button>
          ))}
        </div>
      </div>

      <div className="rango-campos">
        <label>
          <span>Desde</span>
          <input type="date" value={inicio ?? ""} min={primero} max={ultimo} required
            aria-invalid={mostrarError && Boolean(error)} aria-describedby="rango-mensaje"
            onChange={(e) => { setInicio(e.target.value); setMostrarError(true); }} />
        </label>
        <label>
          <span>Hasta</span>
          <input type="date" value={fin ?? ""} min={primero} max={ultimo} required
            aria-invalid={mostrarError && Boolean(error)} aria-describedby="rango-mensaje"
            onChange={(e) => { setFin(e.target.value); setMostrarError(true); }} />
        </label>
        <button type="submit" className="boton-principal">Generar mi época</button>
      </div>

      <div className="rango-historial" aria-hidden="true">
        {posicion && (
          <span style={{ left: `${posicion.izquierda}%`, width: `max(${posicion.ancho}%, 3px)` }} />
        )}
      </div>
      <div className="rango-pie">
        <span>{fechaMedia(primero)}</span>
        <span>{fechaMedia(ultimo)}</span>
      </div>

      <p id="rango-mensaje" className={`rango-mensaje ${mostrarError && error ? "error" : ""}`} role="status">
        {mostrarError && error
          ? error
          : !error && `${numero(diasEntre(inicio, fin))} ${diasEntre(inicio, fin) === 1 ? "día" : "días"} seleccionados`}
      </p>
    </form>
  );
}
