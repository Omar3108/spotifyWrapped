import { useRef } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DIAS, ORDEN_DIAS, horaTexto, numero } from "../../format.js";
import { CON_MOVIMIENTO, gsap, useGSAP } from "../../lib/gsap.js";
import { CUADRICULA, EJE, VERDE, tooltipProps } from "../chartStyle.js";
import { revelar } from "../custom-wrapped/animaciones.js";

export function Habitos({ horas, semana }) {
  const raiz = useRef(null);
  const horasData = horas.map((h) => ({ ...h, etiqueta: horaTexto(h.horaDelDia) }));
  const semanaData = ORDEN_DIAS.map((d) => {
    const fila = semana.find((x) => x.diaSemana === d);
    return { dia: DIAS[d], minutos: Math.round(fila?.minutos ?? 0) };
  });
  const horaPico = horas.reduce((a, h) => (h.minutos > (a?.minutos ?? 0) ? h : a), null);
  const diaPico = semanaData.reduce((a, d) => (d.minutos > (a?.minutos ?? 0) ? d : a), null);

  useGSAP(
    () => {
      revelar(".pt-habito-texto", ".pt-habitos");
      const mm = gsap.matchMedia();
      mm.add(CON_MOVIMIENTO, () => {
        gsap.utils.toArray(".pt-habito").forEach((el, i) => {
          gsap.fromTo(el, { clipPath: "inset(0 100% 0 0)" }, {
            clipPath: "inset(0 0% 0 0)", duration: 1.1, delay: i * 0.12, ease: "power2.inOut", clearProps: "clipPath",
            scrollTrigger: { trigger: el, start: "top 82%", end: "+=1", once: true },
          });
        });
      });
    },
    { scope: raiz }
  );

  return (
    <section ref={raiz} id="habitos" className="pt-seccion" aria-labelledby="habitos-titulo">
      <h2 id="habitos-titulo">Tus hábitos</h2>
      {horaPico && diaPico && (
        <p className="pt-texto pt-habito-texto">
          Tu hora fuerte son las {horaTexto(horaPico.horaDelDia)} y tu día favorito, el {diaPico.dia.toLowerCase()}.
        </p>
      )}
      <div className="pt-habitos">
        <div className="pt-habito" role="img" aria-label="Minutos escuchados por hora del día">
          <h3 className="pt-subtitulo">Hora del día</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={horasData} margin={{ top: 10, right: 16, left: 16, bottom: 0 }}>
              <defs>
                <linearGradient id="relleno-hora" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={VERDE} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={VERDE} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={CUADRICULA} />
              <XAxis dataKey="etiqueta" tick={EJE} axisLine={false} tickLine={false} interval={2} />
              <YAxis hide />
              <Tooltip {...tooltipProps} formatter={(v) => [`${numero(v)} min`, "Escuchados"]} />
              <Area type="monotone" dataKey="minutos" stroke={VERDE} strokeWidth={2} fill="url(#relleno-hora)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="pt-habito" role="img" aria-label="Minutos escuchados por día de la semana">
          <h3 className="pt-subtitulo">Día de la semana</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={semanaData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={CUADRICULA} />
              <XAxis dataKey="dia" tick={{ ...EJE, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip {...tooltipProps} cursor={{ fill: "rgba(255,255,255,0.05)" }} formatter={(v) => [`${numero(v)} min`, "Escuchados"]} />
              <Bar dataKey="minutos" radius={[6, 6, 0, 0]} fill={VERDE} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
