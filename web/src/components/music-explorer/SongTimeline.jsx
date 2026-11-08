import { useMemo, useRef, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useApi } from "../../hooks.js";
import { etiquetaPeriodo } from "../../lib/dates.js";
import { CON_MOVIMIENTO, gsap, useGSAP } from "../../lib/gsap.js";
import { CUADRICULA, EJE, tooltipProps } from "../chartStyle.js";
import { Panel } from "../ui.jsx";

// Sigue al acento de la portada; sin color, el verde de siempre.
const ACENTO = "var(--green-bright, #1DB954)";

export function SongTimeline({ trackId, scope }) {
  const raiz = useRef(null);
  const [granularidad, setGranularidad] = useState("month");
  const params = useMemo(() => ({ scope, granularity: granularidad }), [scope, granularidad]);
  const estado = useApi(`tracks/${trackId}/timeline`, params);
  const serie = useMemo(
    () => estado.data?.map((p) => ({ ...p, etiqueta: etiquetaPeriodo(p.periodo) })) ?? [],
    [estado.data]
  );

  // Recharts dibuja una vez y GSAP lo revela de izquierda a derecha.
  useGSAP(
    () => {
      if (serie.length === 0) return;
      const mm = gsap.matchMedia();
      mm.add(CON_MOVIMIENTO, () => {
        gsap.fromTo(".linea-grafico",
          { clipPath: "inset(0 100% 0 0)" },
          { clipPath: "inset(0 0% 0 0)", duration: 1.1, ease: "power2.inOut", clearProps: "clipPath" });
      });
    },
    { scope: raiz, dependencies: [serie] }
  );

  return (
    <section ref={raiz} className="linea detalle-entra">
      <header>
        <h3>Reproducciones por {granularidad === "month" ? "mes" : "año"}</h3>
        <div className="selector-mini" role="group" aria-label="Agrupar por">
          <button type="button" aria-pressed={granularidad === "month"} onClick={() => setGranularidad("month")}>Mes</button>
          <button type="button" aria-pressed={granularidad === "year"} onClick={() => setGranularidad("year")}>Año</button>
        </div>
      </header>
      <Panel state={estado} vacio={serie.length === 0} mensajeVacio="Sin datos para este período.">
        <div className="linea-grafico">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={serie} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="relleno-cancion" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ACENTO} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={ACENTO} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={CUADRICULA} vertical={false} />
              <XAxis dataKey="etiqueta" tick={EJE} tickLine={false} axisLine={false} minTickGap={36} />
              <YAxis tick={EJE} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip {...tooltipProps} formatter={(v) => [v, "Reproducciones"]} />
              <Area
                type="monotone" dataKey="reproducciones" stroke={ACENTO} strokeWidth={2}
                fill="url(#relleno-cancion)" isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>
    </section>
  );
}
