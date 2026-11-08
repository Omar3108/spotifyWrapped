import { useEffect, useRef } from "react";
import { DateRangeSelector } from "../components/custom-wrapped/DateRangeSelector.jsx";
import { WrappedExperience } from "../components/custom-wrapped/WrappedExperience.jsx";
import { Panel } from "../components/ui.jsx";
import { useApi } from "../hooks.js";
import { rutaEpoca } from "../hooks/useHashRoute.js";
import { useWrappedStats } from "../hooks/useWrappedStats.js";
import { soloFecha, validarRango } from "../lib/dates.js";
import "../styles/wrapped.css";

export default function CustomWrapped({ from, to, nombre }) {
  const resumen = useApi("summary");
  const primero = soloFecha(resumen.data?.primeraReproduccion);
  const ultimo = soloFecha(resumen.data?.ultimaReproduccion);

  const rangoListo = primero && from && to && validarRango(from, to, primero, ultimo) === null;
  const { data, derivado, error, loading, reintentar } = useWrappedStats(
    rangoListo ? from : null,
    rangoListo ? to : null
  );

  // Al generar, lleva a la primera escena en cuanto hay datos.
  const irAlInicio = useRef(false);
  const generar = (a, b) => {
    irAlInicio.current = true;
    if (a === from && b === to) {
      document.getElementById("wx-intro")?.scrollIntoView();
      return;
    }
    window.location.hash = rutaEpoca(a, b);
  };

  useEffect(() => {
    if (data && irAlInicio.current) {
      irAlInicio.current = false;
      document.getElementById("wx-intro")?.scrollIntoView();
    }
  }, [data]);

  const sinDatos = data && data.reproducciones === 0;

  return (
    <main className="epoca">
      <section className="epoca-selector" id="selector" aria-labelledby="epoca-titulo">
        <h1 id="epoca-titulo">Elige una época de tu vida en música</h1>
        <Panel state={resumen} vacio={!primero} mensajeVacio="Todavía no hay historial cargado.">
          <DateRangeSelector primero={primero} ultimo={ultimo} from={from} to={to} onGenerar={generar} />
        </Panel>
      </section>

      {loading && <div className="epoca-cargando" aria-busy="true"><p>Reuniendo tu época</p></div>}

      {error && (
        <div className="epoca-aviso" role="alert">
          <p>No se pudieron calcular las estadísticas de este período.</p>
          <button type="button" className="boton-principal" onClick={reintentar}>Reintentar</button>
        </div>
      )}

      {sinDatos && (
        <div className="epoca-aviso">
          <p>No escuchaste nada registrado en este período. Prueba con uno de los accesos rápidos.</p>
        </div>
      )}

      {data && !sinDatos && (
        <WrappedExperience key={`${from}|${to}`} stats={data} derivado={derivado} nombre={nombre} />
      )}
    </main>
  );
}
