import { useRef } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { numero } from "../../format.js";
import { etiquetaPeriodo } from "../../lib/dates.js";
import { CON_MOVIMIENTO, gsap, useGSAP } from "../../lib/gsap.js";
import { CUADRICULA, EJE, VERDE, tooltipProps } from "../chartStyle.js";
import { revelar } from "./animaciones.js";

function TooltipEvolucion({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="wx-tooltip">
      <strong>{label}</strong>
      <span>{numero(p.minutos)} minutos</span>
      {p.artistaLider && <span>Más escuchado: {p.artistaLider}</span>}
    </div>
  );
}

export function WrappedEvolution({ stats, derivado }) {
  const raiz = useRef(null);
  const { evolucion, horas, eras, granularidad, mesPico, franja, horaPico } = derivado;
  const erasVisibles = eras.slice(-8);

  useGSAP(() => {
    revelar(".wx-evolucion-entra", raiz.current);
    const mm = gsap.matchMedia();
    mm.add(CON_MOVIMIENTO, () => {
      gsap.fromTo(".wx-grafico",
        { clipPath: "inset(0 100% 0 0)" },
        {
          clipPath: "inset(0 0% 0 0)", duration: 1.3, ease: "power2.inOut", clearProps: "clipPath",
          scrollTrigger: { trigger: ".wx-grafico", start: "top 78%", end: "+=1", once: true },
        });
    });
  }, { scope: raiz });

  return (
    <section ref={raiz} id="wx-evolucion" className="wx-escena" aria-labelledby="wx-evolucion-titulo">
      <h2 id="wx-evolucion-titulo" className="wx-antetitulo">Cómo cambió tu música</h2>
      <p className="wx-tiempo-frase wx-evolucion-entra">
        {mesPico && granularidad === "mes" ? `Tu mes más fuerte fue ${mesPico}. ` : ""}
        Escuchaste sobre todo {franja}, con el pico a las {String(horaPico).padStart(2, "0")}:00.
      </p>

      <div className="wx-grafico" role="img"
        aria-label={`Minutos escuchados por ${granularidad} en ${evolucion.length} tramos`}>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={evolucion} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
            <defs>
              <linearGradient id="relleno-epoca" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={VERDE} stopOpacity={0.5} />
                <stop offset="100%" stopColor={VERDE} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={CUADRICULA} vertical={false} />
            <XAxis dataKey="etiqueta" tick={EJE} tickLine={false} axisLine={false} minTickGap={40} />
            <YAxis tick={EJE} tickLine={false} axisLine={false} />
            <Tooltip content={<TooltipEvolucion />} cursor={tooltipProps.cursor} />
            <Area type="monotone" dataKey="minutos" stroke={VERDE} strokeWidth={2}
              fill="url(#relleno-epoca)" isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="wx-evolucion-pie">
        <div className="wx-evolucion-entra">
          <h3>Tu día, hora a hora</h3>
          <div role="img" aria-label={`Minutos por hora del día. Pico a las ${horaPico}:00`}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={horas} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <XAxis dataKey="etiqueta" tick={EJE} tickLine={false} axisLine={false} interval={5} />
                <YAxis tick={EJE} tickLine={false} axisLine={false} width={48} />
                <Tooltip {...tooltipProps} cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  formatter={(v) => [`${numero(v)} minutos`, "Escuchado"]} />
                <Bar dataKey="minutos" fill={VERDE} radius={[3, 3, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {erasVisibles.length > 1 && (
          <div className="wx-evolucion-entra">
            <h3>Quién mandó cada temporada</h3>
            <ol className="wx-eras">
              {erasVisibles.map((e) => (
                <li key={e.desde}>
                  <span>{etiquetaPeriodo(e.desde)}{e.meses > 1 ? ` a ${etiquetaPeriodo(e.hasta)}` : ""}</span>
                  <strong>{e.artista}</strong>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
      <p className="sr-only">{numero(stats.minutos)} minutos en total.</p>
    </section>
  );
}
