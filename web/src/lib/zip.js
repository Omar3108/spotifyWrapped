// Empaqueta archivos sueltos en un .zip dentro del navegador, para que el servidor tenga un solo camino
// de entrada. Usa deflate nativo (CompressionStream): 250 MB de JSON suben como unos 15 MB.
// Si el navegador no lo tiene, se guarda sin comprimir.

const TABLA_CRC = (() => {
  const tabla = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabla[n] = c >>> 0;
  }
  return tabla;
})();

export function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = TABLA_CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export const puedeComprimir = () => typeof CompressionStream !== "undefined";

async function deflate(bytes) {
  const flujo = new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(flujo).arrayBuffer());
}

// Fecha y hora MS-DOS fijas (1980-01-01 00:00): el contenido no depende de cuándo se empaquetó.
const DOS_HORA = 0;
const DOS_FECHA = 0x0021;

function cabecera(tamano, escribir) {
  const buffer = new ArrayBuffer(tamano);
  escribir(new DataView(buffer));
  return new Uint8Array(buffer);
}

/** `archivos`: lista de File. `alAvanzar(hechos, total)` se llama tras cada archivo. Devuelve un Blob .zip. */
export async function empaquetar(archivos, alAvanzar = () => {}) {
  const comprimir = puedeComprimir();
  const codificador = new TextEncoder();
  const partes = [];
  const central = [];
  let desplazamiento = 0;

  for (let i = 0; i < archivos.length; i++) {
    const archivo = archivos[i];
    const original = new Uint8Array(await archivo.arrayBuffer());
    const datos = comprimir ? await deflate(original) : original;
    const nombre = codificador.encode(archivo.name);
    const metodo = comprimir ? 8 : 0;
    const crc = crc32(original);

    const local = cabecera(30, (v) => {
      v.setUint32(0, 0x04034b50, true);
      v.setUint16(4, 20, true);
      v.setUint16(6, 0x0800, true); // nombres en UTF-8
      v.setUint16(8, metodo, true);
      v.setUint16(10, DOS_HORA, true);
      v.setUint16(12, DOS_FECHA, true);
      v.setUint32(14, crc, true);
      v.setUint32(18, datos.length, true);
      v.setUint32(22, original.length, true);
      v.setUint16(26, nombre.length, true);
      v.setUint16(28, 0, true);
    });
    partes.push(local, nombre, datos);

    central.push({ nombre, metodo, crc, comprimido: datos.length, original: original.length, desplazamiento });
    desplazamiento += local.length + nombre.length + datos.length;
    alAvanzar(i + 1, archivos.length);
  }

  let tamanoCentral = 0;
  for (const e of central) {
    const entrada = cabecera(46, (v) => {
      v.setUint32(0, 0x02014b50, true);
      v.setUint16(4, 20, true);
      v.setUint16(6, 20, true);
      v.setUint16(8, 0x0800, true);
      v.setUint16(10, e.metodo, true);
      v.setUint16(12, DOS_HORA, true);
      v.setUint16(14, DOS_FECHA, true);
      v.setUint32(16, e.crc, true);
      v.setUint32(20, e.comprimido, true);
      v.setUint32(24, e.original, true);
      v.setUint16(28, e.nombre.length, true);
      v.setUint32(42, e.desplazamiento, true);
    });
    partes.push(entrada, e.nombre);
    tamanoCentral += entrada.length + e.nombre.length;
  }

  partes.push(
    cabecera(22, (v) => {
      v.setUint32(0, 0x06054b50, true);
      v.setUint16(8, central.length, true);
      v.setUint16(10, central.length, true);
      v.setUint32(12, tamanoCentral, true);
      v.setUint32(16, desplazamiento, true);
    })
  );
  return new Blob(partes, { type: "application/zip" });
}
