package com.spotifywrapped.api.service;

import java.sql.Timestamp;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

import com.spotifywrapped.api.service.OEmbedClient.ArtistaSpotify;

import jakarta.annotation.PreDestroy;

/**
 * Fotos de artista con caché persistente en artist_art.
 *
 * El historial solo trae la canción, así que el artista se obtiene de su página y la foto
 * de oEmbed. Una canción puede tener varios artistas: la foto solo se acepta si el título
 * coincide con el nombre guardado, para no mostrar nunca a otra persona.
 *
 * A diferencia de las portadas, cada artista necesita varias llamadas. Lo que no termine a
 * tiempo sigue en segundo plano y queda guardado para la próxima visita.
 */
@Service
public class ArtistArtService {

    public static final int MAXIMO_IDS = 30;

    private static final Logger log = LoggerFactory.getLogger(ArtistArtService.class);
    private static final int CANCIONES_A_PROBAR = 3;
    private static final int ARTISTAS_POR_CANCION = 4;
    private static final int DIAS_ANTES_DE_REINTENTAR = 7;
    private static final long ESPERA_MAXIMA_MS = 4_000;
    private static final String PREFIJO_PISTA = "spotify:track:";

    private final NamedParameterJdbcTemplate db;
    private final OEmbedClient oembed;
    private final ExecutorService hilos = Executors.newFixedThreadPool(4);
    private final Set<Integer> enCurso = ConcurrentHashMap.newKeySet();

    public ArtistArtService(NamedParameterJdbcTemplate db, OEmbedClient oembed) {
        this.db = db;
        this.oembed = oembed;
    }

    public Map<Integer, String> fotos(List<Integer> ids) {
        List<Integer> validos = ids.stream().filter(id -> id != null && id > 0).distinct().limit(MAXIMO_IDS).toList();
        if (validos.isEmpty()) {
            return Map.of();
        }

        Map<Integer, String> resultado = new LinkedHashMap<>();
        Set<Integer> resueltos = new HashSet<>();
        LocalDateTime limite = LocalDateTime.now().minusDays(DIAS_ANTES_DE_REINTENTAR);
        db.query("SELECT artist_id, image_url, fetched_at FROM artist_art WHERE artist_id IN (:ids)",
                new MapSqlParameterSource("ids", validos),
                rs -> {
                    int id = rs.getInt(1);
                    String imagen = rs.getString(2);
                    if (imagen != null) {
                        resultado.put(id, imagen);
                        resueltos.add(id);
                    } else if (rs.getTimestamp(3).toLocalDateTime().isAfter(limite)) {
                        resueltos.add(id);
                    }
                });

        List<Integer> faltan = validos.stream().filter(id -> !resueltos.contains(id)).toList();
        if (!faltan.isEmpty()) {
            resultado.putAll(consultarSpotify(faltan));
        }
        return resultado;
    }

    private Map<Integer, String> consultarSpotify(Collection<Integer> ids) {
        Map<Integer, String> nuevas = new ConcurrentHashMap<>();
        List<CompletableFuture<Void>> tareas = new ArrayList<>();
        for (Integer id : ids) {
            if (enCurso.add(id)) {
                tareas.add(CompletableFuture
                        .runAsync(() -> resolver(id).ifPresent(imagen -> nuevas.put(id, imagen)), hilos)
                        .whenComplete((r, e) -> enCurso.remove(id)));
            }
        }
        try {
            CompletableFuture.allOf(tareas.toArray(CompletableFuture[]::new))
                    .get(ESPERA_MAXIMA_MS, TimeUnit.MILLISECONDS);
        } catch (TimeoutException | ExecutionException e) {
            log.debug("Fotos de artista pendientes: {}", e.toString());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        return new LinkedHashMap<>(nuevas);
    }

    /** Busca y guarda la foto. Un error temporal no se guarda: se reintentará en otra visita. */
    Optional<String> resolver(int id) {
        try {
            List<String[]> canciones = cancionesDe(id);
            if (canciones.isEmpty()) {
                return Optional.empty();
            }
            String nombre = canciones.get(0)[1];
            List<String> pistas = canciones.stream().map(c -> c[0]).filter(ArtService::uriValida)
                    .map(uri -> uri.substring(PREFIJO_PISTA.length())).toList();
            Optional<ArtistaSpotify> artista = buscar(nombre, pistas);
            Optional<String> imagen = artista.map(ArtistaSpotify::imagen).filter(ArtService::imagenPermitida);
            guardar(id, artista.map(ArtistaSpotify::id).orElse(null), imagen.orElse(null));
            return imagen;
        } catch (RuntimeException e) {
            log.debug("No se pudo resolver la foto del artista {}: {}", id, e.toString());
            return Optional.empty();
        }
    }

    /** El artista de esas canciones cuyo título coincide con el nombre, si hay alguno. */
    Optional<ArtistaSpotify> buscar(String nombre, List<String> pistas) {
        Set<String> probados = new LinkedHashSet<>();
        for (String pista : pistas) {
            for (String idArtista : oembed.idsArtistas(pista).stream().limit(ARTISTAS_POR_CANCION).toList()) {
                if (probados.add(idArtista)) {
                    Optional<ArtistaSpotify> artista = oembed.artista(idArtista)
                            .filter(a -> mismoNombre(a.titulo(), nombre));
                    if (artista.isPresent()) {
                        return artista;
                    }
                }
            }
        }
        return Optional.empty();
    }

    static boolean mismoNombre(String titulo, String nombre) {
        return titulo != null && nombre != null
                && normalizar(titulo).equalsIgnoreCase(normalizar(nombre));
    }

    private static String normalizar(String texto) {
        return Normalizer.normalize(texto.trim(), Normalizer.Form.NFC);
    }

    /** Sus canciones más escuchadas entre todos los perfiles: la foto es la misma para todos. */
    private List<String[]> cancionesDe(int id) {
        return db.query("""
                SELECT TOP (:maximo) t.spotify_uri, a.artist_name
                FROM tracks t
                JOIN artists a ON a.artist_id = t.artist_id
                JOIN plays p ON p.track_id = t.track_id
                WHERE t.artist_id = :id AND t.spotify_uri IS NOT NULL
                GROUP BY t.spotify_uri, a.artist_name
                ORDER BY COUNT(*) DESC, t.spotify_uri
                """,
                new MapSqlParameterSource().addValue("id", id).addValue("maximo", CANCIONES_A_PROBAR),
                (rs, fila) -> new String[] { rs.getString(1), rs.getString(2) });
    }

    private void guardar(int id, String idSpotify, String imagen) {
        MapSqlParameterSource p = new MapSqlParameterSource()
                .addValue("id", id)
                .addValue("spotify", idSpotify, java.sql.Types.NVARCHAR)
                .addValue("imagen", imagen, java.sql.Types.NVARCHAR)
                .addValue("ahora", Timestamp.valueOf(LocalDateTime.now()));
        db.update("""
                MERGE artist_art AS destino
                USING (SELECT :id AS artist_id) AS origen ON destino.artist_id = origen.artist_id
                WHEN MATCHED THEN UPDATE SET spotify_artist_id = :spotify, image_url = :imagen, fetched_at = :ahora
                WHEN NOT MATCHED THEN INSERT (artist_id, spotify_artist_id, image_url, fetched_at)
                    VALUES (:id, :spotify, :imagen, :ahora);
                """, p);
    }

    @PreDestroy
    void cerrar() {
        hilos.shutdownNow();
    }
}
