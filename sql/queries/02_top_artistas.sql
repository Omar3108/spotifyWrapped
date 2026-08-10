SELECT
    RANK() OVER (ORDER BY SUM(CAST(p.ms_played AS BIGINT)) DESC) AS ranking,
    a.artist_name,
    COUNT(*)                                     AS reproducciones,
    SUM(CAST(p.ms_played AS BIGINT)) / 1000.0 / 60 AS minutos_totales
FROM plays p
JOIN tracks t   ON p.track_id = t.track_id
JOIN artists a  ON t.artist_id = a.artist_id
GROUP BY a.artist_name
ORDER BY minutos_totales DESC
OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY;
