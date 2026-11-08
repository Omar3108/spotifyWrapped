package com.spotifywrapped.api.repository;

import java.util.List;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import com.spotifywrapped.api.dto.ArtistSearchResult;
import com.spotifywrapped.api.dto.PuntoFila;
import com.spotifywrapped.api.dto.SongHeader;
import com.spotifywrapped.api.dto.SongSearchResult;
import com.spotifywrapped.api.dto.SongTotals;
import com.spotifywrapped.api.dto.SongVersion;
import com.spotifywrapped.api.dto.SongYear;
import com.spotifywrapped.api.model.Play;

/**
 * Consultas del explorador.
 *
 * Canción = mismo título exacto y mismo artista, la misma regla de /top-tracks.
 * Versión = una fila de tracks (una URI). soloVersion = 1 limita a la pista pedida.
 */
public interface TrackQueryRepository extends Repository<Play, Long> {

    @Query(value = """
        WITH coincidencias AS (
            SELECT t.track_id, t.track_name, t.album_name, t.spotify_uri, a.artist_name
            FROM tracks t
            JOIN artists a ON a.artist_id = t.artist_id
            WHERE t.track_name COLLATE Latin1_General_100_CI_AI LIKE :contiene ESCAPE '|'
               OR a.artist_name COLLATE Latin1_General_100_CI_AI LIKE :contiene ESCAPE '|'
        ),
        canciones AS (
            SELECT c.track_id, c.track_name, c.album_name, c.spotify_uri, c.artist_name,
                   COUNT(p.play_id) AS reproducciones
            FROM coincidencias c
            JOIN plays p ON p.track_id = c.track_id AND p.user_id = :perfil
            GROUP BY c.track_id, c.track_name, c.album_name, c.spotify_uri, c.artist_name
        ),
        agrupadas AS (
            SELECT *,
                   MIN(track_id) OVER (PARTITION BY track_name, artist_name) AS track_id_cancion,
                   COUNT(*) OVER (PARTITION BY track_name, artist_name) AS versiones,
                   SUM(reproducciones) OVER (PARTITION BY track_name, artist_name) AS total,
                   ROW_NUMBER() OVER (
                       PARTITION BY track_name, artist_name
                       ORDER BY reproducciones DESC, track_id
                   ) AS orden_version
            FROM canciones
        )
        SELECT track_id_cancion AS trackId,
               track_name AS trackName,
               artist_name AS artistName,
               album_name AS albumName,
               spotify_uri AS spotifyUri,
               versiones,
               total AS reproducciones
        FROM agrupadas
        WHERE orden_version = 1
        ORDER BY
            CASE WHEN track_name COLLATE Latin1_General_100_CI_AI LIKE :empieza ESCAPE '|' THEN 0 ELSE 1 END,
            total DESC,
            track_name,
            artist_name
        OFFSET 0 ROWS FETCH NEXT :limite ROWS ONLY
        """, nativeQuery = true)
    List<SongSearchResult> buscar(@Param("perfil") int perfil,
                                  @Param("contiene") String contiene,
                                  @Param("empieza") String empieza,
                                  @Param("limite") int limite);

    /** Solo artistas que el perfil escuchó, primero los que empiezan por el texto buscado. */
    @Query(value = """
        SELECT TOP (:limite)
               a.artist_id AS artistId,
               a.artist_name AS artistName,
               COUNT(*) AS reproducciones
        FROM artists a
        JOIN tracks t ON t.artist_id = a.artist_id
        JOIN plays p ON p.track_id = t.track_id AND p.user_id = :perfil
        WHERE a.artist_name COLLATE Latin1_General_100_CI_AI LIKE :contiene ESCAPE '|'
        GROUP BY a.artist_id, a.artist_name
        ORDER BY CASE WHEN a.artist_name COLLATE Latin1_General_100_CI_AI LIKE :empieza ESCAPE '|' THEN 0 ELSE 1 END,
                 COUNT(*) DESC,
                 a.artist_name
        """, nativeQuery = true)
    List<ArtistSearchResult> buscarArtistas(@Param("perfil") int perfil,
                                            @Param("contiene") String contiene,
                                            @Param("empieza") String empieza,
                                            @Param("limite") int limite);

    /** Cabecera con la versión más escuchada. Sin filas significa que el id no existe. */
    @Query(value = """
        WITH grupo AS (
            SELECT v.track_id, v.track_name, v.album_name, v.spotify_uri, v.artist_id
            FROM tracks t
            JOIN tracks v ON v.track_name = t.track_name AND v.artist_id = t.artist_id
            WHERE t.track_id = :id AND (:soloVersion = 0 OR v.track_id = :id)
        )
        SELECT TOP 1 g.track_id AS trackId,
               g.track_name AS trackName,
               a.artist_name AS artistName,
               g.album_name AS albumName,
               g.spotify_uri AS spotifyUri
        FROM grupo g
        JOIN artists a ON a.artist_id = g.artist_id
        JOIN plays p ON p.track_id = g.track_id AND p.user_id = :perfil
        GROUP BY g.track_id, g.track_name, g.album_name, g.spotify_uri, a.artist_name
        ORDER BY COUNT(p.play_id) DESC, g.track_id
        """, nativeQuery = true)
    SongHeader cabecera(@Param("perfil") int perfil, @Param("id") int id, @Param("soloVersion") int soloVersion);

    @Query(value = """
        WITH grupo AS (
            SELECT v.track_id
            FROM tracks t
            JOIN tracks v ON v.track_name = t.track_name AND v.artist_id = t.artist_id
            WHERE t.track_id = :id AND (:soloVersion = 0 OR v.track_id = :id)
        )
        SELECT COUNT(p.play_id) AS reproducciones,
               COALESCE(SUM(CAST(p.ms_played AS BIGINT)), 0) AS msTotal,
               MIN(p.played_at) AS primera,
               MAX(p.played_at) AS ultima
        FROM grupo g
        LEFT JOIN plays p ON p.track_id = g.track_id AND p.user_id = :perfil
        """, nativeQuery = true)
    SongTotals totales(@Param("perfil") int perfil, @Param("id") int id, @Param("soloVersion") int soloVersion);

    @Query(value = """
        WITH grupo AS (
            SELECT v.track_id
            FROM tracks t
            JOIN tracks v ON v.track_name = t.track_name AND v.artist_id = t.artist_id
            WHERE t.track_id = :id AND (:soloVersion = 0 OR v.track_id = :id)
        )
        SELECT TOP 1 YEAR(p.played_at) AS anio, COUNT(*) AS reproducciones
        FROM grupo g
        JOIN plays p ON p.track_id = g.track_id AND p.user_id = :perfil
        GROUP BY YEAR(p.played_at)
        ORDER BY reproducciones DESC, anio DESC
        """, nativeQuery = true)
    SongYear mejorAnio(@Param("perfil") int perfil, @Param("id") int id, @Param("soloVersion") int soloVersion);

    @Query(value = """
        SELECT v.track_id AS trackId,
               v.album_name AS albumName,
               v.spotify_uri AS spotifyUri,
               COUNT(p.play_id) AS reproducciones,
               COALESCE(SUM(CAST(p.ms_played AS BIGINT)), 0) / 1000.0 / 60 AS minutos
        FROM tracks t
        JOIN tracks v ON v.track_name = t.track_name AND v.artist_id = t.artist_id
        JOIN plays p ON p.track_id = v.track_id AND p.user_id = :perfil
        WHERE t.track_id = :id
        GROUP BY v.track_id, v.album_name, v.spotify_uri
        ORDER BY reproducciones DESC, v.track_id
        """, nativeQuery = true)
    List<SongVersion> versiones(@Param("perfil") int perfil, @Param("id") int id);

    @Query(value = """
        WITH grupo AS (
            SELECT v.track_id
            FROM tracks t
            JOIN tracks v ON v.track_name = t.track_name AND v.artist_id = t.artist_id
            WHERE t.track_id = :id AND (:soloVersion = 0 OR v.track_id = :id)
        )
        SELECT CONVERT(CHAR(7), p.played_at, 126) AS periodo,
               COUNT(*) AS reproducciones,
               SUM(CAST(p.ms_played AS BIGINT)) / 1000.0 / 60 AS minutos,
               CAST(NULL AS NVARCHAR(255)) AS artistaLider
        FROM grupo g
        JOIN plays p ON p.track_id = g.track_id AND p.user_id = :perfil
        GROUP BY CONVERT(CHAR(7), p.played_at, 126)
        ORDER BY periodo
        """, nativeQuery = true)
    List<PuntoFila> porMes(@Param("perfil") int perfil, @Param("id") int id, @Param("soloVersion") int soloVersion);

    @Query(value = "SELECT COALESCE(SUM(CAST(ms_played AS BIGINT)), 0) FROM plays WHERE user_id = :perfil", nativeQuery = true)
    long msTotalHistorial(@Param("perfil") int perfil);
}
