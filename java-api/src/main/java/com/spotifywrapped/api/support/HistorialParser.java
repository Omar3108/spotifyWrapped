package com.spotifywrapped.api.support;

import java.io.FilterInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import tools.jackson.core.JsonParser;
import tools.jackson.core.JsonToken;
import tools.jackson.core.ObjectReadContext;
import tools.jackson.core.json.JsonFactory;

/**
 * Lee el .zip del «Historial de reproducción ampliado» de Spotify sin guardarlo en disco.
 * Recorre todas las entradas Streaming_History_Audio_*.json, vengan en la raíz o en una carpeta,
 * y aplica las reglas de python/etl/parser.py: solo música, al menos 30 s y hora de Caracas.
 * Del registro solo se conservan los campos que usa la base: el export trae también la IP.
 */
public final class HistorialParser {

    public static final long MAX_BYTES_DESCOMPRIMIDOS = 3L * 1024 * 1024 * 1024;
    public static final int MAX_FILAS = 3_000_000;
    public static final int UMBRAL_MS = 30_000;

    private static final String PEDIR_AMPLIADO = "Pide el «Historial de reproducción ampliado».";
    private static final ZoneId CARACAS = ZoneId.of("America/Caracas");
    private static final Pattern AUDIO =
            Pattern.compile("(^|.*/)Streaming_History_Audio_[^/]*\\.json$", Pattern.CASE_INSENSITIVE);
    private static final Pattern BASICO =
            Pattern.compile("(^|.*/)StreamingHistory[^/]*\\.json$", Pattern.CASE_INSENSITIVE);
    private static final JsonFactory JSON = new JsonFactory();

    private HistorialParser() {
    }

    public record Resultado(List<Reproduccion> filas, int archivos, long registros) {
    }

    /** Con el zip abierto en `entrada`. Lanza HistorialInvalidoException si no es un export utilizable. */
    public static Resultado leer(InputStream entrada) throws IOException {
        List<Reproduccion> filas = new ArrayList<>();
        Map<String, String> internados = new HashMap<>();
        long[] bytes = {0};
        int archivos = 0;
        int entradas = 0;
        boolean basico = false;
        long registros = 0;

        try (ZipInputStream zip = new ZipInputStream(entrada)) {
            ZipEntry e;
            while ((e = zip.getNextEntry()) != null) {
                entradas++;
                String nombre = e.getName().replace("\\", "/");
                if (e.isDirectory() || nombre.contains("__MACOSX/")) {
                    continue;
                }
                if (BASICO.matcher(nombre).matches()) {
                    basico = true;
                }
                if (!AUDIO.matcher(nombre).matches()) {
                    continue; // vídeo, podcasts, PDF, etc.
                }
                archivos++;
                registros += leerArchivo(contar(zip, bytes), nombre, filas, internados);
            }
        }

        if (entradas == 0) {
            throw new HistorialInvalidoException("El archivo no es un .zip válido. Sube el .zip tal como lo envía Spotify.");
        }
        if (archivos == 0) {
            throw new HistorialInvalidoException(basico
                    ? "Este es el historial básico de Spotify (StreamingHistory*.json) y no trae lo necesario. " + PEDIR_AMPLIADO
                    : "El .zip no contiene archivos Streaming_History_Audio_*.json. " + PEDIR_AMPLIADO);
        }
        if (filas.isEmpty()) {
            throw new HistorialInvalidoException("Los archivos no tienen reproducciones de música de 30 segundos o más.");
        }
        filas.sort(Comparator.comparing(Reproduccion::playedAt));
        return new Resultado(filas, archivos, registros);
    }

    /** Evita que el parser cierre el zip al terminar un archivo y limita lo que puede expandirse. */
    private static InputStream contar(InputStream zip, long[] bytes) {
        return new FilterInputStream(zip) {
            @Override
            public int read() throws IOException {
                int b = super.read();
                if (b >= 0) {
                    sumar(1);
                }
                return b;
            }

            @Override
            public int read(byte[] buf, int off, int len) throws IOException {
                int n = super.read(buf, off, len);
                if (n > 0) {
                    sumar(n);
                }
                return n;
            }

            private void sumar(int n) {
                bytes[0] += n;
                if (bytes[0] > MAX_BYTES_DESCOMPRIMIDOS) {
                    throw new HistorialInvalidoException("El contenido del .zip es demasiado grande.");
                }
            }

            @Override
            public void close() {
                // el zip sigue abierto para leer la siguiente entrada
            }
        };
    }

    private static long leerArchivo(InputStream in, String nombre, List<Reproduccion> filas,
                                    Map<String, String> internados) {
        long registros = 0;
        try (JsonParser p = JSON.createParser(ObjectReadContext.empty(), in)) {
            if (p.nextToken() != JsonToken.START_ARRAY) {
                throw new HistorialInvalidoException(nombre + " no es una lista de reproducciones.");
            }
            while (p.nextToken() == JsonToken.START_OBJECT) {
                registros++;
                Reproduccion r = leerRegistro(p, nombre, internados);
                if (r != null) {
                    filas.add(r);
                    if (filas.size() > MAX_FILAS) {
                        throw new HistorialInvalidoException("El historial tiene demasiadas reproducciones.");
                    }
                }
            }
        } catch (HistorialInvalidoException e) {
            throw e;
        } catch (RuntimeException e) {
            throw new HistorialInvalidoException(nombre + " no se pudo leer: no es un JSON válido.");
        }
        return registros;
    }

    private static Reproduccion leerRegistro(JsonParser p, String archivo, Map<String, String> internados) {
        String ts = null;
        long ms = 0;
        String cancion = null;
        String artista = null;
        String album = null;
        String uri = null;
        String inicio = null;
        String fin = null;
        Boolean shuffle = null;
        Boolean skipped = null;

        while (p.nextToken() == JsonToken.PROPERTY_NAME) {
            String campo = p.currentName();
            JsonToken valor = p.nextToken();
            switch (campo) {
                case "ts" -> ts = texto(p, valor);
                case "ms_played" -> ms = valor.isNumeric() ? p.getLongValue() : 0;
                case "master_metadata_track_name" -> cancion = texto(p, valor);
                case "master_metadata_album_artist_name" -> artista = texto(p, valor);
                case "master_metadata_album_album_name" -> album = texto(p, valor);
                case "spotify_track_uri" -> uri = texto(p, valor);
                case "reason_start" -> inicio = texto(p, valor);
                case "reason_end" -> fin = texto(p, valor);
                case "shuffle" -> shuffle = logico(valor);
                case "skipped" -> skipped = logico(valor);
                case "endTime", "msPlayed", "trackName", "artistName" ->
                        throw new HistorialInvalidoException(archivo + " es del historial básico, que no trae lo necesario. "
                                + PEDIR_AMPLIADO);
                default -> p.skipChildren();
            }
        }

        if (cancion == null || cancion.isBlank() || uri == null || ts == null || ms < UMBRAL_MS) {
            return null; // podcasts, audiolibros y escuchas de menos de 30 s
        }
        return new Reproduccion(
                OffsetDateTime.parse(ts).atZoneSameInstant(CARACAS).toLocalDateTime(),
                (int) Math.min(ms, Integer.MAX_VALUE),
                internar(recortar(cancion, 255), internados),
                internar(recortar(artista, 255), internados),
                internar(recortar(album, 255), internados),
                internar(recortar(uri, 100), internados),
                internar(recortar(inicio, 50), internados),
                internar(recortar(fin, 50), internados),
                shuffle, skipped);
    }

    private static String texto(JsonParser p, JsonToken valor) {
        if (valor == JsonToken.VALUE_NULL) {
            return null;
        }
        if (valor == JsonToken.START_OBJECT || valor == JsonToken.START_ARRAY) {
            p.skipChildren();
            return null;
        }
        return p.getString();
    }

    private static Boolean logico(JsonToken valor) {
        return valor == JsonToken.VALUE_TRUE ? Boolean.TRUE : valor == JsonToken.VALUE_FALSE ? Boolean.FALSE : null;
    }

    private static String recortar(String s, int max) {
        return s == null || s.length() <= max ? s : s.substring(0, max);
    }

    /** Los mismos textos se repiten cientos de miles de veces; compartirlos ahorra memoria. */
    private static String internar(String s, Map<String, String> internados) {
        if (s == null) {
            return null;
        }
        String previo = internados.putIfAbsent(s, s);
        return previo == null ? s : previo;
    }
}
