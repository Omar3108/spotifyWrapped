// Base de la API Spring Boot. Se puede cambiar con VITE_API_BASE en un archivo .env
const BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8080/api/wrapped";

export async function get(path, params = {}, { signal } = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/${path}${qs ? `?${qs}` : ""}`, { signal });
  if (!res.ok) throw new Error(`Error ${res.status} al consultar ${path}`);
  return res.json();
}
