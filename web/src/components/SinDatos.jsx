export const PASOS = [
  "En Spotify, entra a tu cuenta y abre «Privacidad de la cuenta».",
  "En «Descargar tus datos», marca «Historial de reproducción ampliado» y confirma por correo. El export básico no sirve.",
  "Cuando llegue el correo (puede tardar hasta 30 días), descarga el .zip y súbelo aquí sin descomprimirlo.",
];

const TEXTOS = {
  "sin-perfiles": (local) => ({
    eyebrow: "Para empezar",
    titulo: "Aún no hay perfiles",
    texto: local
      ? "Crea el primero con solo un nombre y sube después el historial de Spotify."
      : "Quien administra esta página todavía no ha creado ningún perfil.",
    accion: local ? "Crear un perfil" : null,
  }),
  "sin-datos": (local, perfil) => ({
    eyebrow: perfil?.nombre,
    titulo: `${perfil?.nombre} aún no tiene datos`,
    texto: local
      ? "Sube el historial ampliado de Spotify para ver su Wrapped."
      : "Todavía no se ha cargado el historial de este perfil.",
    accion: local ? "Subir historial" : null,
  }),
  "solo-local": () => ({
    eyebrow: "Gestión",
    titulo: "Solo disponible en el equipo local",
    texto: "Crear perfiles y cargar o borrar datos solo se puede hacer desde el equipo donde corre la página.",
    accion: null,
  }),
};

/** Lo que se muestra cuando no hay nada que mostrar, en lugar de una página vacía. */
export function SinDatos({ tipo, perfil, local }) {
  const t = TEXTOS[tipo](local, perfil);
  return (
    <main className="sin-datos">
      {t.eyebrow && <p className="eyebrow">{t.eyebrow}</p>}
      <h1>{t.titulo}</h1>
      <p className="sd-texto">{t.texto}</p>
      {t.accion && <a className="sd-boton" href="#/datos">{t.accion}</a>}
      {local && tipo !== "solo-local" && (
        <details className="sd-pasos">
          <summary>¿Cómo pido el historial a Spotify?</summary>
          <ol>{PASOS.map((p) => <li key={p}>{p}</li>)}</ol>
        </details>
      )}
    </main>
  );
}
