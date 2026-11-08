import { Fragment, Suspense, lazy, useLayoutEffect } from "react";
import App from "./App.jsx";
import { SinDatos } from "./components/SinDatos.jsx";
import { TopNav } from "./components/TopNav.jsx";
import { useHashRoute } from "./hooks/useHashRoute.js";
import { usePerfiles } from "./hooks/usePerfiles.js";
import { esLocal, fijarActivo, resolverPerfil, usePerfilElegido } from "./lib/perfil.js";
import "./styles/datos.css";

const Explore = lazy(() => import("./pages/Explore.jsx"));
const CustomWrapped = lazy(() => import("./pages/CustomWrapped.jsx"));
const Datos = lazy(() => import("./pages/Datos.jsx"));
const Comparar = lazy(() => import("./pages/Comparar.jsx"));

/** Elige la vista según el hash. La portada sigue siendo App.jsx, sin cambios de contenido. */
export default function Shell() {
  const ruta = useHashRoute();
  const { vista, ancla } = ruta;
  const local = esLocal();

  const elegido = usePerfilElegido();
  const { perfiles, error, recargar } = usePerfiles();
  const activo = resolverPerfil(elegido, perfiles);

  // Antes de que las vistas hijas pidan datos (efectos pasivos), la API ya sabe de qué perfil.
  useLayoutEffect(() => {
    fijarActivo(activo?.id, activo?.datosActualizados);
  }, [activo?.id, activo?.datosActualizados]);

  useLayoutEffect(() => {
    if (vista !== "portada") return;
    if (ancla) document.getElementById(ancla)?.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [vista, ancla]);

  useLayoutEffect(() => {
    if (vista !== "portada") window.scrollTo(0, 0);
  }, [vista]);

  return (
    <>
      <TopNav vista={vista} perfiles={perfiles} activo={activo} local={local} />
      <div id="inicio" />
      <Suspense fallback={<div className="vista-cargando" aria-busy="true" />}>
        {contenido()}
      </Suspense>
    </>
  );

  function contenido() {
    // La gestión no depende de que haya datos: es justo lo que los crea.
    if (vista === "datos") {
      return local ? <Datos perfiles={perfiles} recargar={recargar} /> : <SinDatos tipo="solo-local" />;
    }
    if (error && !perfiles) {
      return (
        <main className="sin-datos">
          <div className="panel-error">No se pudo cargar los perfiles: {error.message}</div>
          <button type="button" className="sd-boton" onClick={recargar}>Reintentar</button>
        </main>
      );
    }
    if (!perfiles) return <div className="vista-cargando" aria-busy="true" />;
    // No depende del perfil activo: elige sus dos perfiles en la propia página.
    if (vista === "comparar") return <Comparar perfiles={perfiles} activo={activo} a={ruta.a} b={ruta.b} local={local} />;
    if (!activo) return <SinDatos tipo="sin-perfiles" local={local} />;
    if (activo.reproducciones === 0) return <SinDatos tipo="sin-datos" perfil={activo} local={local} />;

    // Al cambiar de perfil o recargar sus datos, las vistas se montan de nuevo con datos limpios.
    return (
      <Fragment key={`${activo.id}-${activo.datosActualizados}`}>
        {vista === "explorar" && <Explore trackId={ruta.trackId} />}
        {vista === "mi-epoca" && <CustomWrapped from={ruta.from} to={ruta.to} nombre={activo.nombre} />}
        {vista === "portada" && <App />}
      </Fragment>
    );
  }
}
