package com.spotifywrapped.api.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.spotifywrapped.api.dto.ArtistRanking;
import com.spotifywrapped.api.dto.HourlyPattern;
import com.spotifywrapped.api.dto.ListeningStreak;
import com.spotifywrapped.api.dto.SkipRate;
import com.spotifywrapped.api.dto.TopAlbum;
import com.spotifywrapped.api.dto.TopTrack;
import com.spotifywrapped.api.dto.WeekdayPattern;
import com.spotifywrapped.api.dto.WrappedSummary;
import com.spotifywrapped.api.dto.YearlyTopArtist;
import com.spotifywrapped.api.model.Play;

@Repository
public interface PlayRepository extends JpaRepository<Play, Long> {

    @Query(value = """
        SELECT
            COUNT(*) AS totalReproducciones,
            SUM(CAST(ms_played AS BIGINT)) / 1000.0 / 60 AS totalMinutos,
            SUM(CAST(ms_played AS BIGINT)) / 1000.0 / 60 / 60 / 24 AS totalDias,
            COUNT(DISTINCT track_id) AS cancionesDistintas,
            MIN(played_at) AS primeraReproduccion,
            MAX(played_at) AS ultimaReproduccion
        FROM plays
        WHERE user_id = :perfil
        """, nativeQuery = true)
    WrappedSummary obtenerResumenGeneral(@Param("perfil") int perfil);

    @Query(value = """
    SELECT
        RANK() OVER (ORDER BY SUM(CAST(p.ms_played AS BIGINT)) DESC) AS ranking,
        a.artist_name AS artistName,
        COUNT(*) AS reproducciones,
        SUM(CAST(p.ms_played AS BIGINT)) / 1000.0 / 60 AS minutosTotales
    FROM plays p
    JOIN tracks t   ON p.track_id = t.track_id
    JOIN artists a  ON t.artist_id = a.artist_id
    WHERE p.user_id = :perfil
    GROUP BY a.artist_name
    ORDER BY reproducciones DESC, minutosTotales DESC, artistName
    OFFSET 0 ROWS FETCH NEXT :limite ROWS ONLY
    """, nativeQuery = true)
    List<ArtistRanking> obtenerTopArtistas(@Param("perfil") int perfil, @Param("limite") int limite);

    @Query(value = """
    WITH ranking_por_anio AS (
        SELECT
            YEAR(p.played_at) AS anio,
            a.artist_name AS artistName,
            COUNT(*) AS reproducciones,
            SUM(CAST(p.ms_played AS BIGINT)) / 1000.0 / 60 AS minutos,
            RANK() OVER (
                PARTITION BY YEAR(p.played_at)
                ORDER BY COUNT(*) DESC
            ) AS ranking
        FROM plays p
        JOIN tracks t   ON p.track_id = t.track_id
        JOIN artists a  ON t.artist_id = a.artist_id
        WHERE p.user_id = :perfil
        GROUP BY YEAR(p.played_at), a.artist_name
    )
    SELECT anio, artistName, reproducciones, ROUND(minutos, 1) AS minutos
    FROM ranking_por_anio
    WHERE ranking = 1
    ORDER BY anio
    """, nativeQuery = true)
List<YearlyTopArtist> obtenerTopArtistaPorAnio(@Param("perfil") int perfil);

@Query(value = """
    WITH dias_con_actividad AS (
        SELECT DISTINCT CAST(played_at AS DATE) AS dia
        FROM plays
    WHERE user_id = :perfil
    ),
    dias_numerados AS (
        SELECT dia, ROW_NUMBER() OVER (ORDER BY dia) AS numero_fila
        FROM dias_con_actividad
    ),
    dias_con_grupo AS (
        SELECT dia, DATEADD(DAY, -numero_fila, dia) AS grupo_racha
        FROM dias_numerados
    )
    SELECT
        MIN(dia) AS inicioRacha,
        MAX(dia) AS finRacha,
        COUNT(*) AS diasConsecutivos
    FROM dias_con_grupo
    GROUP BY grupo_racha
    ORDER BY diasConsecutivos DESC
    OFFSET 0 ROWS FETCH NEXT :limite ROWS ONLY
    """, nativeQuery = true)
List<ListeningStreak> obtenerRachasMasLargas(@Param("perfil") int perfil, @Param("limite") int limite);

@Query(value = """
    SELECT
        DATEPART(HOUR, played_at) AS horaDelDia,
        COUNT(*) AS reproducciones,
        SUM(CAST(ms_played AS BIGINT)) / 1000.0 / 60 AS minutos
    FROM plays
    WHERE user_id = :perfil
    GROUP BY DATEPART(HOUR, played_at)
    ORDER BY horaDelDia
    """, nativeQuery = true)
List<HourlyPattern> obtenerPatronPorHora(@Param("perfil") int perfil);

@Query(value = """
    SELECT
        DATENAME(WEEKDAY, played_at) AS diaSemana,
        COUNT(*) AS reproducciones,
        SUM(CAST(ms_played AS BIGINT)) / 1000.0 / 60 AS minutos
    FROM plays
    WHERE user_id = :perfil
    GROUP BY DATENAME(WEEKDAY, played_at), DATEPART(WEEKDAY, played_at)
    ORDER BY DATEPART(WEEKDAY, played_at)
    """, nativeQuery = true)
List<WeekdayPattern> obtenerPatronPorDiaSemana(@Param("perfil") int perfil);

@Query(value = """
    SELECT
        CAST(SUM(CASE WHEN skipped = 1 THEN 1 ELSE 0 END) AS FLOAT)
            / COUNT(*) * 100 AS porcentajeSkip,
        SUM(CASE WHEN skipped = 1 THEN 1 ELSE 0 END) AS totalSkips,
        COUNT(*) AS totalReproducciones
    FROM plays
    WHERE user_id = :perfil
    """, nativeQuery = true)
SkipRate obtenerTasaSkip(@Param("perfil") int perfil);

@Query(value = """
    SELECT
        t.track_name AS trackName,
        a.artist_name AS artistName,
        COUNT(*) AS reproducciones,
        SUM(CAST(p.ms_played AS BIGINT)) / 1000.0 / 60 AS minutos
    FROM plays p
    JOIN tracks t   ON p.track_id = t.track_id
    JOIN artists a  ON t.artist_id = a.artist_id
    WHERE p.user_id = :perfil AND YEAR(p.played_at) = :anio
    GROUP BY t.track_name, a.artist_name
    ORDER BY reproducciones DESC, minutos DESC, trackName, artistName
    OFFSET 0 ROWS FETCH NEXT :limite ROWS ONLY
    """, nativeQuery = true)
List<TopTrack> obtenerTopCancionesPorAnio(@Param("perfil") int perfil, @Param("anio") int anio, @Param("limite") int limite);

@Query(value = """
    SELECT
        t.album_name AS albumName,
        a.artist_name AS artistName,
        COUNT(*) AS reproducciones,
        SUM(CAST(p.ms_played AS BIGINT)) / 1000.0 / 60 AS minutos
    FROM plays p
    JOIN tracks t   ON p.track_id = t.track_id
    JOIN artists a  ON t.artist_id = a.artist_id
    WHERE p.user_id = :perfil AND YEAR(p.played_at) = :anio
        AND t.album_name IS NOT NULL
    GROUP BY t.album_name, a.artist_name
    ORDER BY reproducciones DESC, minutos DESC, albumName, artistName
    OFFSET 0 ROWS FETCH NEXT :limite ROWS ONLY
    """, nativeQuery = true)
List<TopAlbum> obtenerTopAlbumesPorAnio(@Param("perfil") int perfil, @Param("anio") int anio, @Param("limite") int limite);

@Query(value = """
    SELECT
        RANK() OVER (ORDER BY SUM(CAST(p.ms_played AS BIGINT)) DESC) AS ranking,
        a.artist_name AS artistName,
        COUNT(*) AS reproducciones,
        SUM(CAST(p.ms_played AS BIGINT)) / 1000.0 / 60 AS minutosTotales
    FROM plays p
    JOIN tracks t   ON p.track_id = t.track_id
    JOIN artists a  ON t.artist_id = a.artist_id
    WHERE p.user_id = :perfil AND YEAR(p.played_at) = :anio
    GROUP BY a.artist_name
    ORDER BY reproducciones DESC, minutosTotales DESC, artistName
    OFFSET 0 ROWS FETCH NEXT :limite ROWS ONLY
    """, nativeQuery = true)
List<ArtistRanking> obtenerTopArtistasPorAnio(@Param("perfil") int perfil, @Param("anio") int anio, @Param("limite") int limite);
@Query(value = """
    SELECT
        t.track_name AS trackName,
        a.artist_name AS artistName,
        COUNT(*) AS reproducciones,
        SUM(CAST(p.ms_played AS BIGINT)) / 1000.0 / 60 AS minutos
    FROM plays p
    JOIN tracks t   ON p.track_id = t.track_id
    JOIN artists a  ON t.artist_id = a.artist_id
    WHERE p.user_id = :perfil
    GROUP BY t.track_name, a.artist_name
    ORDER BY reproducciones DESC, minutos DESC, trackName, artistName
    OFFSET 0 ROWS FETCH NEXT :limite ROWS ONLY
    """, nativeQuery = true)
List<TopTrack> obtenerTopCancionesGeneral(@Param("perfil") int perfil, @Param("limite") int limite);

@Query(value = """
    SELECT
        t.album_name AS albumName,
        a.artist_name AS artistName,
        COUNT(*) AS reproducciones,
        SUM(CAST(p.ms_played AS BIGINT)) / 1000.0 / 60 AS minutos
    FROM plays p
    JOIN tracks t   ON p.track_id = t.track_id
    JOIN artists a  ON t.artist_id = a.artist_id
    WHERE p.user_id = :perfil AND t.album_name IS NOT NULL
    GROUP BY t.album_name, a.artist_name
    ORDER BY reproducciones DESC, minutos DESC, albumName, artistName
    OFFSET 0 ROWS FETCH NEXT :limite ROWS ONLY
    """, nativeQuery = true)
List<TopAlbum> obtenerTopAlbumesGeneral(@Param("perfil") int perfil, @Param("limite") int limite);
}