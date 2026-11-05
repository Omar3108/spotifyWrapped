SELECT
    t.track_name,
    a.artist_name,
    COUNT(*) AS reproducciones,
    SUM(CAST(p.ms_played AS BIGINT)) / 1000.0 / 60 AS minutos
FROM plays p
JOIN tracks t   ON p.track_id = t.track_id
JOIN artists a  ON t.artist_id = a.artist_id
WHERE YEAR(p.played_at) = 2023
GROUP BY t.track_name, a.artist_name
ORDER BY minutos DESC
OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY;