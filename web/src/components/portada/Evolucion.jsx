import { useRef } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { numero } from "../../format.js";
import { rutaEpoca } from "../../hooks/useHashRoute.js";
import { CON_MOVIMIENTO, gsap, useGSAP } from "../../lib/gsap.js";
import { CUADRICULA, EJE, VERDE, tooltipProps } from "../chartStyle.js";
import { revelar } from "../custom-wrapped/animaciones.js";

const VERDE_APAGADO = "#168a3e";

/** `presets` son los años de crearPresets: así cada año abre Mi época con su rango real. */
export function Evolucion({ datos, presets }) {
  const raiz = useRef(null);
  const mejor = datos.reduce((a, d) => (d.reproducciones > (a?.reproducciones ?? 0) ? d : a), null);

  useGSAP(
    () => {
      revelar(".pt-anio", ".pt-anios", { stagger: 0.04 });
      const mm = gsap.matchMedia();
      mm.add(CON_MOVIMIENTO, () => {
        // La serie es temporal: se destapa de izquierda a derecha, como en Mi época.
        gsap.fromTo(".pt-grafico",
          { clipPath: "inset(0 100% 0 0)" },
          {
            clipPath: "inset(0 0% 0 0)", duration: 1.3, ease: "power2.inOut", clearProps: "clipPath",
            scrollTrigger: { trigger: ".pt-grafico", start: "top 78%", end: "+=1", once: true },
          });
      });
    },
    { scope: raiz }
  );

  return (
    <section ref={raiz} id="evolucion" className="pt-seccion" aria-labelledby="evolucion-titulo">
      <h2 id="evolucion-titulo">Tu evolución musical</h2>
      <p className="pt-texto">
        Cada barra son las reproducciones de tu artista principal ese año.
        {mejor ? ` El año más intenso fue ${mejor.anio}, con ${numero(mejor.reproducciones)} de ${mejor.artistName}.` : ""}
      </p>

      <div className="pt-grafico" role="img" aria-label="Reproducciones del artista principal de cada año">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={datos} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={CUADRICULA} />
            <XAxis dataKey="anio" tick={EJE} axisLine={false} tickLine={false} />
            <YAxis tick={EJE} axisLine={false} tickLine={false} tickFormatter={(v) => numero(v)} />
            <Tooltip {...tooltipProps} cursor={{ fill: "rgba(255,255,255,0.05)" }}
              formatter={(v, n, p) => [`${numero(v)} reproducciones`, p.payload.artistName]}
              labelFormatter={(l) => `Año ${l}`} />
            <Bar dataKey="reproducciones" radius={[6, 6, 0, 0]} isAnimationActive={false}>
              {datos.map((d) => <Cell key={d.anio} fill={d.anio === mejor?.anio ? "#1ed760" : VERDE_APAGADO} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <ul className="pt-anios">
        {datos.map((d) => {
          const p = presets.find((x) => x.id === String(d.anio));
          const contenido = (
            <>
              <strong className="tabular">{d.anio}</strong>
              <span>{d.artistName}</span>
            </>
          );
          return (
            <li key={d.anio} className="pt-anio">
              {p ? <a href={rutaEpoca(p.from, p.to)} aria-label={`Ver tu ${d.anio}: ${d.artistName}`}>{contenido}</a> : <div>{contenido}</div>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
