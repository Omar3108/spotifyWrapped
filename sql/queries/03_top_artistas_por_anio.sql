WITH ranking_por_anio AS (
    SELECT
        YEAR(p.played_at)                                                          AS anio,
        a.artist_name,
        SUM(CAST(p.ms_played AS BIGINT)) / 1000.0 / 60                             AS minutos,
        RANK() OVER (
            PARTITION BY YEAR(p.played_at)
            ORDER BY SUM(CAST(p.ms_played AS BIGINT)) DESC
        )                                                                          AS ranking
    FROM plays p
    JOIN tracks t   ON p.track_id = t.track_id
    JOIN artists a  ON t.artist_id = a.artist_id
    GROUP BY YEAR(p.played_at), a.artist_name
)
SELECT anio, artist_name, ROUND(minutos, 1) AS minutos
FROM ranking_por_anio
WHERE ranking = 1
ORDER BY anio;