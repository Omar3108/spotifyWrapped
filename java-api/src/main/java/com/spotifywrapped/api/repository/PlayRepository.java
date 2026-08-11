package com.spotifywrapped.api.repository;

import com.spotifywrapped.api.dto.*;
import com.spotifywrapped.api.model.Play;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import org.springframework.data.repository.query.Param;

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
        """, nativeQuery = true)
    WrappedSummary obtenerResumenGeneral();

    @Query(value = """
    SELECT
        RANK() OVER (ORDER BY SUM(CAST(p.ms_played AS BIGINT)) DESC) AS ranking,
        a.artist_name AS artistName,
        COUNT(*) AS reproducciones,
        SUM(CAST(p.ms_played AS BIGINT)) / 1000.0 / 60 AS minutosTotales
    FROM plays p
    JOIN tracks t   ON p.track_id = t.track_id
    JOIN artists a  ON t.artist_id = a.artist_id
    GROUP BY a.artist_name
    ORDER BY minutosTotales DESC
    OFFSET 0 ROWS FETCH NEXT :limite ROWS ONLY
    """, nativeQuery = true)
    List<ArtistRanking> obtenerTopArtistas(@Param("limite") int limite);

    @Query(value = """
    WITH ranking_por_anio AS (
        SELECT
            YEAR(p.played_at) AS anio,
            a.artist_name AS artistName,
            SUM(CAST(p.ms_played AS BIGINT)) / 1000.0 / 60 AS minutos,
            RANK() OVER (
                PARTITION BY YEAR(p.played_at)
                ORDER BY SUM(CAST(p.ms_played AS BIGINT)) DESC
            ) AS ranking
        FROM plays p
        JOIN tracks t   ON p.track_id = t.track_id
        JOIN artists a  ON t.artist_id = a.artist_id
        GROUP BY YEAR(p.played_at), a.artist_name
    )
    SELECT anio, artistName, ROUND(minutos, 1) AS minutos
    FROM ranking_por_anio
    WHERE ranking = 1
    ORDER BY anio
    """, nativeQuery = true)
List<YearlyTopArtist> obtenerTopArtistaPorAnio();

@Query(value = """
    WITH dias_con_actividad AS (
        SELECT DISTINCT CAST(played_at AS DATE) AS dia
        FROM plays
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
List<ListeningStreak> obtenerRachasMasLargas(@Param("limite") int limite);

@Query(value = """
    SELECT
        DATEPART(HOUR, played_at) AS horaDelDia,
        COUNT(*) AS reproducciones,
        SUM(CAST(ms_played AS BIGINT)) / 1000.0 / 60 AS minutos
    FROM plays
    GROUP BY DATEPART(HOUR, played_at)
    ORDER BY horaDelDia
    """, nativeQuery = true)
List<HourlyPattern> obtenerPatronPorHora();

@Query(value = """
    SELECT
        DATENAME(WEEKDAY, played_at) AS diaSemana,
        COUNT(*) AS reproducciones,
        SUM(CAST(ms_played AS BIGINT)) / 1000.0 / 60 AS minutos
    FROM plays
    GROUP BY DATENAME(WEEKDAY, played_at), DATEPART(WEEKDAY, played_at)
    ORDER BY DATEPART(WEEKDAY, played_at)
    """, nativeQuery = true)
List<WeekdayPattern> obtenerPatronPorDiaSemana();

@Query(value = """
    SELECT
        CAST(SUM(CASE WHEN skipped = 1 THEN 1 ELSE 0 END) AS FLOAT)
            / COUNT(*) * 100 AS porcentajeSkip,
        SUM(CASE WHEN skipped = 1 THEN 1 ELSE 0 END) AS totalSkips,
        COUNT(*) AS totalReproducciones
    FROM plays
    """, nativeQuery = true)
SkipRate obtenerTasaSkip();
}