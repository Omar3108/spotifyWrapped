import { useEffect } from "react";
import { Cover } from "../components/Cover.jsx";
import { Panel } from "../components/ui.jsx";
import { numero } from "../format.js";
import { useApi } from "../hooks.js";
import { rutaComparar } from "../hooks/useHashRoute.js";
import { diasDeDiferencia, elegirPareja, ventaja } from "../lib/comparar.js";
import { fechaMedia } from "../lib/dates.js";
import "../styles/comparar.css";

const pct = (x) => `${Math.round((x ?? 0) * 100)} %`;

export default function Comparar({ perfiles, activo, a, b, local }) {
  const pareja = elegirPareja(perfiles, activo?.id, a, b);

  // La URL refleja siempre la pareja que se ve, para poder compartirla o recargar.
  useEffect(() => {
    if (pareja && (pareja.a !== a || pareja.b !== b)) {
      window.history.replaceState(window.history.state, "", rutaComparar(pareja.a, pareja.b));
    }
  }, [pareja?.a, pareja?.b, a, b]); // eslint-disable-line react-hooks/exhaustive-deps

  const estado = useApi(pareja ? "compare" : null, pareja ?? undefined);

  if (!pareja) {
    return (
      <main className="sin-datos">
        <p className="eyebrow">Comparar</p>
        <h1>Hacen falta dos perfiles con historial</h1>
        <p className="sd-texto">Cuando haya al menos dos perfiles con su historial cargado, aquí verás lo que tienen en común.</p>
        {local && <a className="sd-boton" href="#/datos">Gestionar perfiles</a>}
      </main>
    );
  }

  const conDatos = perfiles.filter((p) => p.reproducciones > 0);
  const cambiar = (lado, id) => {
    const otro = lado === "a" ? pareja.b : pareja.a;
    // Elegir en un lado el perfil que está en el otro equivale a intercambiarlos.
    const [na, nb] = lado === "a" ? [id, id === otro ? pareja.a : otro] : [id === otro ? pareja.b : otro, id];
    window.location.hash = rutaComparar(na, nb);
  };

  return (
    <main className="comparar">
      <header className="cp-cabecera">
        <p className="eyebrow">Comparar perfiles</p>
        <div className="cp-selectores">
          <Selector etiqueta="Primer perfil" valor={pareja.a} perfiles={conDatos} onChange={(id) => cambiar("a", id)} />
          <button type="button" className="cp-intercambiar" aria-label="Intercambiar perfiles"
            onClick={() => { window.location.hash = rutaComparar(pareja.b, pareja.a); }}>⇄</button>
          <Selector etiqueta="Segundo perfil" valor={pareja.b} perfiles={conDatos} onChange={(id) => cambiar("b", id)} />
        </div>
      </header>

      <Panel state={estado}>
        {estado.data && <Resultado c={estado.data} />}
      </Panel>
    </main>
  );
}

function Selector({ etiqueta, valor, perfiles, onChange }) {
  return (
    <label className="cp-selector">
      <span className="cp-selector-etiqueta">{etiqueta}</span>
      <select value={valor} onChange={(e) => onChange(Number(e.target.value))}>
        {perfiles.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
      </select>
    </label>
  );
}

function Resultado({ c }) {
  const { a, b, descubrimientos: d } = c;
  // Quien empezó a registrar antes es quien tiene artistas "sin comparar".
  const antes = a.primera <= b.primera ? a : b;
  const despues = antes === a ? b : a;

  return (
    <>
      <section className="cp-hero" aria-labelledby="cp-titulo">
        <h1 id="cp-titulo">{a.nombre} <span className="cp-y">y</span> {b.nombre}</h1>
        <p className="cp-desde">
          Desde el {fechaMedia(c.desde)}, cuando empiezan los dos historiales.
        </p>
        <div className="cp-coberturas">
          <Cobertura valor={c.coberturaB} quien={b.nombre} otro={a.nombre} />
          <Cobertura valor={c.coberturaA} quien={a.nombre} otro={b.nombre} />
        </div>
        <dl className="cp-cifras">
          <div><dt>Artistas en común</dt><dd className="tabular">{numero(c.artistasEnComun)}</dd>
            <p>de {numero(a.artistas)} de {a.nombre} y {numero(b.artistas)} de {b.nombre}</p></div>
          <div><dt>Canciones en común</dt><dd className="tabular">{numero(c.cancionesEnComun)}</dd>
            <p>de {numero(a.canciones)} y {numero(b.canciones)}</p></div>
        </dl>
      </section>

      {c.artistas.length > 0 && (
        <section className="cp-seccion" aria-labelledby="cp-artistas">
          <h2 id="cp-artistas">Los artistas que comparten</h2>
          <p className="cp-nota">Primero los que pesan para los dos, no los que suman más: un artista que uno escucha a diario y el otro una vez no cuenta como compartido.</p>
          <Lista filas={c.artistas} a={a} b={b} artista />
        </section>
      )}

      {c.canciones.length > 0 && (
        <section className="cp-seccion" aria-labelledby="cp-canciones">
          <h2 id="cp-canciones">Las canciones de los dos</h2>
          <Lista filas={c.canciones} a={a} b={b} />
        </section>
      )}

      <section className="cp-seccion" aria-labelledby="cp-primero">
        <h2 id="cp-primero">¿Quién llegó primero?</h2>
        <div className="cp-marcador" role="group" aria-label="Artistas descubiertos antes">
          <div className="cp-marca"><strong className="tabular">{d.primeroA}</strong><span>{a.nombre} antes</span></div>
          <div className="cp-marca empate"><strong className="tabular">{d.mismoDia}</strong><span>el mismo día</span></div>
          <div className="cp-marca"><strong className="tabular">{d.primeroB}</strong><span>{b.nombre} antes</span></div>
        </div>
        {d.sinComparar > 0 && (
          <p className="cp-nota">
            Quedan fuera {numero(d.sinComparar)} artistas que {antes.nombre} ya escuchaba antes del {fechaMedia(despues.primera)},
            cuando empieza el historial de {despues.nombre}: no se puede saber si {despues.nombre} ya los conocía.
          </p>
        )}
        <div className="cp-descubiertos">
          <Descubiertos lista={c.descubiertosPorA} quien={a} otro={b} ladoA />
          <Descubiertos lista={c.descubiertosPorB} quien={b} otro={a} />
        </div>
      </section>
    </>
  );
}

function Cobertura({ valor, quien, otro }) {
  return (
    <div className="cp-cobertura">
      <strong className="tabular">{pct(valor)}</strong>
      <p>de lo que escucha {quien} es de artistas que {otro} también escucha</p>
    </div>
  );
}

function Lista({ filas, a, b, artista = false }) {
  const maxA = Math.max(...filas.map((f) => f.reproduccionesA), 1);
  const maxB = Math.max(...filas.map((f) => f.reproduccionesB), 1);
  return (
    <ol className="cp-lista">
      {filas.map((f, i) => (
        <li key={`${f.nombre}|${f.artistName}`} className="cp-fila">
          <span className="cp-pos tabular">{i + 1}</span>
          <Cover uri={f.coverUri} artistId={artista ? f.artistId : undefined} nombre={f.nombre} />
          <span className="cp-fila-texto">
            <strong>{f.nombre}</strong>
            {!artista && <span>{f.artistName}</span>}
          </span>
          <span className="cp-barras">
            <Barra nombre={a.nombre} n={f.reproduccionesA} max={maxA} />
            <Barra nombre={b.nombre} n={f.reproduccionesB} max={maxB} segundo />
          </span>
        </li>
      ))}
    </ol>
  );
}

function Barra({ nombre, n, max, segundo = false }) {
  return (
    <span className={`cp-barra ${segundo ? "segundo" : ""}`}>
      <span className="cp-barra-nombre">{nombre}</span>
      <span className="cp-barra-pista" aria-hidden="true">
        <span style={{ width: `${Math.max(2, (n / max) * 100)}%` }} />
      </span>
      <span className="cp-barra-n tabular">{numero(n)}</span>
    </span>
  );
}

function Descubiertos({ lista, quien, otro, ladoA = false }) {
  return (
    <div className="cp-columna">
      <h3>{quien.nombre} los escuchó antes</h3>
      {lista.length === 0 ? (
        <p className="cp-nota">Ningún artista en común llegó primero a {quien.nombre}.</p>
      ) : (
        <ul>
          {lista.map((x) => {
            const suya = ladoA ? x.primeraA : x.primeraB;
            const delOtro = ladoA ? x.primeraB : x.primeraA;
            return (
              <li key={x.artistId} className="cp-descubierto">
                <Cover uri={x.coverUri} artistId={x.artistId} nombre={x.nombre} />
                <span>
                  <strong>{x.nombre}</strong>
                  <span>
                    {ventaja(diasDeDiferencia(suya, delOtro))} antes · {quien.nombre} el {fechaMedia(suya)}, {otro.nombre} el {fechaMedia(delOtro)}
                  </span>
                  <span>{otro.nombre} lo ha escuchado {numero(x.reproduccionesDelOtro)} {x.reproduccionesDelOtro === 1 ? "vez" : "veces"}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
