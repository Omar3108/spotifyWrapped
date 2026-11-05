import { Suspense, lazy, useLayoutEffect } from "react";
import App from "./App.jsx";
import { TopNav } from "./components/TopNav.jsx";
import { useHashRoute } from "./hooks/useHashRoute.js";

const Explore = lazy(() => import("./pages/Explore.jsx"));
const CustomWrapped = lazy(() => import("./pages/CustomWrapped.jsx"));

/** Elige la vista según el hash. La portada sigue siendo App.jsx, sin cambios de contenido. */
export default function Shell() {
  const ruta = useHashRoute();
  const { vista, ancla } = ruta;

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
      <TopNav vista={vista} />
      <div id="inicio" />
      <Suspense fallback={<div className="vista-cargando" aria-busy="true" />}>
        {vista === "explorar" && <Explore trackId={ruta.trackId} />}
        {vista === "mi-epoca" && <CustomWrapped from={ruta.from} to={ruta.to} />}
      </Suspense>
      {vista === "portada" && <App />}
    </>
  );
}
