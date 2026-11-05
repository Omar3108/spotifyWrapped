const VISTAS = [
  { vista: "explorar", href: "#/explorar", texto: "Explorar" },
  { vista: "mi-epoca", href: "#/mi-epoca", texto: "Mi época" },
  { vista: "portada", href: "#inicio", texto: "Mi Wrapped" },
];

export function TopNav({ vista }) {
  return (
    <nav className="topnav" aria-label="Principal">
      <a className="brand" href="#inicio">Wrapped</a>
      <div className="links">
        {VISTAS.map((v) => (
          <a key={v.vista} className={`destacado ${vista === v.vista ? "activo" : ""}`} href={v.href}
            aria-current={vista === v.vista ? "page" : undefined}>{v.texto}</a>
        ))}
      </div>
    </nav>
  );
}
