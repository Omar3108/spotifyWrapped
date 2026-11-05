/** Caché en memoria con límite de entradas. Al llenarse descarta la menos usada. */
export function crearLru(maximo) {
  const mapa = new Map();
  return {
    get(clave) {
      if (!mapa.has(clave)) return undefined;
      const valor = mapa.get(clave);
      mapa.delete(clave);
      mapa.set(clave, valor);
      return valor;
    },
    set(clave, valor) {
      mapa.delete(clave);
      mapa.set(clave, valor);
      if (mapa.size > maximo) mapa.delete(mapa.keys().next().value);
    },
    get size() {
      return mapa.size;
    },
  };
}
