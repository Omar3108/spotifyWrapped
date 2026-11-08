package com.spotifywrapped.api.repository;

import java.sql.Date;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Consultas de la comparación entre dos perfiles. Devuelven filas en bruto; los cálculos (coberturas, rankings,
 * descubrimientos) los hace CompareService para poder probarlos sin base de datos.
 *
 * Un artista es su artist_id (artist_name es único en artists). Una canción es título + artista, igual que
 * /top-tracks: las versiones con distinta URI cuentan como la misma canción.
 */
@Repository
public class CompareRepository {

    /** Nombre del perfil y su primera reproducción (null si no tiene historial). */
    public record Perfil(int id, String nombre, LocalDateTime primera) {
    }

    /** Totales de un perfil desde una fecha. */
    public record Totales(long reproducciones, long artistas, long canciones) {
    }

    /** Un artista que aparece en los dos historiales. n* cuenta desde el período común; primera* es de siempre. */
    public record FilaArtista(int artistId, String nombre, String coverUri, long nA, LocalDate primeraA, long nB, LocalDate primeraB) {
    }

    /** Una canción que los dos escucharon en el período común. */
    public record FilaCancion(int trackId, String nombre, String artistName, String coverUri, long nA, long nB) {
    }

    private final JdbcTemplate db;

    public CompareRepository(JdbcTemplate db) {
        this.db = db;
    }

    public Optional<Perfil> perfil(int id) {
        return db.query("""
                SELECT u.user_id, u.nombre, MIN(p.played_at) AS primera
                FROM users u
                LEFT JOIN plays p ON p.user_id = u.user_id
                WHERE u.user_id = ?
                GROUP BY u.user_id, u.nombre
                """,
                (rs, i) -> new Perfil(rs.getInt(1), rs.getString(2), fecha(rs.getTimestamp(3))), id)
                .stream().findFirst();
    }

    public Totales totales(int perfil, LocalDateTime desde) {
        return db.queryForObject("""
                SELECT COUNT(*),
                       COUNT(DISTINCT t.artist_id),
                       (SELECT COUNT(*) FROM (
                            SELECT DISTINCT t2.track_name, t2.artist_id
                            FROM plays p2
                            JOIN tracks t2 ON t2.track_id = p2.track_id
                            WHERE p2.user_id = ? AND p2.played_at >= ?) c)
                FROM plays p
                JOIN tracks t ON t.track_id = p.track_id
                WHERE p.user_id = ? AND p.played_at >= ?
                """,
                (rs, i) -> new Totales(rs.getLong(1), rs.getLong(2), rs.getLong(3)),
                perfil, Timestamp.valueOf(desde), perfil, Timestamp.valueOf(desde));
    }

    /** Artistas con al menos una reproducción de cada perfil en todo su historial. */
    public List<FilaArtista> artistas(int a, int b, LocalDateTime desde) {
        Timestamp d = Timestamp.valueOf(desde);
        return db.query("""
                WITH por AS (
                    SELECT p.user_id, t.artist_id,
                           SUM(CASE WHEN p.played_at >= ? THEN 1 ELSE 0 END) AS n,
                           MIN(p.played_at) AS primera
                    FROM plays p
                    JOIN tracks t ON t.track_id = p.track_id
                    WHERE p.user_id IN (?, ?)
                    GROUP BY p.user_id, t.artist_id
                ),
                portada AS (
                    SELECT t.artist_id, t.spotify_uri,
                           ROW_NUMBER() OVER (PARTITION BY t.artist_id ORDER BY COUNT(*) DESC, t.spotify_uri) AS fila
                    FROM plays p
                    JOIN tracks t ON t.track_id = p.track_id
                    WHERE p.user_id IN (?, ?)
                    GROUP BY t.artist_id, t.spotify_uri
                )
                SELECT x.artist_id, ar.artist_name, po.spotify_uri,
                       x.n, CAST(x.primera AS DATE), y.n, CAST(y.primera AS DATE)
                FROM por x
                JOIN por y ON y.artist_id = x.artist_id AND y.user_id = ?
                JOIN artists ar ON ar.artist_id = x.artist_id
                LEFT JOIN portada po ON po.artist_id = x.artist_id AND po.fila = 1
                WHERE x.user_id = ?
                """,
                (rs, i) -> new FilaArtista(rs.getInt(1), rs.getString(2), rs.getString(3),
                        rs.getLong(4), dia(rs.getDate(5)), rs.getLong(6), dia(rs.getDate(7))),
                d, a, b, a, b, b, a);
    }

    /** Canciones (título + artista) que los dos escucharon desde {@code desde}. */
    public List<FilaCancion> canciones(int a, int b, LocalDateTime desde) {
        Timestamp d = Timestamp.valueOf(desde);
        return db.query("""
                WITH base AS (
                    SELECT p.user_id, t.track_id, t.track_name, t.artist_id, t.spotify_uri, COUNT(*) AS n
                    FROM plays p
                    JOIN tracks t ON t.track_id = p.track_id
                    WHERE p.user_id IN (?, ?) AND p.played_at >= ?
                    GROUP BY p.user_id, t.track_id, t.track_name, t.artist_id, t.spotify_uri
                ),
                por AS (
                    SELECT user_id, track_name, artist_id, SUM(n) AS n
                    FROM base
                    GROUP BY user_id, track_name, artist_id
                ),
                version AS (
                    SELECT track_name, artist_id, spotify_uri,
                           MIN(track_id) OVER (PARTITION BY track_name, artist_id) AS id_cancion,
                           ROW_NUMBER() OVER (PARTITION BY track_name, artist_id ORDER BY SUM(n) DESC, track_id) AS fila
                    FROM base
                    GROUP BY track_id, track_name, artist_id, spotify_uri
                )
                SELECT v.id_cancion, x.track_name, ar.artist_name, v.spotify_uri, x.n, y.n
                FROM por x
                JOIN por y ON y.track_name = x.track_name AND y.artist_id = x.artist_id AND y.user_id = ?
                JOIN artists ar ON ar.artist_id = x.artist_id
                JOIN version v ON v.track_name = x.track_name AND v.artist_id = x.artist_id AND v.fila = 1
                WHERE x.user_id = ?
                """,
                (rs, i) -> new FilaCancion(rs.getInt(1), rs.getString(2), rs.getString(3), rs.getString(4),
                        rs.getLong(5), rs.getLong(6)),
                a, b, d, b, a);
    }

    private static LocalDateTime fecha(Timestamp t) {
        return t == null ? null : t.toLocalDateTime();
    }

    private static LocalDate dia(Date d) {
        return d == null ? null : d.toLocalDate();
    }
}
