package com.spotifywrapped.api.service;

import java.net.URI;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

import jakarta.annotation.PreDestroy;

/**
 * Portadas con caché persistente en track_art.
 *
 * Primero se resuelve lo guardado y solo se consulta a Spotify lo que falta, con
 * concurrencia y tiempo acotados. Va en su propio endpoint: las estadísticas nunca
 * dependen de una llamada externa. Lo que no llegue a tiempo se omite y el front
 * muestra la portada generada.
 */
@Service
public class ArtService {

    public static final int MAXIMO_URIS = 30;

    private static final Logger log = LoggerFactory.getLogger(ArtService.class);
    private static final Pattern URI_PISTA = Pattern.compile("^spotify:track:([A-Za-z0-9]{22})$");
    private static final int DIAS_ANTES_DE_REINTENTAR = 7;
    private static final long ESPERA_MAXIMA_MS = 4_000;

    private final NamedParameterJdbcTemplate db;
    private final OEmbedClient oembed;
    private final ExecutorService hilos = Executors.newFixedThreadPool(4);

    public ArtService(NamedParameterJdbcTemplate db, OEmbedClient oembed) {
        this.db = db;
        this.oembed = oembed;
    }

    public static boolean uriValida(String uri) {
        return uri != null && URI_PISTA.matcher(uri).matches();
    }

    /** Solo se guardan imágenes del CDN de Spotify, por si la respuesta trajera otra URL. */
    public static boolean imagenPermitida(String url) {
        try {
            URI u = URI.create(url);
            String host = u.getHost() == null ? "" : u.getHost().toLowerCase(Locale.ROOT);
            return "https".equals(u.getScheme()) && (host.endsWith(".spotifycdn.com") || host.equals("i.scdn.co"));
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    public Map<String, String> portadas(List<String> uris) {
        List<String> validas = uris.stream().filter(ArtService::uriValida).distinct().limit(MAXIMO_URIS).toList();
        if (validas.isEmpty()) {
            return Map.of();
        }

        Map<String, String> resultado = new LinkedHashMap<>();
        List<String> resueltas = new ArrayList<>();
        LocalDateTime limite = LocalDateTime.now().minusDays(DIAS_ANTES_DE_REINTENTAR);
        db.query("SELECT spotify_uri, image_url, fetched_at FROM track_art WHERE spotify_uri IN (:uris)",
                new MapSqlParameterSource("uris", validas),
                rs -> {
                    String uri = rs.getString(1);
                    String imagen = rs.getString(2);
                    if (imagen != null) {
                        resultado.put(uri, imagen);
                        resueltas.add(uri);
                    } else if (rs.getTimestamp(3).toLocalDateTime().isAfter(limite)) {
                        resueltas.add(uri);
                    }
                });

        List<String> faltan = validas.stream().filter(u -> !resueltas.contains(u)).toList();
        if (!faltan.isEmpty()) {
            resultado.putAll(consultarSpotify(faltan));
        }
        return resultado;
    }

    private Map<String, String> consultarSpotify(List<String> uris) {
        Map<String, String> nuevas = Collections.synchronizedMap(new LinkedHashMap<>());
        List<Callable<Void>> tareas = uris.stream().<Callable<Void>>map(uri -> () -> {
            consultarUna(uri).ifPresent(imagen -> nuevas.put(uri, imagen));
            return null;
        }).toList();
        try {
            hilos.invokeAll(tareas, ESPERA_MAXIMA_MS, TimeUnit.MILLISECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        synchronized (nuevas) {
            return new LinkedHashMap<>(nuevas);
        }
    }

    private Optional<String> consultarUna(String uri) {
        Matcher m = URI_PISTA.matcher(uri);
        if (!m.matches()) {
            return Optional.empty();
        }
        try {
            Optional<String> imagen = oembed.portada(m.group(1)).filter(ArtService::imagenPermitida);
            guardar(uri, imagen.orElse(null));
            return imagen;
        } catch (RuntimeException e) {
            // Error temporal: no se guarda y se reintentará en la próxima visita.
            log.debug("oEmbed falló para {}: {}", uri, e.toString());
            return Optional.empty();
        }
    }

    private void guardar(String uri, String imagen) {
        MapSqlParameterSource p = new MapSqlParameterSource()
                .addValue("uri", uri)
                .addValue("imagen", imagen, java.sql.Types.NVARCHAR)
                .addValue("ahora", Timestamp.valueOf(LocalDateTime.now()));
        db.update("""
                MERGE track_art AS destino
                USING (SELECT :uri AS spotify_uri) AS origen ON destino.spotify_uri = origen.spotify_uri
                WHEN MATCHED THEN UPDATE SET image_url = :imagen, fetched_at = :ahora
                WHEN NOT MATCHED THEN INSERT (spotify_uri, image_url, fetched_at) VALUES (:uri, :imagen, :ahora);
                """, p);
    }

    @PreDestroy
    void cerrar() {
        hilos.shutdownNow();
    }
}
