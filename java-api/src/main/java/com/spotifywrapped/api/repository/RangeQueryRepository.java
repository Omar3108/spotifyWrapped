package com.spotifywrapped.api.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import com.spotifywrapped.api.dto.PeakDay;
import com.spotifywrapped.api.dto.PuntoFila;
import com.spotifywrapped.api.dto.RangeRanked;
import com.spotifywrapped.api.dto.RangeTotals;
import com.spotifywrapped.api.model.Play;

/**
 * Agregaciones de Mi época. Todas filtran con played_at >= :desde AND played_at < :hasta
 * para aprovechar IX_plays_played_at. Los rankings usan el mismo orden que /top-*.
 */
public interface RangeQueryRepository extends Repository<Play, Long> {

    @Query(value = """
        SELECT COUNT(*) AS reproducciones,
               COALESCE(SUM(CAST(p.ms_played AS BIGINT)), 0) / 1000.0 / 60 AS minutos,
               COUNT(DISTINCT p.track_id) AS cancionesDistintas,
               COUNT(DISTINCT t.artist_id) AS artistasDistintos
        FROM plays p
        JOIN tracks t ON t.track_id = p.track_id
        WHERE p.user_id = :perfil AND p.played_at >= :desde AND p.played_at < :hasta
        """, nativeQuery = true)
    RangeTotals totales(@Param("perfil") int perfil, @Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta);

    @Query(value = """
        WITH base AS (
            SELECT a.artist_id, a.artist_name, t.spotify_uri, COUNT(*) AS n, SUM(CAST(p.ms_played AS BIGINT)) AS ms
            FROM plays p
            JOIN tracks t ON t.track_id = p.track_id
            JOIN artists a ON a.artist_id = t.artist_id
            WHERE p.user_id = :perfil AND p.played_at >= :desde AND p.played_at < :hasta
            GROUP BY a.artist_id, a.artist_name, t.spotify_uri
        ),
        ordenado AS (
            SELECT *,
                   SUM(n) OVER (PARTITION BY artist_name) AS total,
                   SUM(ms) OVER (PARTITION BY artist_name) AS total_ms,
                   ROW_NUMBER() OVER (PARTITION BY artist_name ORDER BY n DESC, spotify_uri) AS fila
            FROM base
        )
        SELECT CAST(NULL AS INT) AS trackId,
               artist_id AS artistId,
               artist_name AS nombre,
               artist_name AS artistName,
               total AS reproducciones,
               total_ms / 1000.0 / 60 AS minutos,
               spotify_uri AS coverUri
        FROM ordenado
        WHERE fila = 1
        ORDER BY total DESC, total_ms DESC, artist_name
        OFFSET 0 ROWS FETCH NEXT :limite ROWS ONLY
        """, nativeQuery = true)
    List<RangeRanked> topArtistas(@Param("perfil") int perfil, @Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta,
                                  @Param("limite") int limite);

    @Query(value = """
        WITH base AS (
            SELECT t.track_id, t.track_name, a.artist_name, t.spotify_uri,
                   COUNT(*) AS n, SUM(CAST(p.ms_played AS BIGINT)) AS ms
            FROM plays p
            JOIN tracks t ON t.track_id = p.track_id
            JOIN artists a ON a.artist_id = t.artist_id
            WHERE p.user_id = :perfil AND p.played_at >= :desde AND p.played_at < :hasta
            GROUP BY t.track_id, t.track_name, a.artist_name, t.spotify_uri
        ),
        ordenado AS (
            SELECT *,
                   SUM(n) OVER (PARTITION BY track_name, artist_name) AS total,
                   SUM(ms) OVER (PARTITION BY track_name, artist_name) AS total_ms,
                   MIN(track_id) OVER (PARTITION BY track_name, artist_name) AS track_id_cancion,
                   ROW_NUMBER() OVER (PARTITION BY track_name, artist_name ORDER BY n DESC, track_id) AS fila
            FROM base
        )
        SELECT track_id_cancion AS trackId,
               CAST(NULL AS INT) AS artistId,
               track_name AS nombre,
               artist_name AS artistName,
               total AS reproducciones,
               total_ms / 1000.0 / 60 AS minutos,
               spotify_uri AS coverUri
        FROM ordenado
        WHERE fila = 1
        ORDER BY total DESC, total_ms DESC, track_name, artist_name
        OFFSET 0 ROWS FETCH NEXT :limite ROWS ONLY
        """, nativeQuery = true)
    List<RangeRanked> topCanciones(@Param("perfil") int perfil, @Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta,
                                   @Param("limite") int limite);

    @Query(value = """
        WITH base AS (
            SELECT t.album_name, a.artist_name, t.spotify_uri, COUNT(*) AS n, SUM(CAST(p.ms_played AS BIGINT)) AS ms
            FROM plays p
            JOIN tracks t ON t.track_id = p.track_id
            JOIN artists a ON a.artist_id = t.artist_id
            WHERE p.user_id = :perfil AND p.played_at >= :desde AND p.played_at < :hasta
              AND t.album_name IS NOT NULL
            GROUP BY t.album_name, a.artist_name, t.spotify_uri
        ),
        ordenado AS (
            SELECT *,
                   SUM(n) OVER (PARTITION BY album_name, artist_name) AS total,
                   SUM(ms) OVER (PARTITION BY album_name, artist_name) AS total_ms,
                   ROW_NUMBER() OVER (PARTITION BY album_name, artist_name ORDER BY n DESC, spotify_uri) AS fila
            FROM base
        )
        SELECT CAST(NULL AS INT) AS trackId,
               CAST(NULL AS INT) AS artistId,
               album_name AS nombre,
               artist_name AS artistName,
               total AS reproducciones,
               total_ms / 1000.0 / 60 AS minutos,
               spotify_uri AS coverUri
        FROM ordenado
        WHERE fila = 1
        ORDER BY total DESC, total_ms DESC, album_name, artist_name
        OFFSET 0 ROWS FETCH NEXT :limite ROWS ONLY
        """, nativeQuery = true)
    List<RangeRanked> topAlbumes(@Param("perfil") int perfil, @Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta,
                                 @Param("limite") int limite);

    @Query(value = """
        SELECT TOP 1 CAST(played_at AS DATE) AS dia,
               COUNT(*) AS reproducciones,
               SUM(CAST(ms_played AS BIGINT)) / 1000.0 / 60 AS minutos
        FROM plays
        WHERE user_id = :perfil AND played_at >= :desde AND played_at < :hasta
        GROUP BY CAST(played_at AS DATE)
        ORDER BY minutos DESC, dia
        """, nativeQuery = true)
    PeakDay diaPico(@Param("perfil") int perfil, @Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta);

    @Query(value = """
        WITH base AS (
            SELECT CONVERT(CHAR(7), p.played_at, 126) AS periodo, a.artist_name,
                   COUNT(*) AS n, SUM(CAST(p.ms_played AS BIGINT)) AS ms
            FROM plays p
            JOIN tracks t ON t.track_id = p.track_id
            JOIN artists a ON a.artist_id = t.artist_id
            WHERE p.user_id = :perfil AND p.played_at >= :desde AND p.played_at < :hasta
            GROUP BY CONVERT(CHAR(7), p.played_at, 126), a.artist_name
        ),
        ordenado AS (
            SELECT *,
                   SUM(n) OVER (PARTITION BY periodo) AS total,
                   SUM(ms) OVER (PARTITION BY periodo) AS total_ms,
                   ROW_NUMBER() OVER (PARTITION BY periodo ORDER BY n DESC, ms DESC, artist_name) AS fila
            FROM base
        )
        SELECT periodo,
               total AS reproducciones,
               total_ms / 1000.0 / 60 AS minutos,
               artist_name AS artistaLider
        FROM ordenado
        WHERE fila = 1
        ORDER BY periodo
        """, nativeQuery = true)
    List<PuntoFila> porMes(@Param("perfil") int perfil, @Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta);

    @Query(value = """
        SELECT RIGHT('0' + CAST(DATEPART(HOUR, played_at) AS VARCHAR(2)), 2) AS periodo,
               COUNT(*) AS reproducciones,
               SUM(CAST(ms_played AS BIGINT)) / 1000.0 / 60 AS minutos,
               CAST(NULL AS NVARCHAR(255)) AS artistaLider
        FROM plays
        WHERE user_id = :perfil AND played_at >= :desde AND played_at < :hasta
        GROUP BY DATEPART(HOUR, played_at)
        ORDER BY periodo
        """, nativeQuery = true)
    List<PuntoFila> porHora(@Param("perfil") int perfil, @Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta);

    @Query(value = """
        SELECT CONVERT(CHAR(10), played_at, 126) AS periodo,
               COUNT(*) AS reproducciones,
               SUM(CAST(ms_played AS BIGINT)) / 1000.0 / 60 AS minutos,
               CAST(NULL AS NVARCHAR(255)) AS artistaLider
        FROM plays
        WHERE user_id = :perfil AND played_at >= :desde AND played_at < :hasta
        GROUP BY CONVERT(CHAR(10), played_at, 126)
        ORDER BY periodo
        """, nativeQuery = true)
    List<PuntoFila> porDia(@Param("perfil") int perfil, @Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta);
}
