import { PerfilMenu } from "./PerfilMenu.jsx";

const VISTAS = [
  { vista: "explorar", href: "#/explorar", texto: "Explorar" },
  { vista: "mi-epoca", href: "#/mi-epoca", texto: "Mi época" },
  { vista: "portada", href: "#inicio", texto: "Mi Wrapped" },
];

const COMPARAR = { vista: "comparar", href: "#/comparar", texto: "Comparar" };

export function TopNav({ vista, perfiles, activo, local }) {
  // Comparar solo tiene sentido con al menos dos perfiles con historial.
  const conDatos = perfiles?.filter((p) => p.reproducciones > 0).length ?? 0;
  const vistas = conDatos >= 2 ? [...VISTAS.slice(0, 2), COMPARAR, VISTAS[2]] : VISTAS;
  return (
    <nav className="topnav" aria-label="Principal">
      <a className="brand" href="#inicio">Wrapped</a>
      <div className="links">
        {vistas.map((v) => (
          <a key={v.vista} className={`destacado ${vista === v.vista ? "activo" : ""}`} href={v.href}
            aria-current={vista === v.vista ? "page" : undefined}>{v.texto}</a>
        ))}
      </div>
      <PerfilMenu perfiles={perfiles} activo={activo} local={local} />
    </nav>
  );
}
